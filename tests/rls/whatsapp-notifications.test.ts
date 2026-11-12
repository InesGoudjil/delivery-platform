import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, wasBlocked, type TestDatabase } from "./supabase-test-db";

/** 20261112100000_whatsapp_notifications.sql: the studio number, consent and comment batches. */

const U = {
  owner: "00000000-0000-4000-8000-0000000000a1",
  admin: "00000000-0000-4000-8000-0000000000a3",
  viewer: "00000000-0000-4000-8000-0000000000a2",
};
const W = "10000000-0000-4000-8000-00000000000a";
const D = "30000000-0000-4000-8000-00000000000a";
const C = "70000000-0000-4000-8000-00000000000c";

const SEED = `
  set session_replication_role = replica;
  insert into auth.users (id, email) values ('${U.owner}', 'o@t'), ('${U.admin}', 'a@t'), ('${U.viewer}', 'v@t');
  insert into public.user_profiles (id, platform_role) values ('${U.owner}', 'user'), ('${U.admin}', 'user'), ('${U.viewer}', 'user');
  insert into public.workspaces (id, owner_id, brand_name, slug) values ('${W}', '${U.owner}', 'Studio A', 'studio-a');
  insert into public.workspace_members (workspace_id, user_id, role) values
    ('${W}', '${U.owner}', 'owner'), ('${W}', '${U.admin}', 'admin'), ('${W}', '${U.viewer}', 'viewer');
  insert into public.workspace_settings (workspace_id, whatsapp_number) values ('${W}', '971500000000');
  insert into public.clients (id, workspace_id, name, phone_number) values ('${C}', '${W}', 'Client', '971511111111');
  insert into public.deliveries (id, workspace_id, title, share_token) values ('${D}', '${W}', 'Wedding film', 'share-token-a');
  set session_replication_role = origin;
`;

let db: TestDatabase;
const as = (userId: string, sql: string) => db.as("authenticated", userId, sql);

beforeAll(async () => {
  db = await createTestDatabase();
  await db.owner(SEED);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

describe("the studio's WhatsApp number", () => {
  it("starts unverified, so nothing is sent to numbers saved before verification existed", async () => {
    const [row] = await db.owner(`select whatsapp_verified_at from public.workspace_settings where workspace_id = '${W}'`);
    expect(row.whatsapp_verified_at).toBeNull();
  });

  it("can't be set or marked verified through the API, even by the owner", async () => {
    for (const change of [
      "whatsapp_number = '971522222222'",
      "whatsapp_verified_at = now()",
      "whatsapp_code_hash = 'x'",
      "whatsapp_pending_number = '971522222222'",
      "whatsapp_code_attempts = 5",
    ]) {
      expect(wasBlocked(await as(U.owner, `update public.workspace_settings set ${change} where workspace_id = '${W}'`)), change).toBe(true);
    }
  });

  it("lets admins choose which alerts go to WhatsApp, and viewers nothing", async () => {
    const toggle = `update public.workspace_settings set whatsapp_notify_comments = false where workspace_id = '${W}'`;
    expect(await as(U.admin, toggle)).toMatchObject({ affected: 1 });
    expect(wasBlocked(await as(U.viewer, toggle))).toBe(true);
  });

  it("is set by the server after a verified code", async () => {
    const result = await db.as("service_role", null,
      `update public.workspace_settings set whatsapp_number = '971533333333', whatsapp_verified_at = now() where workspace_id = '${W}'`);
    expect(result).toMatchObject({ affected: 1 });
  });
});

describe("client consent", () => {
  it("is recorded on the client by the studio", async () => {
    const result = await as(U.admin, `update public.clients set whatsapp_consent_at = now(), whatsapp_consent_by = '${U.admin}' where id = '${C}'`);
    expect(result).toMatchObject({ affected: 1 });
  });
});

describe("grouped comment alerts", () => {
  it("are invisible to signed-in users and anonymous visitors", async () => {
    expect((await as(U.owner, "select * from public.whatsapp_comment_batches")).error).toMatch(/permission denied/);
    expect((await db.as("anon", null, "select * from public.whatsapp_comment_batches")).error).toMatch(/permission denied/);
    expect((await as(U.owner, `select * from public.record_whatsapp_comment('${D}', '${W}', 'x', 'y', 900)`)).error).toMatch(
      /permission denied/
    );
  });

  it("alert on the first comment, count the rest, and send the total once the gap has passed", async () => {
    const record = (excerpt: string) => `select * from public.record_whatsapp_comment('${D}', '${W}', 'Sara', '${excerpt}', 900)`;
    const steps = await db.asSteps("service_role", null, [
      record("first"),
      record("second"),
      record("third"),
      `update public.whatsapp_comment_batches set last_sent_at = now() - interval '16 minutes' where delivery_id = '${D}'`,
      record("fourth"),
    ]);
    expect(steps.map((s) => s.error)).toEqual(Array(5).fill(undefined));
    expect(steps[0].rows[0]).toMatchObject({ send_now: true, comment_count: 1, excerpt: "first" });
    expect(steps[1].rows[0]).toMatchObject({ send_now: false, comment_count: 1 });
    expect(steps[2].rows[0]).toMatchObject({ send_now: false, comment_count: 2 });
    expect(steps[4].rows[0]).toMatchObject({ send_now: true, comment_count: 3, excerpt: "fourth" });
  });

  it("are claimed once when the session has gone quiet", async () => {
    const steps = await db.asSteps("service_role", null, [
      `insert into public.whatsapp_comment_batches (delivery_id, workspace_id, pending_count, latest_author, latest_excerpt, last_comment_at, last_sent_at)
       values ('${D}', '${W}', 2, 'Sara', 'more notes', now() - interval '11 minutes', now() - interval '16 minutes')`,
      "select * from public.claim_due_whatsapp_comment_batches(600, 900, 100)",
      "select * from public.claim_due_whatsapp_comment_batches(600, 900, 100)",
    ]);
    expect(steps[0].error).toBeUndefined();
    expect(steps[1].rows).toEqual([
      { delivery_id: D, workspace_id: W, comment_count: 2, author: "Sara", excerpt: "more notes" },
    ]);
    expect(steps[2].rows).toEqual([]);
  });

  it("wait while the client is still commenting", async () => {
    const steps = await db.asSteps("service_role", null, [
      `insert into public.whatsapp_comment_batches (delivery_id, workspace_id, pending_count, latest_author, latest_excerpt, last_comment_at, last_sent_at)
       values ('${D}', '${W}', 2, 'Sara', 'still going', now() - interval '2 minutes', now() - interval '16 minutes')`,
      "select * from public.claim_due_whatsapp_comment_batches(600, 900, 100)",
    ]);
    expect(steps[1].rows).toEqual([]);
  });
});

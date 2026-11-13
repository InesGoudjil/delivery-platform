import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, type TestDatabase } from "./supabase-test-db";

/**
 * 20261113100000_comment_email_batches.sql: client comments batched into one studio email per window.
 * Each scenario runs in one asSteps call: the harness rolls each call back, so a batch made in one
 * call doesn't exist in the next.
 */

const U = { owner: "00000000-0000-4000-8000-0000000000a1" };
const W = "10000000-0000-4000-8000-00000000000a";
const D = "30000000-0000-4000-8000-00000000000a";

const SEED = `
  set session_replication_role = replica;
  insert into auth.users (id, email) values ('${U.owner}', 'o@t');
  insert into public.user_profiles (id, platform_role) values ('${U.owner}', 'user');
  insert into public.workspaces (id, owner_id, brand_name, slug) values ('${W}', '${U.owner}', 'Studio A', 'studio-a');
  insert into public.workspace_members (workspace_id, user_id, role) values ('${W}', '${U.owner}', 'owner');
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

const record = (excerpt: string, version = 2) =>
  `select * from public.record_comment_email('${D}', '${W}', 'Sara', '${excerpt}', ${version}, 600)`;
const claim = "select * from public.claim_due_comment_email_batches(100)";
const closeWindow = `update public.comment_email_batches set send_at = now() - interval '1 minute' where delivery_id = '${D}'`;

describe("comment email batches are server-only", () => {
  it("are invisible to signed-in users and anonymous visitors, and their functions are closed to them", async () => {
    expect((await as(U.owner, "select * from public.comment_email_batches")).error).toMatch(/permission denied/);
    expect((await db.as("anon", null, "select * from public.comment_email_batches")).error).toMatch(/permission denied/);
    expect((await as(U.owner, record("x"))).error).toMatch(/permission denied/);
    expect((await as(U.owner, claim)).error).toMatch(/permission denied/);
  });
});

describe("the batch window", () => {
  it("opens with the first client comment and counts the rest into the same window", async () => {
    const steps = await db.asSteps("service_role", null, [record("first"), record("second"), record("third")]);
    expect(steps.map((s) => s.error)).toEqual([undefined, undefined, undefined]);
    expect(steps[0].rows[0]).toMatchObject({ opened: true, comment_count: 1 });
    expect(steps[1].rows[0]).toMatchObject({ opened: false, comment_count: 2 });
    expect(steps[2].rows[0]).toMatchObject({ opened: false, comment_count: 3 });
  });

  it("keeps the send time fixed: later comments don't push it back", async () => {
    const steps = await db.asSteps("service_role", null, [record("a"), record("b")]);
    expect(steps[1].rows[0].send_at).toEqual(steps[0].rows[0].send_at);
  });

  it("holds the batch until its window has closed", async () => {
    const steps = await db.asSteps("service_role", null, [record("first"), claim]);
    expect(steps[1].error).toBeUndefined();
    expect(steps[1].rows).toEqual([]);
  });

  it("hands a closed batch over once, with its count and the latest comment, and then it's gone", async () => {
    const steps = await db.asSteps("service_role", null, [
      record("first"),
      record("second"),
      record("third"),
      closeWindow,
      claim,
      claim,
    ]);
    expect(steps[4].rows).toEqual([
      {
        delivery_id: D,
        workspace_id: W,
        comment_count: 3,
        author: "Sara",
        excerpt: "third",
        version_number: 2,
      },
    ]);
    expect(steps[5].rows).toEqual([]);
  });

  it("opens a new window for the next comment after a batch was handed over", async () => {
    const steps = await db.asSteps("service_role", null, [record("first"), closeWindow, claim, record("after the email", 3)]);
    expect(steps[3].rows[0]).toMatchObject({ opened: true, comment_count: 1 });
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, shimForPglite, wasBlocked, MIGRATIONS_DIR, type TestDatabase } from "./supabase-test-db";

/**
 * Share links (20261116120000_share_links.sql): several client links per delivery, one of
 * them primary and mirrored on the delivery's own link columns, read by members and written
 * by admins or the server, plus link activity and its counters.
 */

const MIGRATION = "20261116120000_share_links.sql";

const U = {
  ownerA: "00000000-0000-4000-8000-0000000000a1",
  viewerA: "00000000-0000-4000-8000-0000000000a2",
  adminA: "00000000-0000-4000-8000-0000000000a3",
  editorA: "00000000-0000-4000-8000-0000000000a4",
  ownerB: "00000000-0000-4000-8000-0000000000b1",
};
const W = { a: "10000000-0000-4000-8000-00000000000a", b: "10000000-0000-4000-8000-00000000000b" };
const D = {
  // Made before the migration ran: the backfill gives it its primary link.
  old: "30000000-0000-4000-8000-0000000000a0",
  a: "30000000-0000-4000-8000-00000000000a",
  b: "30000000-0000-4000-8000-00000000000b",
};
const L = { agency: "c0000000-0000-4000-8000-0000000000a1", other: "c0000000-0000-4000-8000-0000000000b1" };

let db: TestDatabase;

const owner = (sql: string) => db.owner(sql);
const as = (userId: string, sql: string) => db.as("authenticated", userId, sql);
const isPermissionDenied = (error?: string) => /permission denied/i.test(error ?? "");

async function primaryOf(deliveryId: string) {
  const [row] = await owner(
    `select * from public.share_links where delivery_id = '${deliveryId}' and is_primary`
  );
  return row;
}

async function deliveryRow(deliveryId: string) {
  const [row] = await owner(`select * from public.deliveries where id = '${deliveryId}'`);
  return row;
}

beforeAll(async () => {
  db = await createTestDatabase();
  await owner(`
    set session_replication_role = replica;
    insert into auth.users (id, email) values
      ('${U.ownerA}', 'owner-a@test'), ('${U.viewerA}', 'viewer-a@test'), ('${U.adminA}', 'admin-a@test'),
      ('${U.editorA}', 'editor-a@test'), ('${U.ownerB}', 'owner-b@test');
    insert into public.workspaces (id, owner_id, brand_name, slug) values
      ('${W.a}', '${U.ownerA}', 'Studio A', 'studio-a'), ('${W.b}', '${U.ownerB}', 'Studio B', 'studio-b');
    insert into public.workspace_members (workspace_id, user_id, role) values
      ('${W.a}', '${U.ownerA}', 'owner'), ('${W.a}', '${U.adminA}', 'admin'), ('${W.a}', '${U.editorA}', 'editor'),
      ('${W.a}', '${U.viewerA}', 'viewer'), ('${W.b}', '${U.ownerB}', 'owner');
    -- As if it existed before the migration: no triggers, so no link yet.
    insert into public.deliveries (id, workspace_id, title, share_token, passcode_hash, is_download_allowed, expires_at)
    values ('${D.old}', '${W.a}', 'Old delivery', 'old-share-token-0001', 'scrypt$old', true, now() + interval '7 days');
    set session_replication_role = origin;
  `);

  // Running the migration again is safe, and backfills what's missing.
  await owner(shimForPglite(readFileSync(join(MIGRATIONS_DIR, MIGRATION), "utf8")));

  // Made after: the mirror trigger gives each one its primary link.
  await owner(`
    insert into public.deliveries (id, workspace_id, title, share_token) values
      ('${D.a}', '${W.a}', 'Delivery A', 'share-token-a-0001'),
      ('${D.b}', '${W.b}', 'Delivery B', 'share-token-b-0001');
    insert into public.share_links (id, workspace_id, delivery_id, token, label, can_comment, can_approve)
    values
      ('${L.agency}', '${W.a}', '${D.a}', 'agency-token-a-0001', 'Agency', true, false),
      ('${L.other}', '${W.b}', '${D.b}', 'other-token-b-0001', 'Press', false, false);
  `);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

describe("share links: primary links", () => {
  it("are backfilled from existing deliveries with their current token and settings", async () => {
    const link = await primaryOf(D.old);
    expect(link).toMatchObject({
      token: "old-share-token-0001",
      label: "Client link",
      passcode_hash: "scrypt$old",
      can_download: true,
      can_comment: true,
      revoked_at: null,
    });
    expect(link.expires_at).not.toBeNull();
    const [{ n }] = await owner(`select count(*)::int as n from public.share_links where delivery_id = '${D.old}'`);
    expect(n).toBe(1);
  });

  it("are made for every new delivery, even one an editor creates", async () => {
    expect((await primaryOf(D.a))?.token).toBe("share-token-a-0001");

    const made = await db.asSteps("authenticated", U.editorA, [
      `insert into public.deliveries (workspace_id, title) values ('${W.a}', 'Editor delivery') returning id, share_token`,
      `select count(*)::int as n from public.share_links l join public.deliveries d on d.id = l.delivery_id
       where d.title = 'Editor delivery' and l.is_primary and l.token = d.share_token`,
    ]);
    expect(made[0].error).toBeUndefined();
    expect(made[1].rows[0]?.n).toBe(1);
  });

  it("follow changes made through the delivery's own columns", async () => {
    await owner(`update public.deliveries set expires_at = '2030-01-01T00:00:00Z', is_comment_allowed = false,
      passcode_hash = 'scrypt$new' where id = '${D.a}'`);
    const link = await primaryOf(D.a);
    expect(new Date(link.expires_at).toISOString()).toBe("2030-01-01T00:00:00.000Z");
    expect(link.can_comment).toBe(false);
    expect(link.passcode_hash).toBe("scrypt$new");
  });

  it("send their own changes back to the delivery's columns", async () => {
    const link = await primaryOf(D.a);
    await owner(`update public.share_links set token = 'share-token-a-0002', can_download = true,
      expires_at = null, passcode_hash = null where id = '${link.id}'`);
    const delivery = await deliveryRow(D.a);
    expect(delivery).toMatchObject({
      share_token: "share-token-a-0002",
      is_download_allowed: true,
      expires_at: null,
      passcode_hash: null,
    });
  });

  it("leave the delivery alone when another link or only a counter changes", async () => {
    const before = await deliveryRow(D.a);
    await owner(`update public.share_links set can_download = true, label = 'Agency team' where id = '${L.agency}'`);
    await owner(`update public.share_links set open_count = open_count + 1 where delivery_id = '${D.a}' and is_primary`);
    const after = await deliveryRow(D.a);
    expect(after.share_token).toBe(before.share_token);
    expect(after.is_download_allowed).toBe(before.is_download_allowed);
    expect(after.updated_at).toEqual(before.updated_at);
  });

  it("can be switched in one step, and the new one's token reaches the delivery", async () => {
    const previous = await primaryOf(D.a);
    await owner(`select public.set_primary_share_link('${L.agency}')`);
    const now = await primaryOf(D.a);
    expect(now.id).toBe(L.agency);
    expect((await deliveryRow(D.a)).share_token).toBe("agency-token-a-0001");
    const [old] = await owner(`select is_primary from public.share_links where id = '${previous.id}'`);
    expect(old.is_primary).toBe(false);

    // Back again, for the tests below.
    await owner(`select public.set_primary_share_link('${previous.id}')`);
    expect((await deliveryRow(D.a)).share_token).toBe(previous.token);
  });

  it("can't be revoked, and only one link per delivery is primary", async () => {
    const link = await primaryOf(D.a);
    await expect(owner(`update public.share_links set revoked_at = now() where id = '${link.id}'`)).rejects.toThrow();
    await expect(owner(`update public.share_links set is_primary = true where id = '${L.agency}'`)).rejects.toThrow();
    await owner(`update public.share_links set revoked_at = now() where id = '${L.agency}'`);
    await expect(owner(`select public.set_primary_share_link('${L.agency}')`)).rejects.toThrow("revoked");
    await owner(`update public.share_links set revoked_at = null where id = '${L.agency}'`);
  });

  it("stay with their delivery, in its workspace", async () => {
    await expect(owner(`update public.share_links set delivery_id = '${D.b}' where id = '${L.agency}'`)).rejects.toThrow();
    await expect(
      owner(`insert into public.share_links (workspace_id, delivery_id, label) values ('${W.b}', '${D.a}', 'Wrong studio')`)
    ).rejects.toThrow("same workspace");
  });
});

describe("share links: who can see and change them", () => {
  it("are visible to every member of the workspace, and nobody else", async () => {
    const count = async (userId: string) =>
      (await as(userId, `select count(*)::int as n from public.share_links where workspace_id = '${W.a}'`)).rows[0]?.n;
    expect(await count(U.viewerA)).toBeGreaterThanOrEqual(3);
    expect(await count(U.ownerB)).toBe(0);
    expect(isPermissionDenied((await db.as("anon", null, `select * from public.share_links`)).error)).toBe(true);
  });

  it("can be added, changed and deleted by admins, not editors or viewers", async () => {
    const add = (userId: string) =>
      as(userId, `insert into public.share_links (workspace_id, delivery_id, label) values ('${W.a}', '${D.a}', 'New link')`);
    expect(wasBlocked(await add(U.editorA))).toBe(true);
    expect(wasBlocked(await add(U.viewerA))).toBe(true);
    expect((await add(U.adminA)).error).toBeUndefined();

    const change = (userId: string) => as(userId, `update public.share_links set label = 'Renamed' where id = '${L.agency}'`);
    expect(wasBlocked(await change(U.editorA))).toBe(true);
    expect(wasBlocked(await change(U.ownerB))).toBe(true);
    expect((await change(U.adminA)).affected).toBe(1);

    const remove = (userId: string) => as(userId, `delete from public.share_links where id = '${L.agency}'`);
    expect(wasBlocked(await remove(U.editorA))).toBe(true);
    expect((await remove(U.ownerA)).affected).toBe(1);
  });

  it("can't have their primary link deleted, even by an owner", async () => {
    const primary = await primaryOf(D.a);
    expect(wasBlocked(await as(U.ownerA, `delete from public.share_links where id = '${primary.id}'`))).toBe(true);
  });

  it("are switched and counted by the server only", async () => {
    const switched = await as(U.ownerA, `select public.set_primary_share_link('${L.agency}')`);
    expect(isPermissionDenied(switched.error)).toBe(true);
    const counted = await as(U.ownerA, `select public.record_share_link_event('${L.agency}', 'open')`);
    expect(isPermissionDenied(counted.error)).toBe(true);
  });

  it("can be switched, changed and counted by the server's service role", async () => {
    const [newLink] = await owner(
      `insert into public.share_links (workspace_id, delivery_id, label) values ('${W.a}', '${D.a}', 'Service role check') returning id`
    );
    const steps = await db.asSteps("service_role", null, [
      `select public.record_share_link_event('${newLink.id}', 'download', null, 'visitor-x', null) as r`,
      `select public.set_primary_share_link('${newLink.id}')`,
      `select d.share_token = l.token as mirrored from public.deliveries d
       join public.share_links l on l.delivery_id = d.id and l.is_primary where d.id = '${D.a}'`,
      `update public.share_links set can_download = false where id = '${newLink.id}'`,
    ]);
    for (const step of steps) expect(step.error).toBeUndefined();
    expect(steps[0].rows[0].r).toEqual({ recorded: true, first_open: false });
    expect(steps[2].rows[0].mirrored).toBe(true);
  });
});

describe("share links: activity", () => {
  it("counts a visitor's opens once an hour, and tells the server about the very first open", async () => {
    const link = await primaryOf(D.b);
    const open = async (visitor: string) =>
      (await owner(`select public.record_share_link_event('${link.id}', 'open', null, '${visitor}', 'AE') as r`))[0].r;

    expect(await open("visitor-1")).toEqual({ recorded: true, first_open: true });
    expect(await open("visitor-1")).toEqual({ recorded: false, first_open: false });
    expect(await open("visitor-2")).toEqual({ recorded: true, first_open: false });

    await owner(`select public.record_share_link_event('${link.id}', 'download', null, 'visitor-2', null)`);
    const after = await primaryOf(D.b);
    expect(after).toMatchObject({ open_count: 2, download_count: 1 });
    expect(after.first_opened_at).not.toBeNull();
    expect(after.last_downloaded_at).not.toBeNull();
  });

  it("is readable by the workspace's members only, and written by the server", async () => {
    const read = (userId: string) =>
      as(userId, `select count(*)::int as n from public.share_link_events where workspace_id = '${W.b}'`);
    expect((await read(U.ownerB)).rows[0]?.n).toBeGreaterThan(0);
    expect((await read(U.ownerA)).rows[0]?.n).toBe(0);
    const link = await primaryOf(D.b);
    const write = await as(U.ownerB, `insert into public.share_link_events (link_id, workspace_id, delivery_id, kind)
      values ('${link.id}', '${W.b}', '${D.b}', 'open')`);
    expect(isPermissionDenied(write.error)).toBe(true);
  });

  it("ignores an unknown link", async () => {
    const [{ r }] = await owner(
      `select public.record_share_link_event('c0000000-0000-4000-8000-0000000000ff', 'open') as r`
    );
    expect(r).toEqual({ recorded: false, first_open: false });
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, wasBlocked, type ApiRole, type QueryOutcome, type TestDatabase } from "./supabase-test-db";

/**
 * Who can access what, enforced by Postgres row-level security.
 *
 * The database is built from supabase/migrations and queried as the same API
 * roles the browser and server use (anon, authenticated, service_role), so a
 * policy regression fails here even though every unit test mocks the database.
 *
 * Workspace roles: viewer < editor < admin < owner (see 20261111120000_role_aware_rls.sql).
 * Anonymous visitors (the public anon key) get no access at all; public pages and
 * forms run on the server with the service role.
 *
 * A test marked `it.fails` documents a known gap: it asserts the intended rule and
 * currently fails. Once the gap is fixed, the test passes, `it.fails` reports it, and
 * the marker is removed. There are none left; don't add new ones.
 */

const U = {
  ownerA: "00000000-0000-4000-8000-0000000000a1",
  viewerA: "00000000-0000-4000-8000-0000000000a2",
  adminA: "00000000-0000-4000-8000-0000000000a3",
  editorA: "00000000-0000-4000-8000-0000000000a4",
  ownerB: "00000000-0000-4000-8000-0000000000b1",
  platformAdmin: "00000000-0000-4000-8000-0000000000ad",
  stranger: "00000000-0000-4000-8000-0000000000ff",
  newSignup: "00000000-0000-4000-8000-0000000000c1",
};
const W = {
  a: "10000000-0000-4000-8000-00000000000a",
  b: "10000000-0000-4000-8000-00000000000b",
  new: "10000000-0000-4000-8000-00000000000e",
};
const PF = { a: "20000000-0000-4000-8000-00000000000a", b: "20000000-0000-4000-8000-00000000000b" };
const D = { a: "30000000-0000-4000-8000-00000000000a", b: "30000000-0000-4000-8000-00000000000b" };
const A = {
  a1: "40000000-0000-4000-8000-0000000000a1",
  a2: "40000000-0000-4000-8000-0000000000a2",
  b1: "40000000-0000-4000-8000-0000000000b1",
  new: "40000000-0000-4000-8000-0000000000e1",
};
const V = { a1: "50000000-0000-4000-8000-0000000000a1", b1: "50000000-0000-4000-8000-0000000000b1" };
const P = { a: "60000000-0000-4000-8000-00000000000a", b: "60000000-0000-4000-8000-00000000000b" };
const PLAN = "70000000-0000-4000-8000-000000000001";
const F = { a1: "80000000-0000-4000-8000-0000000000a1", b1: "80000000-0000-4000-8000-0000000000b1" };
const INV = { a: "90000000-0000-4000-8000-00000000000a" };

const SEED = `
  set session_replication_role = replica; -- fixtures only: skip signup/storage triggers

  insert into auth.users (id, email) values
    ('${U.ownerA}', 'owner-a@test'), ('${U.viewerA}', 'viewer-a@test'), ('${U.adminA}', 'admin-a@test'),
    ('${U.editorA}', 'editor-a@test'), ('${U.ownerB}', 'owner-b@test'), ('${U.platformAdmin}', 'staff@test'),
    ('${U.stranger}', 'stranger@test');
  insert into public.user_profiles (id, platform_role) values
    ('${U.ownerA}', 'user'), ('${U.viewerA}', 'user'), ('${U.adminA}', 'user'), ('${U.editorA}', 'user'),
    ('${U.ownerB}', 'user'), ('${U.platformAdmin}', 'admin'), ('${U.stranger}', 'user');

  insert into public.plans (id, name, slug, is_active) values ('${PLAN}', 'Starter', 'starter', true);

  insert into public.workspaces (id, owner_id, brand_name, slug) values
    ('${W.a}', '${U.ownerA}', 'Studio A', 'studio-a'), ('${W.b}', '${U.ownerB}', 'Studio B', 'studio-b');
  insert into public.workspace_members (workspace_id, user_id, role) values
    ('${W.a}', '${U.ownerA}', 'owner'), ('${W.a}', '${U.adminA}', 'admin'), ('${W.a}', '${U.editorA}', 'editor'),
    ('${W.a}', '${U.viewerA}', 'viewer'), ('${W.b}', '${U.ownerB}', 'owner');
  insert into public.subscriptions (workspace_id, plan_id, status) values
    ('${W.a}', '${PLAN}', 'active'), ('${W.b}', '${PLAN}', 'active');
  insert into public.invoices (workspace_id, invoice_number, description) values
    ('${W.a}', 'INV-A-1', 'Studio plan'), ('${W.b}', 'INV-B-1', 'Studio plan');
  insert into public.workspace_features (workspace_id, features) values ('${W.a}', '{"storage_gb": 10}');
  insert into public.workspace_invitations (id, workspace_id, inviter_id, email, role) values
    ('${INV.a}', '${W.a}', '${U.ownerA}', 'invitee@test', 'editor');

  insert into public.portfolios (id, workspace_id, slug, title, is_published) values
    ('${PF.a}', '${W.a}', 'studio-a', 'A', true),
    ('${PF.b}', '${W.b}', 'studio-b', 'B (unpublished)', false);
  insert into public.clients (workspace_id, name) values ('${W.a}', 'Client A'), ('${W.b}', 'Client B');
  insert into public.deliveries (id, workspace_id, title, share_token, passcode_hash) values
    ('${D.a}', '${W.a}', 'Delivery A', 'share-token-a', 'passcode-hash-a'),
    ('${D.b}', '${W.b}', 'Delivery B', 'share-token-b', null);
  insert into public.assets (id, workspace_id, delivery_id, title) values
    ('${A.a1}', '${W.a}', '${D.a}', 'Cut A1'), ('${A.a2}', '${W.a}', '${D.a}', 'Cut A2'),
    ('${A.b1}', '${W.b}', '${D.b}', 'Cut B1');
  insert into public.asset_versions (id, asset_id, version_number, raw_file_url, file_size_bytes) values
    ('${V.a1}', '${A.a1}', 1, 'private/workspaces/${W.a}/deliveries/${D.a}/a1.mp4', 100),
    ('${V.b1}', '${A.b1}', 1, 'private/workspaces/${W.b}/deliveries/${D.b}/b1.mp4', 100);
  insert into public.feedback (id, asset_version_id, author_user_id, author_name, comment_text) values
    ('${F.a1}', '${V.a1}', '${U.ownerA}', 'Owner A', 'Trim the intro'),
    ('${F.b1}', '${V.b1}', null, 'Client B', 'Looks great');
  insert into public.projects (id, workspace_id, portfolio_id, title) values
    ('${P.a}', '${W.a}', '${PF.a}', 'Showcase A'), ('${P.b}', '${W.b}', '${PF.b}', 'Showcase B');
  insert into public.project_assets (project_id, asset_id) values ('${P.a}', '${A.a1}'), ('${P.b}', '${A.b1}');

  insert into public.user_sessions (user_id, session_token_id, is_revoked) values
    ('${U.ownerA}', 'session-a-active', false), ('${U.ownerA}', 'session-a-revoked', true),
    ('${U.ownerB}', 'session-b-active', false);
  insert into public.waitlist_entries (email, referral_code) values ('early@test', 'REF-EARLY');
  insert into public.inquiries (type, name, email, message, workspace_id) values
    ('portfolio_lead', 'Lead', 'lead@test', 'Hello Studio A', '${W.a}');
  insert into public.notification_logs (workspace_id) values ('${W.a}');

  set session_replication_role = origin;
`;

let db: TestDatabase;

async function countAs(role: ApiRole, userId: string | null, table: string, where = "true"): Promise<number> {
  const result = await db.as(role, userId, `select count(*)::int as n from public.${table} where ${where}`);
  if (result.error) throw new Error(`count ${table} as ${role}: ${result.error}`);
  return result.rows[0].n;
}

const user = (userId: string, table: string, where?: string) => countAs("authenticated", userId, table, where);
const as = (userId: string, sql: string) => db.as("authenticated", userId, sql);
const isPermissionDenied = (outcome: QueryOutcome) => /permission denied/i.test(outcome.error ?? "");

beforeAll(async () => {
  db = await createTestDatabase();
  await db.owner(SEED);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

describe("migrations", () => {
  it("rebuild the whole database from scratch, starting from the baseline", () => {
    expect(db.migrations[0]).toMatch(/_baseline_schema\.sql$/);
    expect(db.migrations.length).toBeGreaterThan(1);
  });

  it("leave no public table without row-level security", async () => {
    const rows = await db.owner(`
      select relname from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity
      order by 1`);
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("give every SECURITY DEFINER function a fixed search_path", async () => {
    const rows = await db.owner(`
      select proname from pg_proc
      where pronamespace = 'public'::regnamespace and prosecdef
        and not exists (select 1 from unnest(coalesce(proconfig, '{}')) c where c like 'search_path=%')
      order by 1`);
    expect(rows.map((r) => r.proname)).toEqual([]);
  });

  it("provision a profile, personal workspace and owner membership on signup", async () => {
    await db.owner(`begin;
      insert into auth.users (id, email, raw_user_meta_data)
      values ('${U.newSignup}', 'new@test', '{"full_name": "New Filmmaker"}')`);
    try {
      const [profile] = await db.owner(`select platform_role from public.user_profiles where id = '${U.newSignup}'`);
      const [membership] = await db.owner(`
        select m.role, w.slug from public.workspace_members m
        join public.workspaces w on w.id = m.workspace_id
        where m.user_id = '${U.newSignup}'`);
      const [subscription] = await db.owner(`
        select s.status from public.subscriptions s
        join public.workspaces w on w.id = s.workspace_id
        where w.owner_id = '${U.newSignup}'`);
      expect(profile?.platform_role).toBe("user");
      expect(membership).toMatchObject({ role: "owner" });
      expect(subscription?.status).toBe("trialing");
    } finally {
      await db.owner("rollback");
    }
  });
});

describe("anonymous visitors (the public anon key)", () => {
  it("have no privileges on any table, view or sequence", async () => {
    const rows = await db.owner(`
      select c.relname from pg_class c
      where c.relnamespace = 'public'::regnamespace
        and (
          (c.relkind in ('r', 'p', 'v', 'm', 'f') and (
            has_table_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
            or has_any_column_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, REFERENCES')))
          or (c.relkind = 'S' and has_sequence_privilege('anon', c.oid, 'USAGE, SELECT, UPDATE'))
        )
      order by 1`);
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("are refused when they query any table or view", async () => {
    const relations = await db.owner(`
      select relname from pg_class
      where relnamespace = 'public'::regnamespace and relkind in ('r', 'v') order by 1`);
    expect(relations.length).toBeGreaterThan(20);
    for (const { relname } of relations) {
      const read = await db.as("anon", null, `select * from public.${relname} limit 1`);
      expect(isPermissionDenied(read), `anon read ${relname}`).toBe(true);
    }
  });

  it("can't call any function", async () => {
    const rows = await db.owner(`
      select proname from pg_proc
      where pronamespace = 'public'::regnamespace and has_function_privilege('anon', oid, 'EXECUTE')
      order by 1`);
    expect(rows.map((r) => r.proname)).toEqual([]);
    expect(isPermissionDenied(await db.as("anon", null, `select public.is_workspace_member('${W.a}', '${U.ownerA}')`))).toBe(true);
  });

  it("can't write anything, including the waitlist and inquiry tables behind the public forms", async () => {
    const writes = [
      `insert into public.waitlist_entries (email, referral_code) values ('new@test', 'REF-NEW')`,
      `insert into public.inquiries (type, name, email, message) values ('contact_message', 'Ann', 'ann@test', 'Hi')`,
      `insert into public.projects (workspace_id, portfolio_id, title) values ('${W.a}', '${PF.a}', 'spam')`,
      `update public.deliveries set passcode_hash = null`,
      `delete from public.assets`,
    ];
    for (const sql of writes) {
      expect(isPermissionDenied(await db.as("anon", null, sql)), sql).toBe(true);
    }
  });
});

describe("signed-in callers and functions", () => {
  it("can call only the helpers that RLS policies use", async () => {
    const rows = await db.owner(`
      select proname from pg_proc
      where pronamespace = 'public'::regnamespace and has_function_privilege('authenticated', oid, 'EXECUTE')
      order by 1`);
    expect(rows.map((r) => r.proname)).toEqual([
      "has_workspace_role",
      "is_platform_admin",
      "is_workspace_admin",
      "is_workspace_member",
    ]);
  });

  it("only learn their own memberships from the helpers", async () => {
    const probe = (caller: string, sql: string) => as(caller, `select ${sql} as ok`).then((r) => r.rows[0]?.ok);
    expect(await probe(U.ownerA, `public.is_workspace_member('${W.a}', '${U.ownerA}')`)).toBe(true);
    expect(await probe(U.ownerB, `public.is_workspace_member('${W.a}', '${U.ownerA}')`)).toBe(false);
    expect(await probe(U.ownerB, `public.is_workspace_admin('${W.a}', '${U.adminA}')`)).toBe(false);
    expect(await probe(U.stranger, `public.is_platform_admin('${U.platformAdmin}')`)).toBe(false);
    expect(await probe(U.platformAdmin, `public.is_platform_admin('${U.platformAdmin}')`)).toBe(true);
  });

  it("can't call the waitlist position function (only the server does)", async () => {
    const call = await as(U.ownerA, `select * from public.get_waitlist_position('${INV.a}')`);
    expect(isPermissionDenied(call)).toBe(true);
  });
});

describe("deliveries (share tokens, passcode hashes)", () => {
  it("are invisible to signed-in users outside the workspace", async () => {
    expect(await user(U.stranger, "deliveries")).toBe(0);
    expect(await user(U.ownerB, "deliveries", `workspace_id = '${W.a}'`)).toBe(0);
  });

  it("are visible to every member of their workspace", async () => {
    expect(await user(U.ownerA, "deliveries")).toBe(1);
    expect(await user(U.viewerA, "deliveries")).toBe(1);
  });

  it("can't be edited or deleted from another workspace", async () => {
    const edit = await as(U.ownerA, `update public.deliveries set passcode_hash = null where id = '${D.b}'`);
    const remove = await as(U.ownerB, `delete from public.deliveries where id = '${D.a}'`);
    expect(wasBlocked(edit)).toBe(true);
    expect(wasBlocked(remove)).toBe(true);
  });

  it("don't leak through the deliveries summary view", async () => {
    expect(await user(U.ownerB, "view_workspace_deliveries_summary", `workspace_id = '${W.a}'`)).toBe(0);
  });

  it("are read-only for viewers", async () => {
    expect(wasBlocked(await as(U.viewerA, `update public.deliveries set title = 'x' where id = '${D.a}'`))).toBe(true);
    expect(wasBlocked(await as(U.viewerA, `delete from public.deliveries where id = '${D.a}'`))).toBe(true);
    expect(wasBlocked(await as(U.viewerA,
      `insert into public.deliveries (workspace_id, title) values ('${W.a}', 'new')`))).toBe(true);
  });

  it("let editors create and edit them, but not change client-room access or delete them", async () => {
    expect(await as(U.editorA, `update public.deliveries set title = 'Renamed' where id = '${D.a}'`)).toMatchObject({ affected: 1 });
    expect((await as(U.editorA, `insert into public.deliveries (workspace_id, title) values ('${W.a}', 'new')`)).error).toBeUndefined();
    for (const change of [
      "passcode_hash = null",
      "share_token = 'guessable'",
      "is_download_allowed = true",
      "is_comment_allowed = false",
      "expires_at = now() + interval '1 year'",
      "silo_status = 'archived'",
    ]) {
      expect(wasBlocked(await as(U.editorA, `update public.deliveries set ${change} where id = '${D.a}'`)), change).toBe(true);
    }
    expect(wasBlocked(await as(U.editorA, `delete from public.deliveries where id = '${D.a}'`))).toBe(true);
  });

  it("let admins change client-room access and delete them", async () => {
    const access = await as(U.adminA,
      `update public.deliveries set passcode_hash = null, is_download_allowed = true where id = '${D.a}'`);
    expect(access).toMatchObject({ affected: 1 });
    expect(await as(U.adminA, `delete from public.deliveries where id = '${D.a}'`)).toMatchObject({ affected: 1 });
  });

  it("never move to another workspace", async () => {
    expect(wasBlocked(await as(U.ownerA, `update public.deliveries set workspace_id = '${W.b}' where id = '${D.a}'`))).toBe(true);
  });
});

describe("delivery content (assets, versions, comments, clients)", () => {
  it("is invisible to other workspaces", async () => {
    expect(await user(U.ownerB, "assets", `workspace_id = '${W.a}'`)).toBe(0);
    expect(await user(U.ownerB, "asset_versions", `asset_id = '${A.a1}'`)).toBe(0);
    expect(await user(U.ownerB, "feedback", `asset_version_id = '${V.a1}'`)).toBe(0);
    expect(await user(U.ownerB, "clients", `workspace_id = '${W.a}'`)).toBe(0);
  });

  it("is visible to the workspace's members", async () => {
    expect(await user(U.ownerA, "assets")).toBe(2);
    expect(await user(U.viewerA, "asset_versions")).toBe(1);
    expect(await user(U.ownerA, "feedback")).toBe(1);
    expect(await user(U.ownerA, "clients")).toBe(1);
  });

  it("can't be placed in another studio's client room", async () => {
    const insert = await as(U.ownerB,
      `insert into public.assets (workspace_id, delivery_id, title) values ('${W.b}', '${D.a}', 'injected')`);
    const move = await as(U.ownerB, `update public.assets set delivery_id = '${D.a}' where id = '${A.b1}'`);
    expect(wasBlocked(insert)).toBe(true);
    expect(wasBlocked(move)).toBe(true);
  });

  it("never move to another workspace, and versions never move to another file", async () => {
    expect(wasBlocked(await as(U.ownerA, `update public.assets set workspace_id = '${W.b}' where id = '${A.a1}'`))).toBe(true);
    expect(wasBlocked(await as(U.ownerA, `update public.asset_versions set asset_id = '${A.a2}' where id = '${V.a1}'`))).toBe(true);
  });

  it("can be added by editors but not viewers", async () => {
    expect(wasBlocked(await as(U.viewerA,
      `insert into public.assets (workspace_id, delivery_id, title) values ('${W.a}', '${D.a}', 'v')`))).toBe(true);
    const asset = await as(U.editorA,
      `insert into public.assets (id, workspace_id, delivery_id, title) values ('${A.new}', '${W.a}', '${D.a}', 'e')`);
    expect(asset.error).toBeUndefined();
  });

  it("get their file versions from the server, and the storage counter follows", async () => {
    const [asset, version, workspace] = await db.asSteps("service_role", null, [
      `insert into public.assets (id, workspace_id, delivery_id, title) values ('${A.new}', '${W.a}', '${D.a}', 'e')`,
      `insert into public.asset_versions (asset_id, version_number, raw_file_url, file_size_bytes, is_active_version)
       values ('${A.new}', 1, 'private/workspaces/${W.a}/deliveries/${D.a}/k.mp4', 500, true)`,
      `select storage_used_bytes::int as n from public.workspaces where id = '${W.a}'`,
    ]);
    expect(asset.error).toBeUndefined();
    expect(version.error).toBeUndefined();
    expect(workspace.rows[0].n).toBe(600);
  });

  it("keep the storage counter right when files move to Trash, come back, or are deleted", async () => {
    const counter = `select storage_used_bytes::int as n from public.workspaces where id = '${W.a}'`;
    const steps = await db.asSteps("authenticated", U.adminA, [
      `update public.asset_versions set is_active_version = true where id = '${V.a1}'`, // fires the version trigger
      counter,
      `update public.assets set is_archived = true where id = '${A.a1}'`,
      counter,
      `update public.assets set is_archived = false where id = '${A.a1}'`,
      counter,
      `delete from public.assets where id = '${A.a1}'`,
      counter,
    ]);
    expect(steps.map((s) => s.error)).toEqual(Array(8).fill(undefined));
    const [initial, trashed, restored, deleted] = [steps[1], steps[3], steps[5], steps[7]].map((s) => s.rows[0].n);
    expect({ initial, trashed, restored, deleted }).toEqual({ initial: 100, trashed: 0, restored: 100, deleted: 0 });
  });

  it("can be deleted by admins, not editors", async () => {
    expect(wasBlocked(await as(U.editorA, `delete from public.assets where id = '${A.a2}'`))).toBe(true);
    expect(wasBlocked(await as(U.editorA, `delete from public.asset_versions where id = '${V.a1}'`))).toBe(true);
    expect(await as(U.adminA, `delete from public.assets where id = '${A.a2}'`)).toMatchObject({ affected: 1 });
  });

  it("let members comment only as themselves; client comments come from the server", async () => {
    const own = await as(U.viewerA, `insert into public.feedback (asset_version_id, author_user_id, author_name, comment_text)
      values ('${V.a1}', '${U.viewerA}', 'Viewer', 'hi')`);
    const spoofed = await as(U.viewerA, `insert into public.feedback (asset_version_id, author_user_id, author_name, comment_text)
      values ('${V.a1}', '${U.ownerA}', 'Owner A', 'spoof')`);
    const asClient = await as(U.viewerA, `insert into public.feedback (asset_version_id, author_user_id, author_name, comment_text)
      values ('${V.a1}', null, 'The client', 'approve it')`);
    expect(own).toMatchObject({ affected: 1 });
    expect(wasBlocked(spoofed)).toBe(true);
    expect(wasBlocked(asClient)).toBe(true);
  });

  it("let the author or an editor edit and delete comments, and never move them", async () => {
    expect(wasBlocked(await as(U.viewerA, `update public.feedback set is_resolved = true where id = '${F.a1}'`))).toBe(true);
    expect(wasBlocked(await as(U.viewerA, `delete from public.feedback where id = '${F.a1}'`))).toBe(true);
    expect(await as(U.editorA, `update public.feedback set is_resolved = true where id = '${F.a1}'`)).toMatchObject({ affected: 1 });
    expect(wasBlocked(await as(U.ownerA,
      `update public.feedback set asset_version_id = '${V.b1}' where id = '${F.a1}'`))).toBe(true);
    expect(wasBlocked(await as(U.ownerA, `update public.feedback set comment_text = 'x' where id = '${F.b1}'`))).toBe(true);
    expect(await as(U.editorA, `delete from public.feedback where id = '${F.a1}'`)).toMatchObject({ affected: 1 });
  });

  it("never let members pass a comment off as a guest's, or change who wrote one", async () => {
    const forged = await as(U.viewerA, `insert into public.feedback
      (asset_version_id, author_user_id, author_name, comment_text, guest_author_key_hash)
      values ('${V.a1}', '${U.viewerA}', 'Viewer', 'x', 'stolen-guest-key-hash')`);
    const claim = await as(U.editorA, `update public.feedback set guest_author_key_hash = 'mine' where id = '${F.a1}'`);
    const reassign = await as(U.editorA, `update public.feedback set author_user_id = '${U.editorA}' where id = '${F.a1}'`);
    expect(wasBlocked(forged)).toBe(true);
    expect(wasBlocked(claim)).toBe(true);
    expect(wasBlocked(reassign)).toBe(true);
  });

  it("let members reply only as themselves", async () => {
    const own = await as(U.viewerA, `insert into public.feedback_replies (feedback_id, author_user_id, author_name, comment_text)
      values ('${F.a1}', '${U.viewerA}', 'Viewer', 'agreed')`);
    const spoofed = await as(U.viewerA, `insert into public.feedback_replies (feedback_id, author_user_id, author_name, comment_text)
      values ('${F.a1}', null, 'The client', 'x')`);
    const foreign = await as(U.ownerA, `insert into public.feedback_replies (feedback_id, author_user_id, author_name, comment_text)
      values ('${F.b1}', '${U.ownerA}', 'Owner A', 'x')`);
    expect(own).toMatchObject({ affected: 1 });
    expect(wasBlocked(spoofed)).toBe(true);
    expect(wasBlocked(foreign)).toBe(true);
  });

  it("let editors manage clients and admins delete them", async () => {
    expect(wasBlocked(await as(U.viewerA, `insert into public.clients (workspace_id, name) values ('${W.a}', 'x')`))).toBe(true);
    expect((await as(U.editorA, `insert into public.clients (workspace_id, name) values ('${W.a}', 'x')`)).error).toBeUndefined();
    expect(wasBlocked(await as(U.editorA, `delete from public.clients where workspace_id = '${W.a}'`))).toBe(true);
    expect(await as(U.adminA, `delete from public.clients where workspace_id = '${W.a}'`)).toMatchObject({ affected: 1 });
  });
});

describe("portfolios and showcase projects", () => {
  it("show signed-in outsiders only published portfolios", async () => {
    expect(await user(U.stranger, "portfolios")).toBe(1);
    expect(await user(U.ownerA, "portfolios", `id = '${PF.b}'`)).toBe(0);
    expect(await user(U.ownerB, "portfolios", `id = '${PF.b}'`)).toBe(1);
  });

  it("keep showcase projects and their asset links private to the workspace", async () => {
    expect(await user(U.ownerA, "projects")).toBe(1);
    expect(await user(U.ownerA, "project_assets")).toBe(1);
    expect(await user(U.stranger, "projects")).toBe(0);
    expect(await user(U.stranger, "project_assets")).toBe(0);
  });

  it("never treat a file in a delivery as a standalone portfolio piece", async () => {
    const inDelivery = await as(U.editorA, `update public.assets set is_portfolio = true where id = '${A.a1}'`);
    expect(wasBlocked(inDelivery)).toBe(true);
    const [standalone, piece] = await db.asSteps("authenticated", U.editorA, [
      `insert into public.assets (id, workspace_id, title) values ('${A.new}', '${W.a}', 'Reel')`,
      `update public.assets set is_portfolio = true where id = '${A.new}'`,
    ]);
    expect(standalone.error).toBeUndefined();
    expect(piece).toMatchObject({ affected: 1 });
  });

  it("let platform admins read every showcase (admin dashboard)", async () => {
    expect(await user(U.platformAdmin, "projects")).toBe(2);
    expect(await user(U.platformAdmin, "project_assets")).toBe(2);
  });

  it("let editors create projects in their own portfolio, from their own deliveries", async () => {
    const insert = await as(U.editorA,
      `insert into public.projects (workspace_id, portfolio_id, title, source_delivery_id)
       values ('${W.a}', '${PF.a}', 'New showcase', '${D.a}')`);
    expect(insert.error).toBeUndefined();
    expect(wasBlocked(await as(U.viewerA,
      `insert into public.projects (workspace_id, portfolio_id, title) values ('${W.a}', '${PF.a}', 'x')`))).toBe(true);
    expect(wasBlocked(await as(U.viewerA, `update public.portfolios set title = 'x' where id = '${PF.a}'`))).toBe(true);
  });

  it("never link a project to another workspace's portfolio, delivery or files", async () => {
    const foreignPortfolio = await as(U.ownerA,
      `insert into public.projects (workspace_id, portfolio_id, title) values ('${W.a}', '${PF.b}', 'x')`);
    const foreignDelivery = await as(U.ownerA,
      `update public.projects set source_delivery_id = '${D.b}' where id = '${P.a}'`);
    const foreignAsset = await as(U.ownerA,
      `insert into public.project_assets (project_id, asset_id) values ('${P.a}', '${A.b1}')`);
    const foreignProject = await as(U.ownerA,
      `insert into public.project_assets (project_id, asset_id) values ('${P.b}', '${A.a2}')`);
    expect(wasBlocked(foreignPortfolio)).toBe(true);
    expect(wasBlocked(foreignDelivery)).toBe(true);
    expect(wasBlocked(foreignAsset)).toBe(true);
    expect(wasBlocked(foreignProject)).toBe(true);
  });

  it("let members attach their own files (the app's upsert path)", async () => {
    const attach = await as(U.ownerA,
      `insert into public.project_assets (project_id, asset_id, display_order) values ('${P.a}', '${A.a2}', 1)
       on conflict (project_id, asset_id) do update set display_order = excluded.display_order`);
    expect(attach.error).toBeUndefined();
  });
});

describe("billing and entitlements", () => {
  it("let members read their own subscription, invoices and plan overrides", async () => {
    expect(await user(U.viewerA, "subscriptions")).toBe(1);
    expect(await user(U.ownerA, "invoices")).toBe(1);
    expect(await user(U.ownerA, "workspace_features")).toBe(1);
  });

  it("hide them from other workspaces", async () => {
    expect(await user(U.ownerB, "subscriptions", `workspace_id = '${W.a}'`)).toBe(0);
    expect(await user(U.ownerB, "invoices", `workspace_id = '${W.a}'`)).toBe(0);
    expect(await user(U.ownerB, "workspace_features", `workspace_id = '${W.a}'`)).toBe(0);
  });

  it("don't let workspace owners change their own plan, invoices, limits or storage counter", async () => {
    const plan = await as(U.ownerA,
      `update public.subscriptions set status = 'active', plan_id = '${PLAN}' where workspace_id = '${W.a}'`);
    const invoice = await as(U.ownerA,
      `insert into public.invoices (workspace_id, invoice_number, description) values ('${W.a}', 'FAKE', 'x')`);
    const limits = await as(U.ownerA,
      `update public.workspace_features set features = '{"storage_gb": 100000}' where workspace_id = '${W.a}'`);
    const newLimits = await as(U.ownerB,
      `insert into public.workspace_features (workspace_id, features) values ('${W.b}', '{"storage_gb": 100000}')`);
    const counter = await as(U.ownerA, `update public.workspaces set storage_used_bytes = 12345 where id = '${W.a}'`);
    expect(wasBlocked(plan)).toBe(true);
    expect(wasBlocked(invoice)).toBe(true);
    expect(wasBlocked(limits)).toBe(true);
    expect(wasBlocked(newLimits)).toBe(true);
    expect(wasBlocked(counter)).toBe(true);
  });

  it("let platform admins adjust plan overrides", async () => {
    const update = await as(U.platformAdmin,
      `update public.workspace_features set features = '{"storage_gb": 50}' where workspace_id = '${W.a}'`);
    expect(update).toMatchObject({ affected: 1 });
  });

  it("keep the Stripe idempotency ledger service-role only", async () => {
    const asUser = await as(U.ownerA, `insert into public.processed_billing_events (id, kind) values ('cs_1', 'x')`);
    const [first, replay] = await db.asSteps("service_role", null, [
      `insert into public.processed_billing_events (id, workspace_id, kind) values ('cs_1', '${W.a}', 'checkout')`,
      `insert into public.processed_billing_events (id, workspace_id, kind) values ('cs_1', '${W.a}', 'checkout')`,
    ]);
    expect(asUser.error).toBeDefined();
    expect(first.error).toBeUndefined();
    expect(replay.code).toBe("23505");
  });

  it("show signed-in users the active plans (the pricing page reads them on the server)", async () => {
    expect(await user(U.stranger, "plans")).toBe(1);
  });
});

describe("accounts, workspaces and members", () => {
  const member = (userId: string) => `workspace_id = '${W.a}' and user_id = '${userId}'`;

  it("let users read only their own profile", async () => {
    expect(await user(U.ownerA, "user_profiles")).toBe(1);
    expect(await user(U.platformAdmin, "user_profiles")).toBe(7);
  });

  it("never let a user make themselves a platform admin", async () => {
    const escalate = await as(U.stranger, `update public.user_profiles set platform_role = 'admin' where id = '${U.stranger}'`);
    expect(wasBlocked(escalate)).toBe(true);
  });

  it("hide a workspace's members from outsiders", async () => {
    expect(await user(U.ownerB, "workspace_members", `workspace_id = '${W.a}'`)).toBe(0);
    expect(await user(U.viewerA, "workspace_members", `workspace_id = '${W.a}'`)).toBe(4);
  });

  it("don't let anyone join a workspace on their own", async () => {
    const asEditor = await as(U.stranger,
      `insert into public.workspace_members (workspace_id, user_id, role) values ('${W.a}', '${U.stranger}', 'editor')`);
    const asOwner = await as(U.ownerB,
      `insert into public.workspace_members (workspace_id, user_id, role) values ('${W.a}', '${U.ownerB}', 'owner')`);
    expect(wasBlocked(asEditor)).toBe(true);
    expect(wasBlocked(asOwner)).toBe(true);
  });

  it("let the creator of a new team workspace add only themselves as its owner", async () => {
    const [workspace, someoneElse, themselves, counter] = await db.asSteps("authenticated", U.ownerA, [
      `insert into public.workspaces (id, owner_id, brand_name, slug, account_type, storage_used_bytes)
       values ('${W.new}', '${U.ownerA}', 'Team', 'team-new', 'studio', -999999)`,
      `insert into public.workspace_members (workspace_id, user_id, role) values ('${W.new}', '${U.stranger}', 'owner')`,
      `insert into public.workspace_members (workspace_id, user_id, role) values ('${W.new}', '${U.ownerA}', 'owner')`,
      `select storage_used_bytes::int as n from public.workspaces where id = '${W.new}'`,
    ]);
    expect(workspace.error).toBeUndefined();
    expect(wasBlocked(someoneElse)).toBe(true);
    expect(themselves.error).toBeUndefined();
    expect(counter.rows[0].n).toBe(0);
  });

  it("don't let a workspace admin promote themselves, or demote or remove the owner", async () => {
    expect(wasBlocked(await as(U.adminA, `update public.workspace_members set role = 'owner' where ${member(U.adminA)}`))).toBe(true);
    expect(wasBlocked(await as(U.adminA, `update public.workspace_members set role = 'viewer' where ${member(U.ownerA)}`))).toBe(true);
    expect(wasBlocked(await as(U.adminA, `delete from public.workspace_members where ${member(U.ownerA)}`))).toBe(true);
    expect(wasBlocked(await as(U.adminA, `update public.workspaces set owner_id = '${U.adminA}' where id = '${W.a}'`))).toBe(true);
  });

  it("let admins manage non-owners, members leave, and nobody else remove members", async () => {
    expect(await as(U.adminA, `update public.workspace_members set role = 'editor' where ${member(U.viewerA)}`)).toMatchObject({ affected: 1 });
    expect(await as(U.adminA, `delete from public.workspace_members where ${member(U.viewerA)}`)).toMatchObject({ affected: 1 });
    expect(await as(U.viewerA, `delete from public.workspace_members where ${member(U.viewerA)}`)).toMatchObject({ affected: 1 });
    expect(wasBlocked(await as(U.viewerA, `delete from public.workspace_members where ${member(U.editorA)}`))).toBe(true);
    expect(wasBlocked(await as(U.editorA, `update public.workspace_members set role = 'admin' where ${member(U.editorA)}`))).toBe(true);
  });

  it("let the owner add a co-owner, but not remove or demote themselves", async () => {
    expect(await as(U.ownerA, `update public.workspace_members set role = 'owner' where ${member(U.adminA)}`)).toMatchObject({ affected: 1 });
    expect(wasBlocked(await as(U.ownerA, `update public.workspace_members set role = 'admin' where ${member(U.ownerA)}`))).toBe(true);
    expect(wasBlocked(await as(U.ownerA, `delete from public.workspace_members where ${member(U.ownerA)}`))).toBe(true);
  });

  it("let admins edit workspace settings, viewers and editors nothing, and only the owner delete it", async () => {
    expect(await as(U.adminA, `update public.workspaces set brand_name = 'A2' where id = '${W.a}'`)).toMatchObject({ affected: 1 });
    expect(wasBlocked(await as(U.editorA, `update public.workspaces set brand_name = 'x' where id = '${W.a}'`))).toBe(true);
    expect(wasBlocked(await as(U.viewerA, `update public.workspaces set brand_name = 'x' where id = '${W.a}'`))).toBe(true);
    expect(wasBlocked(await as(U.adminA, `delete from public.workspaces where id = '${W.a}'`))).toBe(true);
    expect(await as(U.ownerA, `delete from public.workspaces where id = '${W.a}'`)).toMatchObject({ affected: 1 });
  });
});

describe("invitations", () => {
  it("are visible only to the workspace's admins", async () => {
    expect(await user(U.adminA, "workspace_invitations")).toBe(1);
    expect(await user(U.editorA, "workspace_invitations")).toBe(0);
    expect(await user(U.viewerA, "workspace_invitations")).toBe(0);
    expect(await user(U.ownerB, "workspace_invitations")).toBe(0);
  });

  it("can be created only by admins, in their own name", async () => {
    const asEditor = await as(U.editorA, `insert into public.workspace_invitations (workspace_id, inviter_id, email, role)
      values ('${W.a}', '${U.editorA}', 'x@test', 'editor')`);
    const forged = await as(U.adminA, `insert into public.workspace_invitations (workspace_id, inviter_id, email, role)
      values ('${W.a}', '${U.ownerA}', 'x@test', 'editor')`);
    const ok = await as(U.adminA, `insert into public.workspace_invitations (workspace_id, inviter_id, email, role)
      values ('${W.a}', '${U.adminA}', 'x@test', 'viewer')`);
    expect(wasBlocked(asEditor)).toBe(true);
    expect(wasBlocked(forged)).toBe(true);
    expect(ok.error).toBeUndefined();
  });

  it("allow one pending invitation per email in a workspace", async () => {
    const duplicate = await db.as("service_role", null, `insert into public.workspace_invitations
      (workspace_id, inviter_id, email, role) values ('${W.a}', '${U.ownerA}', 'INVITEE@test', 'viewer')`);
    expect(duplicate.code).toBe("23505");
    const otherWorkspace = await db.as("service_role", null, `insert into public.workspace_invitations
      (workspace_id, inviter_id, email, role) values ('${W.b}', '${U.ownerB}', 'invitee@test', 'viewer')`);
    expect(otherWorkspace.error).toBeUndefined();
  });

  it("can't be redirected to another email or given a new token", async () => {
    expect(wasBlocked(await as(U.adminA, `update public.workspace_invitations set email = 'me@test' where id = '${INV.a}'`))).toBe(true);
    expect(wasBlocked(await as(U.adminA, `update public.workspace_invitations set token = 'known' where id = '${INV.a}'`))).toBe(true);
    expect(await as(U.adminA, `update public.workspace_invitations set status = 'revoked' where id = '${INV.a}'`)).toMatchObject({ affected: 1 });
  });
});

describe("sessions", () => {
  it("are visible only to their user, revoked ones included (sign-out enforcement reads them)", async () => {
    expect(await user(U.ownerA, "user_sessions", `user_id = '${U.ownerB}'`)).toBe(0);
    expect(await user(U.ownerA, "user_sessions", "is_revoked = false")).toBe(1);
    expect(await user(U.ownerA, "user_sessions", "is_revoked = true")).toBe(1);
  });

  it("can only be written by the server", async () => {
    const unrevoke = await as(U.ownerA, `update public.user_sessions set is_revoked = false where session_token_id = 'session-a-revoked'`);
    const insert = await as(U.ownerA, `insert into public.user_sessions (user_id, session_token_id) values ('${U.ownerA}', 'forged')`);
    const remove = await as(U.ownerA, `delete from public.user_sessions where user_id = '${U.ownerA}'`);
    expect(wasBlocked(unrevoke)).toBe(true);
    expect(wasBlocked(insert)).toBe(true);
    expect(wasBlocked(remove)).toBe(true);
  });
});

describe("public forms and logs", () => {
  it("store waitlist sign-ups through the server, and only platform admins read the list", async () => {
    const join = await db.as("service_role", null,
      `insert into public.waitlist_entries (email, referral_code) values ('new@test', 'REF-NEW')`);
    expect(join.error).toBeUndefined();
    expect(wasBlocked(await as(U.stranger,
      `insert into public.waitlist_entries (email, referral_code) values ('me@test', 'REF-ME')`))).toBe(true);
    expect(await user(U.ownerA, "waitlist_entries")).toBe(0);
    expect(await user(U.platformAdmin, "waitlist_entries")).toBe(1);
  });

  it("store inquiries through the server, readable only by the receiving workspace", async () => {
    const submit = await db.as("service_role", null,
      `insert into public.inquiries (type, name, email, message) values ('contact_message', 'Ann', 'ann@test', 'Hi')`);
    expect(submit.error).toBeUndefined();
    expect(wasBlocked(await as(U.stranger,
      `insert into public.inquiries (type, name, email, message) values ('contact_message', 'x', 'x@test', 'spam')`))).toBe(true);
    expect(await user(U.ownerA, "inquiries")).toBe(1);
    expect(await user(U.ownerB, "inquiries")).toBe(0);
  });

  it("keep notification logs inside the workspace", async () => {
    expect(await user(U.ownerB, "notification_logs")).toBe(0);
    expect(await user(U.ownerA, "notification_logs")).toBe(1);
  });
});

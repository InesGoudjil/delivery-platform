import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, wasBlocked, type ApiRole, type TestDatabase } from "./supabase-test-db";

/**
 * Who can access what, enforced by Postgres row-level security.
 *
 * The database is built from supabase/migrations and queried as the same API
 * roles the browser and server use (anon, authenticated, service_role), so a
 * policy regression fails here even though every unit test mocks the database.
 *
 * Tests marked `it.fails` document known gaps: they assert the intended rule
 * and currently fail. When a gap is fixed, the test starts passing, `it.fails`
 * then reports it, and the marker should be removed.
 */

const U = {
  ownerA: "00000000-0000-4000-8000-0000000000a1",
  viewerA: "00000000-0000-4000-8000-0000000000a2",
  adminA: "00000000-0000-4000-8000-0000000000a3",
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
};
const V = { a1: "50000000-0000-4000-8000-0000000000a1", b1: "50000000-0000-4000-8000-0000000000b1" };
const P = { a: "60000000-0000-4000-8000-00000000000a", b: "60000000-0000-4000-8000-00000000000b" };
const PLAN = "70000000-0000-4000-8000-000000000001";

const SEED = `
  set session_replication_role = replica; -- fixtures only: skip signup/storage triggers

  insert into auth.users (id, email) values
    ('${U.ownerA}', 'owner-a@test'), ('${U.viewerA}', 'viewer-a@test'), ('${U.adminA}', 'admin-a@test'),
    ('${U.ownerB}', 'owner-b@test'), ('${U.platformAdmin}', 'staff@test'), ('${U.stranger}', 'stranger@test');
  insert into public.user_profiles (id, platform_role) values
    ('${U.ownerA}', 'user'), ('${U.viewerA}', 'user'), ('${U.adminA}', 'user'),
    ('${U.ownerB}', 'user'), ('${U.platformAdmin}', 'admin'), ('${U.stranger}', 'user');

  insert into public.plans (id, name, slug, is_active) values ('${PLAN}', 'Starter', 'starter', true);

  insert into public.workspaces (id, owner_id, brand_name, slug) values
    ('${W.a}', '${U.ownerA}', 'Studio A', 'studio-a'), ('${W.b}', '${U.ownerB}', 'Studio B', 'studio-b');
  insert into public.workspace_members (workspace_id, user_id, role) values
    ('${W.a}', '${U.ownerA}', 'owner'), ('${W.a}', '${U.adminA}', 'admin'), ('${W.a}', '${U.viewerA}', 'viewer'),
    ('${W.b}', '${U.ownerB}', 'owner');
  insert into public.subscriptions (workspace_id, plan_id, status) values
    ('${W.a}', '${PLAN}', 'active'), ('${W.b}', '${PLAN}', 'active');
  insert into public.invoices (workspace_id, invoice_number, description) values
    ('${W.a}', 'INV-A-1', 'Studio plan'), ('${W.b}', 'INV-B-1', 'Studio plan');
  insert into public.workspace_features (workspace_id, features) values ('${W.a}', '{"storage_gb": 10}');

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
  insert into public.asset_versions (id, asset_id, version_number, raw_file_url) values
    ('${V.a1}', '${A.a1}', 1, 'private/workspaces/a/a1.mp4'), ('${V.b1}', '${A.b1}', 1, 'private/workspaces/b/b1.mp4');
  insert into public.feedback (asset_version_id, author_name, comment_text) values
    ('${V.a1}', 'Client A', 'Trim the intro'), ('${V.b1}', 'Client B', 'Looks great');
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

const anon = (table: string, where?: string) => countAs("anon", null, table, where);
const user = (userId: string, table: string, where?: string) => countAs("authenticated", userId, table, where);

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

describe("deliveries (share tokens, passcode hashes)", () => {
  it("are invisible to anonymous visitors", async () => {
    expect(await anon("deliveries")).toBe(0);
    const tokens = await db.as("anon", null, "select share_token, passcode_hash from public.deliveries");
    expect(tokens.rows).toEqual([]);
  });

  it("are invisible to signed-in users outside the workspace", async () => {
    expect(await user(U.stranger, "deliveries")).toBe(0);
    expect(await user(U.ownerB, "deliveries", `workspace_id = '${W.a}'`)).toBe(0);
  });

  it("are visible to every member of their workspace", async () => {
    expect(await user(U.ownerA, "deliveries")).toBe(1);
    expect(await user(U.viewerA, "deliveries")).toBe(1);
  });

  it("can't be edited or deleted from another workspace", async () => {
    const edit = await db.as("authenticated", U.ownerA, `update public.deliveries set passcode_hash = null where id = '${D.b}'`);
    const remove = await db.as("authenticated", U.ownerB, `delete from public.deliveries where id = '${D.a}'`);
    expect(wasBlocked(edit)).toBe(true);
    expect(wasBlocked(remove)).toBe(true);
  });

  it("can be edited by their workspace's owner", async () => {
    const edit = await db.as("authenticated", U.ownerA, `update public.deliveries set title = 'Renamed' where id = '${D.a}'`);
    expect(edit).toMatchObject({ affected: 1 });
  });

  it("don't leak through the deliveries summary view", async () => {
    expect(await anon("view_workspace_deliveries_summary")).toBe(0);
    expect(await user(U.ownerB, "view_workspace_deliveries_summary", `workspace_id = '${W.a}'`)).toBe(0);
  });

  it.fails("can't be deleted by a viewer (known gap: roles are only enforced in app code)", async () => {
    const remove = await db.as("authenticated", U.viewerA, `delete from public.deliveries where id = '${D.a}'`);
    expect(wasBlocked(remove)).toBe(true);
  });
});

describe("delivery content (assets, versions, comments, clients)", () => {
  it("is invisible to anonymous visitors", async () => {
    expect(await anon("assets")).toBe(0);
    expect(await anon("asset_versions")).toBe(0);
    expect(await anon("feedback")).toBe(0);
    expect(await anon("clients")).toBe(0);
  });

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
});

describe("portfolios and showcase projects", () => {
  it("show only published portfolios to anyone outside the workspace", async () => {
    expect(await anon("portfolios")).toBe(1);
    expect(await anon("portfolios", `id = '${PF.b}'`)).toBe(0);
    expect(await user(U.ownerA, "portfolios", `id = '${PF.b}'`)).toBe(0);
    expect(await user(U.ownerB, "portfolios", `id = '${PF.b}'`)).toBe(1);
  });

  it("keep showcase projects and their asset links private to the workspace", async () => {
    expect(await anon("projects")).toBe(0);
    expect(await anon("project_assets")).toBe(0);
    expect(await user(U.ownerA, "projects")).toBe(1);
    expect(await user(U.ownerA, "project_assets")).toBe(1);
    expect(await user(U.stranger, "projects")).toBe(0);
  });

  it("let platform admins read every showcase (admin dashboard)", async () => {
    expect(await user(U.platformAdmin, "projects")).toBe(2);
    expect(await user(U.platformAdmin, "project_assets")).toBe(2);
  });

  it("refuse anonymous writes", async () => {
    const insert = await db.as("anon", null,
      `insert into public.projects (workspace_id, portfolio_id, title) values ('${W.a}', '${PF.a}', 'spam')`);
    const remove = await db.as("anon", null, "delete from public.projects");
    expect(insert.error).toBeDefined();
    expect(wasBlocked(remove)).toBe(true);
  });

  it("let members create projects in their own portfolio, from their own deliveries", async () => {
    const insert = await db.as("authenticated", U.ownerA,
      `insert into public.projects (workspace_id, portfolio_id, title, source_delivery_id)
       values ('${W.a}', '${PF.a}', 'New showcase', '${D.a}')`);
    expect(insert.error).toBeUndefined();
  });

  it("never link a project to another workspace's portfolio, delivery or files", async () => {
    const foreignPortfolio = await db.as("authenticated", U.ownerA,
      `insert into public.projects (workspace_id, portfolio_id, title) values ('${W.a}', '${PF.b}', 'x')`);
    const foreignDelivery = await db.as("authenticated", U.ownerA,
      `update public.projects set source_delivery_id = '${D.b}' where id = '${P.a}'`);
    const foreignAsset = await db.as("authenticated", U.ownerA,
      `insert into public.project_assets (project_id, asset_id) values ('${P.a}', '${A.b1}')`);
    const foreignProject = await db.as("authenticated", U.ownerA,
      `insert into public.project_assets (project_id, asset_id) values ('${P.b}', '${A.a2}')`);
    expect(wasBlocked(foreignPortfolio)).toBe(true);
    expect(wasBlocked(foreignDelivery)).toBe(true);
    expect(wasBlocked(foreignAsset)).toBe(true);
    expect(wasBlocked(foreignProject)).toBe(true);
  });

  it("let members attach their own files (the app's upsert path)", async () => {
    const attach = await db.as("authenticated", U.ownerA,
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
    expect(await anon("invoices")).toBe(0);
  });

  it("don't let workspace owners change their own plan, invoices or limits", async () => {
    const plan = await db.as("authenticated", U.ownerA,
      `update public.subscriptions set status = 'active', plan_id = '${PLAN}' where workspace_id = '${W.a}'`);
    const invoice = await db.as("authenticated", U.ownerA,
      `insert into public.invoices (workspace_id, invoice_number, description) values ('${W.a}', 'FAKE', 'x')`);
    const limits = await db.as("authenticated", U.ownerA,
      `update public.workspace_features set features = '{"storage_gb": 100000}' where workspace_id = '${W.a}'`);
    const newLimits = await db.as("authenticated", U.ownerB,
      `insert into public.workspace_features (workspace_id, features) values ('${W.b}', '{"storage_gb": 100000}')`);
    expect(wasBlocked(plan)).toBe(true);
    expect(wasBlocked(invoice)).toBe(true);
    expect(wasBlocked(limits)).toBe(true);
    expect(wasBlocked(newLimits)).toBe(true);
  });

  it("let platform admins adjust plan overrides", async () => {
    const update = await db.as("authenticated", U.platformAdmin,
      `update public.workspace_features set features = '{"storage_gb": 50}' where workspace_id = '${W.a}'`);
    expect(update).toMatchObject({ affected: 1 });
  });

  it("keep the Stripe idempotency ledger service-role only", async () => {
    const asAnon = await db.as("anon", null, `insert into public.processed_billing_events (id, kind) values ('cs_1', 'x')`);
    const asUser = await db.as("authenticated", U.ownerA,
      `insert into public.processed_billing_events (id, kind) values ('cs_1', 'x')`);
    const [first, replay] = await db.asSteps("service_role", null, [
      `insert into public.processed_billing_events (id, workspace_id, kind) values ('cs_1', '${W.a}', 'checkout')`,
      `insert into public.processed_billing_events (id, workspace_id, kind) values ('cs_1', '${W.a}', 'checkout')`,
    ]);
    expect(asAnon.error).toBeDefined();
    expect(asUser.error).toBeDefined();
    expect(first.error).toBeUndefined();
    expect(replay.code).toBe("23505");
  });

  it("show active plans to everyone (pricing page)", async () => {
    expect(await anon("plans")).toBe(1);
  });
});

describe("accounts, members and sessions", () => {
  it("let users read only their own profile", async () => {
    expect(await user(U.ownerA, "user_profiles")).toBe(1);
    expect(await user(U.platformAdmin, "user_profiles")).toBe(6);
    expect(await anon("user_profiles")).toBe(0);
  });

  it("never let a user make themselves a platform admin", async () => {
    const escalate = await db.as("authenticated", U.stranger,
      `update public.user_profiles set platform_role = 'admin' where id = '${U.stranger}'`);
    expect(wasBlocked(escalate)).toBe(true);
  });

  it("hide a workspace's members from outsiders", async () => {
    expect(await user(U.ownerB, "workspace_members", `workspace_id = '${W.a}'`)).toBe(0);
    expect(await user(U.viewerA, "workspace_members", `workspace_id = '${W.a}'`)).toBe(3);
  });

  it("don't let anyone join a workspace on their own", async () => {
    const asEditor = await db.as("authenticated", U.stranger,
      `insert into public.workspace_members (workspace_id, user_id, role) values ('${W.a}', '${U.stranger}', 'editor')`);
    const asOwner = await db.as("authenticated", U.ownerB,
      `insert into public.workspace_members (workspace_id, user_id, role) values ('${W.a}', '${U.ownerB}', 'owner')`);
    expect(wasBlocked(asEditor)).toBe(true);
    expect(wasBlocked(asOwner)).toBe(true);
  });

  it("let the creator of a new team workspace add only themselves as its owner", async () => {
    const [workspace, someoneElse, themselves] = await db.asSteps("authenticated", U.ownerA, [
      `insert into public.workspaces (id, owner_id, brand_name, slug, account_type)
       values ('${W.new}', '${U.ownerA}', 'Team', 'team-new', 'studio')`,
      `insert into public.workspace_members (workspace_id, user_id, role) values ('${W.new}', '${U.stranger}', 'owner')`,
      `insert into public.workspace_members (workspace_id, user_id, role) values ('${W.new}', '${U.ownerA}', 'owner')`,
    ]);
    expect(workspace.error).toBeUndefined();
    expect(wasBlocked(someoneElse)).toBe(true);
    expect(themselves.error).toBeUndefined();
  });

  it.fails("don't let a workspace admin promote themselves to owner (known gap)", async () => {
    const promote = await db.as("authenticated", U.adminA,
      `update public.workspace_members set role = 'owner' where workspace_id = '${W.a}' and user_id = '${U.adminA}'`);
    expect(wasBlocked(promote)).toBe(true);
  });

  it("let users see only their own sessions", async () => {
    expect(await user(U.ownerA, "user_sessions", `user_id = '${U.ownerB}'`)).toBe(0);
    expect(await user(U.ownerA, "user_sessions", "is_revoked = false")).toBe(1);
    expect(await anon("user_sessions")).toBe(0);
  });

  it.fails("let users see their own revoked sessions, which sign-out enforcement needs (known gap)", async () => {
    expect(await user(U.ownerA, "user_sessions", "is_revoked = true")).toBe(1);
  });
});

describe("public forms and logs", () => {
  it("accept waitlist sign-ups without exposing the list", async () => {
    const join = await db.as("anon", null,
      `insert into public.waitlist_entries (email, referral_code) values ('new@test', 'REF-NEW')`);
    const skipQueue = await db.as("anon", null,
      `insert into public.waitlist_entries (email, referral_code, status) values ('vip@test', 'REF-VIP', 'invited')`);
    expect(join.error).toBeUndefined();
    expect(wasBlocked(skipQueue)).toBe(true);
    expect(await anon("waitlist_entries")).toBe(0);
    expect(await user(U.ownerA, "waitlist_entries")).toBe(0);
    expect(await user(U.platformAdmin, "waitlist_entries")).toBe(1);
  });

  it("accept contact and portfolio inquiries, readable only by the receiving workspace", async () => {
    const submit = await db.as("anon", null,
      `insert into public.inquiries (type, name, email, message) values ('contact_message', 'Ann', 'ann@test', 'Hi')`);
    expect(submit.error).toBeUndefined();
    expect(await anon("inquiries")).toBe(0);
    expect(await user(U.ownerA, "inquiries")).toBe(1);
    expect(await user(U.ownerB, "inquiries")).toBe(0);
  });

  it("keep notification logs inside the workspace", async () => {
    expect(await anon("notification_logs")).toBe(0);
    expect(await user(U.ownerB, "notification_logs")).toBe(0);
    expect(await user(U.ownerA, "notification_logs")).toBe(1);
  });
});

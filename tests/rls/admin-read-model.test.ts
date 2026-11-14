import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, type TestDatabase } from "./supabase-test-db";

/**
 * 20261113120000_admin_read_model_and_audit.sql: the admin panel's read model and audit log.
 * Both are service-role only. The app reaches them after requirePlatformAdmin() with MFA, so not
 * even a platform admin's own session may call them through the public API.
 */

const U = {
  admin: "00000000-0000-4000-8000-0000000000f1",
  ownerA: "00000000-0000-4000-8000-0000000000f2",
  ownerB: "00000000-0000-4000-8000-0000000000f3",
  editor: "00000000-0000-4000-8000-0000000000f4",
  banned: "00000000-0000-4000-8000-0000000000f5",
  gone: "00000000-0000-4000-8000-0000000000f6",
};

const W = {
  a: "10000000-0000-4000-8000-0000000000a1",
  b: "10000000-0000-4000-8000-0000000000b1",
  c: "10000000-0000-4000-8000-0000000000c1",
  d: "10000000-0000-4000-8000-0000000000d1",
  e: "10000000-0000-4000-8000-0000000000e1",
  f: "10000000-0000-4000-8000-0000000000f1",
  g: "10000000-0000-4000-8000-0000000000a7",
};

const P = {
  starter: "20000000-0000-4000-8000-000000000001",
  pro: "20000000-0000-4000-8000-000000000002",
  studioAnnual: "20000000-0000-4000-8000-000000000003",
  legacyUsd: "20000000-0000-4000-8000-000000000004",
};

const D = {
  a1: "30000000-0000-4000-8000-0000000000a1",
  a2: "30000000-0000-4000-8000-0000000000a2",
  a3: "30000000-0000-4000-8000-0000000000a3",
  b1: "30000000-0000-4000-8000-0000000000b1",
};

const GB = 1073741824;

const SEED = `
  set session_replication_role = replica;

  insert into auth.users (id, email, email_confirmed_at, last_sign_in_at, banned_until, deleted_at, created_at) values
    ('${U.admin}',  'admin@t',   now(), now(),                  null,                  null,  now() - interval '30 days'),
    ('${U.ownerA}', 'owner-a@t', now(), now() - interval '1 day', null,                null,  now() - interval '30 days'),
    ('${U.ownerB}', 'owner-b@t', null,  null,                   null,                  null,  now()),
    ('${U.editor}', 'editor@t',  now(), null,                   null,                  null,  now()),
    ('${U.banned}', 'banned@t',  now(), null,                   now() + interval '1 day', null, now()),
    ('${U.gone}',   'gone@t',    now(), null,                   null,                  now(), now());
  insert into auth.mfa_factors (user_id, status) values ('${U.admin}', 'verified'), ('${U.ownerA}', 'unverified');

  insert into public.user_profiles (id, full_name, platform_role) values
    ('${U.admin}', 'Platform Admin', 'admin'),
    ('${U.ownerA}', 'Amal Owner', 'user'),
    ('${U.ownerB}', 'Basil Owner', 'user'),
    ('${U.editor}', 'Eli Editor', 'user'),
    ('${U.banned}', null, 'user');

  insert into public.plans (id, name, slug, price_cents, currency, billing_interval, is_active, features) values
    ('${P.starter}', 'Starter', 'starter', 0, 'AED', 'month', true, '{"storage_gb": 2}'),
    ('${P.pro}', 'Pro', 'pro', 3900, 'AED', 'month', true, '{"storage_gb": 500}'),
    ('${P.studioAnnual}', 'Studio annual', 'studio-annual', 95000, 'AED', 'year', true, '{"storage_gb": 2048}'),
    ('${P.legacyUsd}', 'Legacy', 'legacy', 2900, 'USD', 'month', true, '{"storage_gb": 100}');

  insert into public.workspaces (id, owner_id, brand_name, slug, storage_used_bytes, created_at, updated_at) values
    ('${W.a}', '${U.ownerA}', 'Studio A', 'studio-a', ${5 * GB}, now() - interval '60 days', now() - interval '60 days'),
    ('${W.b}', '${U.ownerB}', 'Studio B', 'studio-b', 0, now() - interval '50 days', now() - interval '50 days'),
    ('${W.c}', '${U.admin}',  'Studio C', 'studio-c', 0, now() - interval '40 days', now() - interval '40 days'),
    ('${W.d}', '${U.ownerA}', 'Studio D', 'studio-d', 0, now() - interval '30 days', now() - interval '30 days'),
    ('${W.e}', '${U.editor}', 'Studio E', 'studio-e', 2040109466, now() - interval '20 days', now() - interval '20 days'),
    ('${W.f}', '${U.banned}', 'Studio F', 'studio-f', 0, now() - interval '10 days', now() - interval '10 days'),
    ('${W.g}', '${U.ownerB}', 'Studio G', 'studio-g', 0, now() - interval '1 day', now() - interval '1 day');

  insert into public.workspace_members (workspace_id, user_id, role) values
    ('${W.a}', '${U.ownerA}', 'owner'),
    ('${W.a}', '${U.editor}', 'editor'),
    ('${W.b}', '${U.ownerB}', 'owner');

  insert into public.subscriptions (workspace_id, plan_id, status, currency, trial_ends_at, payment_provider_sub_id) values
    ('${W.a}', '${P.pro}', 'active', 'AED', null, null),
    ('${W.b}', '${P.studioAnnual}', 'trialing', 'AED', now() + interval '2 days', null),
    ('${W.d}', '${P.studioAnnual}', 'active', 'AED', null, 'sub_stripe_d'),
    ('${W.e}', '${P.pro}', 'past_due', 'AED', null, null),
    ('${W.f}', '${P.pro}', 'active', 'AED', null, null),
    ('${W.g}', '${P.legacyUsd}', 'active', 'USD', null, null);

  insert into public.workspace_features (workspace_id, features) values
    ('${W.a}', '{"storage_gb": 1000}'),
    ('${W.f}', '{"storage_gb": "lots"}');

  insert into public.deliveries (id, workspace_id, title, share_token, status, approved_at, created_at, updated_at) values
    ('${D.a1}', '${W.a}', 'Wedding film', 'token-a1', 'in_review', null, now(), now()),
    ('${D.a2}', '${W.a}', 'Old reel', 'token-a2', 'archived', null, now() - interval '10 days', now() - interval '10 days'),
    ('${D.a3}', '${W.a}', 'Brand spot', 'token-a3', 'approved', now() - interval '1 day', now(), now()),
    ('${D.b1}', '${W.b}', 'Teaser', 'token-b1', 'in_review', null, now() - interval '40 days', now() - interval '40 days');

  insert into public.notification_logs (workspace_id, channel, status, recipient_email, created_at) values
    ('${W.a}', 'email', 'failed', 'client@t', now() - interval '1 hour'),
    ('${W.a}', 'email', 'failed', 'client@t', now() - interval '2 days'),
    ('${W.b}', 'whatsapp', 'sent', null, now());

  insert into public.comment_email_batches (delivery_id, workspace_id, send_at) values
    ('${D.a1}', '${W.a}', now() - interval '20 minutes'),
    ('${D.a3}', '${W.a}', now() + interval '5 minutes');

  insert into public.waitlist_entries (email, status, referral_code) values
    ('w1@t', 'pending', 'ref-1'),
    ('w2@t', 'pending', 'ref-2'),
    ('w3@t', 'invited', 'ref-3');

  set session_replication_role = origin;
`;

let db: TestDatabase;

beforeAll(async () => {
  db = await createTestDatabase();
  await db.owner(SEED);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

const service = (sql: string) => db.as("service_role", null, sql);

const workspaces = (args = "") =>
  `select slug, owner_email, plan_slug, subscription_status, effective_plan_slug, stripe_billed,
          storage_limit_gb::float8 as storage_limit_gb, storage_override_gb::float8 as storage_override_gb,
          deliveries_count, active_deliveries_count,
          members_count, has_overrides, total_count::int as total_count
   from public.admin_list_workspaces(${args})`;

const users = (args = "") =>
  `select email, platform_role, mfa_enabled, owned_workspaces, memberships, primary_workspace_slug,
          total_count::int as total_count
   from public.admin_list_users(${args})`;

describe("access", () => {
  const calls = [
    "select * from public.admin_workspace_overview()",
    "select * from public.admin_list_workspaces()",
    "select * from public.admin_list_users()",
    "select public.admin_platform_kpis()",
  ];

  it("is closed to signed-in users, platform admins included, and to anonymous visitors", async () => {
    for (const sql of calls) {
      expect((await db.as("authenticated", U.admin, sql)).error, sql).toMatch(/permission denied/);
      expect((await db.as("authenticated", U.ownerA, sql)).error, sql).toMatch(/permission denied/);
      expect((await db.as("anon", null, sql)).error, sql).toMatch(/permission denied/);
    }
  });

  it("keeps the audit log away from the public API", async () => {
    const insert = `insert into public.admin_audit_events (action, target_type) values ('user.change_role', 'user')`;
    for (const role of ["authenticated", "anon"] as const) {
      const userId = role === "anon" ? null : U.admin;
      expect((await db.as(role, userId, "select * from public.admin_audit_events")).error).toMatch(/permission denied/);
      expect((await db.as(role, userId, insert)).error).toMatch(/permission denied/);
    }
  });
});

describe("admin_list_workspaces", () => {
  it("lists every workspace with its owner's email, newest first", async () => {
    const { rows, error } = await service(workspaces());
    expect(error).toBeUndefined();
    expect(rows.map((r) => r.slug)).toEqual([
      "studio-g",
      "studio-f",
      "studio-e",
      "studio-d",
      "studio-c",
      "studio-b",
      "studio-a",
    ]);
    expect(rows.every((r) => r.total_count === 7)).toBe(true);
    expect(rows.find((r) => r.slug === "studio-b")?.owner_email).toBe("owner-b@t");
  });

  it("counts deliveries and members, and works out the effective plan and storage limit", async () => {
    const { rows } = await service(workspaces());
    const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));

    expect(bySlug["studio-a"]).toMatchObject({
      plan_slug: "pro",
      effective_plan_slug: "pro",
      storage_limit_gb: 1000, // the override wins
      storage_override_gb: 1000,
      deliveries_count: 3,
      active_deliveries_count: 2,
      members_count: 2,
      has_overrides: true,
    });
    // Billed through Stripe only when the subscription has a Stripe id.
    expect(rows.filter((r) => r.stripe_billed).map((r) => r.slug)).toEqual(["studio-d"]);
    // A trial counts as the subscribed plan, like SubscriptionService.getCurrentPlan().
    expect(bySlug["studio-b"]).toMatchObject({ effective_plan_slug: "studio-annual", storage_limit_gb: 2048 });
    // No subscription, or a past-due one, falls back to Starter.
    expect(bySlug["studio-c"]).toMatchObject({ plan_slug: null, subscription_status: null, effective_plan_slug: "starter", storage_limit_gb: 2 });
    expect(bySlug["studio-e"]).toMatchObject({ subscription_status: "past_due", effective_plan_slug: "starter", storage_limit_gb: 2 });
    // An override that isn't a number is ignored instead of breaking the list.
    expect(bySlug["studio-f"]).toMatchObject({ storage_limit_gb: 500, storage_override_gb: null, has_overrides: true });
  });

  it("searches the brand name, slug, owner email or exact id, treating % and _ literally", async () => {
    expect((await service(workspaces("p_search => 'OWNER-B@'"))).rows.map((r) => r.slug).sort()).toEqual([
      "studio-b",
      "studio-g",
    ]);
    expect((await service(workspaces(`p_search => '${W.d}'`))).rows.map((r) => r.slug)).toEqual(["studio-d"]);
    expect((await service(workspaces("p_search => 'studio-c'"))).rows.map((r) => r.slug)).toEqual(["studio-c"]);
    expect((await service(workspaces("p_search => '%'"))).rows).toEqual([]);
    expect((await service(workspaces("p_search => '_'"))).rows).toEqual([]);
  });

  it("filters by plan, subscription status and attention flags", async () => {
    const slugs = async (args: string) => (await service(workspaces(args))).rows.map((r) => r.slug).sort();
    expect(await slugs("p_plan => 'none'")).toEqual(["studio-c"]);
    expect(await slugs("p_plan => 'pro'")).toEqual(["studio-a", "studio-e", "studio-f"]);
    expect(await slugs("p_status => 'trialing'")).toEqual(["studio-b"]);
    expect(await slugs("p_status => 'none'")).toEqual(["studio-c"]);
    expect(await slugs("p_flag => 'trial_ending'")).toEqual(["studio-b"]);
    expect(await slugs("p_flag => 'storage_high'")).toEqual(["studio-e"]);
    expect(await slugs("p_flag => 'overrides'")).toEqual(["studio-a", "studio-f"]);
  });

  it("sorts by an allowed column and pages, with the total count of every match", async () => {
    const first = await service(workspaces("p_sort => 'brand_name', p_desc => false, p_limit => 2"));
    expect(first.rows.map((r) => r.slug)).toEqual(["studio-a", "studio-b"]);
    expect(first.rows[0].total_count).toBe(7);

    const last = await service(workspaces("p_sort => 'brand_name', p_desc => false, p_limit => 2, p_offset => 6"));
    expect(last.rows.map((r) => r.slug)).toEqual(["studio-g"]);

    const byDeliveries = await service(workspaces("p_sort => 'deliveries', p_limit => 1"));
    expect(byDeliveries.rows.map((r) => r.slug)).toEqual(["studio-a"]);

    // An unknown sort column is ignored, and the page size is capped at 100.
    const unknown = await service(workspaces("p_sort => 'owner_id; drop table public.workspaces', p_limit => 1000"));
    expect(unknown.error).toBeUndefined();
    expect(unknown.rows).toHaveLength(7);
  });
});

describe("admin_list_users", () => {
  it("lists users from Supabase Auth with their emails, leaving deleted accounts out", async () => {
    const { rows, error } = await service(users("p_sort => 'email', p_desc => false"));
    expect(error).toBeUndefined();
    expect(rows.map((r) => r.email)).toEqual(["admin@t", "banned@t", "editor@t", "owner-a@t", "owner-b@t"]);
    expect(rows[0].total_count).toBe(5);

    const ownerA = rows.find((r) => r.email === "owner-a@t");
    expect(ownerA).toMatchObject({
      platform_role: "user",
      mfa_enabled: false, // an unverified factor doesn't count
      owned_workspaces: 2,
      memberships: 1,
      primary_workspace_slug: "studio-a",
    });
    expect(rows.find((r) => r.email === "admin@t")).toMatchObject({ platform_role: "admin", mfa_enabled: true });
  });

  it("searches and filters", async () => {
    const emails = async (args: string) => (await service(users(args))).rows.map((r) => r.email).sort();
    expect(await emails("p_search => 'amal'")).toEqual(["owner-a@t"]);
    expect(await emails(`p_search => '${U.editor}'`)).toEqual(["editor@t"]);
    expect(await emails("p_role => 'admin'")).toEqual(["admin@t"]);
    expect(await emails("p_flag => 'unconfirmed'")).toEqual(["owner-b@t"]);
    expect(await emails("p_flag => 'banned'")).toEqual(["banned@t"]);
    expect(await emails("p_flag => 'no_mfa'")).toEqual(["banned@t", "editor@t", "owner-a@t", "owner-b@t"]);
  });
});

describe("admin_platform_kpis", () => {
  it("returns real counts, and list-price MRR per currency from active subscriptions only", async () => {
    const { rows, error } = await service("select public.admin_platform_kpis() as kpis");
    expect(error).toBeUndefined();
    const kpis = rows[0].kpis;

    expect(kpis).toMatchObject({
      workspaces: 7,
      users: 5,
      signups_7d: 3,
      subscriptions: { active: 4, trialing: 1, past_due: 1, canceled: 0, none: 1 },
      trials_ending_3d: 1,
      storage_used_bytes: 5 * GB + 2040109466,
      storage_provisioned_gb: 1000 + 2048 + 2 + 2048 + 2 + 500 + 100,
      storage_high: 1,
      deliveries: 4,
      deliveries_7d: 2,
      deliveries_30d: 3,
      approvals_7d: 1,
      notifications_failed_24h: 1,
      comment_batches_overdue: 1,
      waitlist_pending: 2,
    });
    // AED: Pro 39.00 twice, plus Studio annual 950.00 / 12; the trial and the past-due Pro don't count.
    expect(kpis.mrr).toEqual([
      { currency: "AED", amount_cents: 15717, subscriptions: 3 },
      { currency: "USD", amount_cents: 2900, subscriptions: 1 },
    ]);
  });
});

describe("admin_audit_events", () => {
  const insert = (action: string) =>
    `insert into public.admin_audit_events (actor_id, actor_email, action, target_type, target_id, reason, changes)
     values ('${U.admin}', 'admin@t', '${action}', 'workspace', '${W.a}', 'Customer asked for it',
             '{"before": {"storage_gb": 500}, "after": {"storage_gb": 1000}}')
     returning action, outcome`;

  it("accepts events from the service role, with dotted action names only", async () => {
    const ok = await service(insert("workspace.override_features"));
    expect(ok.error).toBeUndefined();
    expect(ok.rows).toEqual([{ action: "workspace.override_features", outcome: "succeeded" }]);

    expect((await service(insert("Delete Everything"))).error).toMatch(/check constraint/);
  });

  it("can't be changed or deleted, not even by the database owner", async () => {
    const steps = await db.asSteps("service_role", null, [
      insert("user.change_role"),
      "update public.admin_audit_events set reason = 'edited'",
      "delete from public.admin_audit_events",
    ]);
    expect(steps[0].error).toBeUndefined();
    expect(steps[1].error).toMatch(/permission denied/);
    expect(steps[2].error).toMatch(/permission denied/);

    await db.owner(`
      insert into public.admin_audit_events (action, target_type) values ('plan.update', 'plan');
    `);
    await expect(db.owner("update public.admin_audit_events set reason = 'edited'")).rejects.toThrow(/append-only/);
    await expect(db.owner("delete from public.admin_audit_events")).rejects.toThrow(/append-only/);
    await expect(db.owner("truncate public.admin_audit_events")).rejects.toThrow(/append-only/);
  });
});

describe("docs/admin-panel.md: making the first admin", () => {
  const promote = (userId: string, role: "admin" | "user") => `
    begin;
    alter table public.user_profiles disable trigger trg_prevent_role_escalation;
    update public.user_profiles set platform_role = '${role}' where id = '${userId}';
    alter table public.user_profiles enable trigger trg_prevent_role_escalation;
    commit;
  `;
  const roleOf = async (userId: string) =>
    (await db.owner(`select platform_role from public.user_profiles where id = '${userId}'`))[0]?.platform_role;

  it("is refused as a plain update, even for the database owner, and works with the documented SQL", async () => {
    await expect(
      db.owner(`update public.user_profiles set platform_role = 'admin' where id = '${U.ownerB}'`)
    ).rejects.toThrow(/Only platform administrators/);

    await db.owner(promote(U.ownerB, "admin"));
    expect(await roleOf(U.ownerB)).toBe("admin");

    // The trigger is back on afterwards.
    await expect(
      db.owner(`update public.user_profiles set platform_role = 'user' where id = '${U.ownerB}'`)
    ).rejects.toThrow(/Only platform administrators/);

    await db.owner(promote(U.ownerB, "user"));
    expect(await roleOf(U.ownerB)).toBe("user");
  });
});

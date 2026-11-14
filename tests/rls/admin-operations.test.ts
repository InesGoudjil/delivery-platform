import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, type TestDatabase } from "./supabase-test-db";

/**
 * 20261113130000_admin_operations.sql: ending every login of a user, scheduler heartbeats, and
 * the dashboard's daily trends and MRR per plan. Service role only.
 */

const U = {
  alice: "00000000-0000-4000-8000-0000000000c1",
  bob: "00000000-0000-4000-8000-0000000000c2",
  gone: "00000000-0000-4000-8000-0000000000c3",
};
const S = {
  aliceLaptop: "a0000000-0000-4000-8000-0000000000c1",
  alicePhone: "a0000000-0000-4000-8000-0000000000c2",
  bob: "b0000000-0000-4000-8000-0000000000c1",
};
const W = { a: "10000000-0000-4000-8000-0000000000c1", b: "10000000-0000-4000-8000-0000000000c2" };
const P = {
  monthly: "20000000-0000-4000-8000-0000000000c1",
  annual: "20000000-0000-4000-8000-0000000000c2",
};

const AUTH_TABLES = `
  create table auth.sessions (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz default now()
  );
  create table auth.refresh_tokens (
    id bigserial primary key,
    token text,
    session_id uuid references auth.sessions(id) on delete cascade
  );
  grant select on auth.sessions, auth.refresh_tokens to service_role;
`;

// Days are counted in UTC; "today" is the current UTC day.
const SEED = `
  set session_replication_role = replica;
  insert into auth.users (id, email, created_at, deleted_at) values
    ('${U.alice}', 'alice@t', now(), null),
    ('${U.bob}', 'bob@t', now() - interval '2 days', null),
    ('${U.gone}', 'gone@t', now(), now());
  insert into public.user_profiles (id, platform_role) values ('${U.alice}', 'user'), ('${U.bob}', 'user');
  insert into public.workspaces (id, owner_id, brand_name, slug, created_at) values
    ('${W.a}', '${U.alice}', 'Studio A', 'studio-a', now()),
    ('${W.b}', '${U.bob}', 'Studio B', 'studio-b', now() - interval '2 days');
  insert into public.deliveries (workspace_id, title, share_token, created_at, approved_at) values
    ('${W.a}', 'One', 'tok-1', now(), now()),
    ('${W.a}', 'Two', 'tok-2', now(), null),
    ('${W.b}', 'Old', 'tok-3', now() - interval '200 days', now() - interval '2 days');
  insert into public.plans (id, name, slug, price_cents, currency, billing_interval, features) values
    ('${P.monthly}', 'Pro', 'pro', 3900, 'AED', 'month', '{}'),
    ('${P.annual}', 'Studio annual', 'studio-annual', 95000, 'AED', 'year', '{}');
  insert into public.subscriptions (workspace_id, plan_id, status) values
    ('${W.a}', '${P.monthly}', 'active'),
    ('${W.b}', '${P.annual}', 'active');
  set session_replication_role = origin;

  insert into auth.sessions (id, user_id) values
    ('${S.aliceLaptop}', '${U.alice}'), ('${S.alicePhone}', '${U.alice}'), ('${S.bob}', '${U.bob}');
  insert into auth.refresh_tokens (token, session_id) values
    ('laptop-1', '${S.aliceLaptop}'), ('phone-1', '${S.alicePhone}'), ('bob-1', '${S.bob}');
`;

let db: TestDatabase;

beforeAll(async () => {
  db = await createTestDatabase();
  await db.owner(AUTH_TABLES);
  await db.owner(SEED);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

const service = (sql: string) => db.as("service_role", null, sql);

describe("access", () => {
  it("is closed to signed-in users and anonymous visitors", async () => {
    const calls = [
      `select public.admin_end_all_auth_sessions('${U.alice}')`,
      "select * from public.admin_daily_series(30)",
      "select * from public.admin_mrr_by_plan()",
      "select * from public.system_heartbeats",
      "insert into public.system_heartbeats (name) values ('notifications')",
    ];
    for (const sql of calls) {
      expect((await db.as("authenticated", U.alice, sql)).error, sql).toMatch(/permission denied/);
      expect((await db.as("anon", null, sql)).error, sql).toMatch(/permission denied/);
    }
  });
});

describe("admin_end_all_auth_sessions", () => {
  it("ends every login of that user, with their refresh tokens, and no one else's", async () => {
    const steps = await db.asSteps("service_role", null, [
      `select public.admin_end_all_auth_sessions('${U.alice}') as ended`,
      "select id from auth.sessions order by id",
      "select token from auth.refresh_tokens order by token",
    ]);
    expect(steps[0].error).toBeUndefined();
    expect(steps[0].rows[0].ended).toBe(2);
    expect(steps[1].rows.map((row) => row.id)).toEqual([S.bob]);
    expect(steps[2].rows.map((row) => row.token)).toEqual(["bob-1"]);
  });

  it("needs a user id", async () => {
    expect((await service("select public.admin_end_all_auth_sessions(null)")).error).toMatch(/needs a user id/);
  });
});

describe("system_heartbeats", () => {
  it("lets the service role record a run and read it back", async () => {
    const steps = await db.asSteps("service_role", null, [
      `insert into public.system_heartbeats (name, last_started_at, last_status)
       values ('notifications', now(), 'running')
       on conflict (name) do update set last_started_at = excluded.last_started_at, last_status = excluded.last_status`,
      `update public.system_heartbeats set last_finished_at = now(), last_status = 'ok' where name = 'notifications'`,
      "select name, last_status from public.system_heartbeats",
    ]);
    expect(steps.map((step) => step.error)).toEqual([undefined, undefined, undefined]);
    expect(steps[2].rows).toEqual([{ name: "notifications", last_status: "ok" }]);
  });

  it("only accepts known statuses", async () => {
    const outcome = await service("insert into public.system_heartbeats (name, last_status) values ('x', 'maybe')");
    expect(outcome.error).toMatch(/check constraint/);
  });
});

describe("admin_daily_series", () => {
  it("returns one row per day, oldest first, with zeros for quiet days", async () => {
    const { rows, error } = await service(
      "select day::text as day, signups, workspaces, deliveries, approvals from public.admin_daily_series(7)"
    );
    expect(error).toBeUndefined();
    expect(rows).toHaveLength(7);
    const today = rows[6];
    const twoDaysAgo = rows[4];
    // Deleted accounts don't count; the 200-day-old delivery is outside the range.
    expect(today).toMatchObject({ signups: 1, workspaces: 1, deliveries: 2, approvals: 1 });
    expect(twoDaysAgo).toMatchObject({ signups: 1, workspaces: 1, deliveries: 0, approvals: 1 });
    expect(rows[0]).toMatchObject({ signups: 0, workspaces: 0, deliveries: 0, approvals: 0 });
  });

  it("keeps the range between 1 and 366 days", async () => {
    expect((await service("select count(*)::int as n from public.admin_daily_series(5000)")).rows[0].n).toBe(366);
    expect((await service("select count(*)::int as n from public.admin_daily_series(0)")).rows[0].n).toBe(1);
  });
});

describe("admin_mrr_by_plan", () => {
  it("gives list-price MRR per plan from active subscriptions, annual prices divided by 12", async () => {
    const { rows, error } = await service(
      "select plan_slug, currency, amount_cents::int as amount_cents, subscriptions from public.admin_mrr_by_plan()"
    );
    expect(error).toBeUndefined();
    expect(rows).toEqual([
      { plan_slug: "studio-annual", currency: "AED", amount_cents: 7917, subscriptions: 1 },
      { plan_slug: "pro", currency: "AED", amount_cents: 3900, subscriptions: 1 },
    ]);
  });
});

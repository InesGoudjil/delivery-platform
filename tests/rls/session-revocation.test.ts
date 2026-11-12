import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MIGRATIONS_DIR, createTestDatabase, shimForPglite, type QueryOutcome, type TestDatabase } from "./supabase-test-db";

/**
 * Ending a device's Supabase login (20261111120600_session_revocation.sql).
 *
 * public.revoke_auth_session deletes one login (auth.sessions row, refresh tokens with it) of one
 * user. Only the server calls it, with the service role, after checking that the login belongs
 * to the signed-in caller; no API user can call it, so nobody can sign anyone else out.
 *
 * The test bootstrap has no auth.sessions (Supabase Auth owns it), so this file adds the columns
 * the function touches, with Supabase Auth's ON DELETE CASCADE from refresh tokens to sessions.
 */

const U = {
  alice: "00000000-0000-4000-8000-0000000005a1",
  bob: "00000000-0000-4000-8000-0000000005b1",
};
const S = {
  aliceLaptop: "a0000000-0000-4000-8000-0000000000a1",
  alicePhone: "a0000000-0000-4000-8000-0000000000a2",
  bob: "b0000000-0000-4000-8000-0000000000b1",
};
const MIGRATION = "20261111120600_session_revocation.sql";

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
  -- Only so the tests can look at the outcome inside the same (rolled-back) transaction.
  grant select on auth.sessions, auth.refresh_tokens to service_role;
`;

const SEED = `
  set session_replication_role = replica; -- fixtures only: skip signup triggers
  insert into auth.users (id, email) values ('${U.alice}', 'alice@test'), ('${U.bob}', 'bob@test');
  set session_replication_role = origin;

  insert into auth.sessions (id, user_id) values
    ('${S.aliceLaptop}', '${U.alice}'), ('${S.alicePhone}', '${U.alice}'), ('${S.bob}', '${U.bob}');
  insert into auth.refresh_tokens (token, session_id) values
    ('laptop-1', '${S.aliceLaptop}'), ('laptop-2', '${S.aliceLaptop}'), ('phone-1', '${S.alicePhone}'), ('bob-1', '${S.bob}');
`;

let db: TestDatabase;

const revoke = (userId: string, sessionId: string) =>
  `select public.revoke_auth_session('${userId}', '${sessionId}') as ended`;
const isPermissionDenied = (outcome: QueryOutcome) => /permission denied/i.test(outcome.error ?? "");

beforeAll(async () => {
  db = await createTestDatabase();
  await db.owner(AUTH_TABLES + SEED);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

describe("revoke_auth_session", () => {
  it("can't be called from the API, not even for the caller's own login", async () => {
    expect(isPermissionDenied(await db.as("anon", null, revoke(U.alice, S.aliceLaptop)))).toBe(true);
    expect(isPermissionDenied(await db.as("authenticated", U.alice, revoke(U.alice, S.aliceLaptop)))).toBe(true);
    expect(isPermissionDenied(await db.as("authenticated", U.bob, revoke(U.alice, S.aliceLaptop)))).toBe(true);
  });

  it("ends one login of the user for the server, refresh tokens included", async () => {
    const [call, sessions, tokens] = await db.asSteps("service_role", null, [
      revoke(U.alice, S.aliceLaptop),
      `select id from auth.sessions order by id`,
      `select token from auth.refresh_tokens order by token`,
    ]);

    expect(call.error).toBeUndefined();
    expect(sessions.error).toBeUndefined();
    expect(call.rows).toEqual([{ ended: true }]);
    expect(sessions.rows.map((r) => r.id)).toEqual([S.alicePhone, S.bob]);
    expect(tokens.rows.map((r) => r.token)).toEqual(["bob-1", "phone-1"]);
  });

  it("never ends another user's login, even with the right session id", async () => {
    const [call, bobSession] = await db.asSteps("service_role", null, [
      revoke(U.alice, S.bob),
      `select count(*)::int as n from auth.sessions where id = '${S.bob}'`,
    ]);

    expect(call.rows).toEqual([{ ended: false }]);
    expect(bobSession.rows[0].n).toBe(1);
  });

  it("answers false for a login that's already gone, and refuses missing ids", async () => {
    const [first, second] = await db.asSteps("service_role", null, [
      revoke(U.alice, S.alicePhone),
      revoke(U.alice, S.alicePhone),
    ]);
    expect(first.rows).toEqual([{ ended: true }]);
    expect(second.rows).toEqual([{ ended: false }]);

    const missing = await db.as("service_role", null, `select public.revoke_auth_session(null, '${S.bob}')`);
    expect(missing.error).toMatch(/needs a user id and a session id/);
  });

  it("runs as its owner with a fixed, empty search_path", async () => {
    const [fn] = await db.owner(`
      select prosecdef, proconfig, pg_get_userbyid(proowner) as owner
      from pg_proc where oid = 'public.revoke_auth_session(uuid, uuid)'::regprocedure`);
    expect(fn.prosecdef).toBe(true);
    expect(fn.proconfig).toEqual(['search_path=""']);
    expect(fn.owner).toBe("postgres");
  });
});

describe("the migration's clean-up of rows keyed on the old cookie ids", () => {
  it("drops active rows with no live login of their user, keeps revoked rows, and can run again", async () => {
    await db.owner(`
      insert into public.user_sessions (user_id, session_token_id, is_revoked) values
        ('${U.alice}', '${S.aliceLaptop}', false),                    -- a live login: kept
        ('${U.alice}', 'c0ffee00-0000-4000-8000-00000000c00c', false), -- old cookie id: dropped
        ('${U.alice}', '${S.bob}', false),                            -- someone else's login: dropped
        ('${U.alice}', 'c0ffee00-0000-4000-8000-00000000dead', true), -- revoked: kept
        ('${U.bob}', '${S.bob}x', false);                             -- not even a uuid: dropped
    `);

    await db.owner(shimForPglite(readFileSync(join(MIGRATIONS_DIR, MIGRATION), "utf8")));

    const rows = await db.owner(`select session_token_id, is_revoked from public.user_sessions order by session_token_id`);
    expect(rows).toEqual([
      { session_token_id: S.aliceLaptop, is_revoked: false },
      { session_token_id: "c0ffee00-0000-4000-8000-00000000dead", is_revoked: true },
    ]);
  });
});

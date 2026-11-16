import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, type QueryOutcome, type TestDatabase } from "./supabase-test-db";

/**
 * Two-factor sign-in in the database (20261116150000_two_factor_sign_in.sql).
 *
 * - The access-token hook adds `mfa_enrolled` to tokens.
 * - A restrictive policy on every table refuses a token that says mfa_enrolled = true until the
 *   session is aal2.
 * - Tokens without the claim (hook off) are unaffected.
 * - user_sessions stays readable, so the middleware can enforce device sign-out while the user is on /mfa.
 */

const U = {
  ann: "00000000-0000-4000-8000-0000000002f1",
  ben: "00000000-0000-4000-8000-0000000002f2",
};
const LOGIN = "a0000000-0000-4000-8000-0000000002f1";
const POLICY = "Two-factor sign-in finished";

const SEED = `
  set session_replication_role = replica; -- fixtures only: skip signup triggers
  insert into auth.users (id, email) values ('${U.ann}', 'ann@test'), ('${U.ben}', 'ben@test');
  set session_replication_role = origin;

  insert into public.user_profiles (id, full_name) values ('${U.ann}', 'Ann'), ('${U.ben}', 'Ben');
  insert into public.user_sessions (user_id, session_token_id) values ('${U.ann}', '${LOGIN}');
  insert into auth.mfa_factors (user_id, status) values ('${U.ann}', 'verified'), ('${U.ben}', 'unverified');
`;

let db: TestDatabase;

beforeAll(async () => {
  db = await createTestDatabase();
  await db.owner(SEED);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

/** Runs `sql` as a signed-in user whose token carries `claims`. */
async function withClaims(userId: string, claims: Record<string, unknown> | null, sql: string): Promise<QueryOutcome> {
  const setClaims = `select set_config('request.jwt.claims', '${JSON.stringify({ sub: userId, role: "authenticated", ...claims })}', true)`;
  const [, outcome] = await db.asSteps("authenticated", userId, [claims ? setClaims : "select 1", sql]);
  return outcome;
}

const ownProfile = (userId: string) => `select id from public.user_profiles where id = '${userId}'`;

describe("custom_access_token_hook", () => {
  const hook = async (userId: string) => {
    const [row] = await db.owner(
      `select public.custom_access_token_hook('{"user_id": "${userId}", "claims": {"sub": "${userId}", "aal": "aal1", "role": "authenticated"}}'::jsonb) as out`
    );
    return row.out.claims as Record<string, unknown>;
  };

  it("adds mfa_enrolled from verified factors only, and keeps the other claims", async () => {
    expect(await hook(U.ann)).toEqual({ sub: U.ann, aal: "aal1", role: "authenticated", mfa_enrolled: true });
    expect((await hook(U.ben)).mfa_enrolled).toBe(false); // unverified factor
  });

  it("can only be called by Supabase Auth's role", async () => {
    const [row] = await db.owner(`
      select
        has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'EXECUTE') as auth_admin,
        has_function_privilege('authenticated', 'public.custom_access_token_hook(jsonb)', 'EXECUTE') as authenticated,
        has_function_privilege('anon', 'public.custom_access_token_hook(jsonb)', 'EXECUTE') as anon`);
    expect(row).toEqual({ auth_admin: true, authenticated: false, anon: false });
  });
});

describe("restrictive two-factor policy", () => {
  it("hides a user's rows from their aal1 session once their token says they have an authenticator", async () => {
    expect((await withClaims(U.ann, { aal: "aal1", mfa_enrolled: true }, ownProfile(U.ann))).rows).toEqual([]);
  });

  it("shows them again at aal2", async () => {
    expect((await withClaims(U.ann, { aal: "aal2", mfa_enrolled: true }, ownProfile(U.ann))).rows).toHaveLength(1);
  });

  it("changes nothing for users without an authenticator, or for tokens without the claim (hook off)", async () => {
    expect((await withClaims(U.ben, { aal: "aal1", mfa_enrolled: false }, ownProfile(U.ben))).rows).toHaveLength(1);
    expect((await withClaims(U.ann, { aal: "aal1" }, ownProfile(U.ann))).rows).toHaveLength(1);
    expect((await db.as("authenticated", U.ann, ownProfile(U.ann))).rows).toHaveLength(1);
  });

  it("blocks writes from an aal1 session awaiting its code", async () => {
    const update = `update public.user_profiles set full_name = 'Changed' where id = '${U.ann}'`;
    expect((await withClaims(U.ann, { aal: "aal1", mfa_enrolled: true }, update)).affected).toBe(0);
    expect((await withClaims(U.ann, { aal: "aal2", mfa_enrolled: true }, update)).affected).toBe(1);
  });

  it("leaves the caller's device rows readable, for the middleware's sign-out check", async () => {
    const rows = await withClaims(
      U.ann,
      { aal: "aal1", mfa_enrolled: true },
      `select session_token_id from public.user_sessions where user_id = '${U.ann}'`
    );
    expect(rows.rows).toEqual([{ session_token_id: LOGIN }]);
  });

  it("is on every table with RLS except user_sessions (add it to new tables)", async () => {
    const missing = await db.owner(`
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
        and c.relname <> 'user_sessions'
        and not exists (
          select 1 from pg_policies p
          where p.schemaname = 'public' and p.tablename = c.relname
            and p.policyname = '${POLICY}' and p.permissive = 'RESTRICTIVE'
        )
      order by 1`);
    expect(missing.map((row) => row.relname)).toEqual([]);
  });
});

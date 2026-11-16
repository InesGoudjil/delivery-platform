import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, type QueryOutcome, type TestDatabase } from "./supabase-test-db";

/**
 * Account settings (20261116170000_account_settings.sql):
 * - auth_user_has_password() tells Google-only accounts apart, for the server only;
 * - the Terms acceptance columns on user_profiles are written by the server only.
 */

const U = {
  withPassword: "00000000-0000-4000-8000-0000000003a1",
  googleOnly: "00000000-0000-4000-8000-0000000003a2",
};

const SEED = `
  set session_replication_role = replica; -- fixtures only: skip signup triggers
  insert into auth.users (id, email, encrypted_password) values
    ('${U.withPassword}', 'pw@test', '$2a$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu'),
    ('${U.googleOnly}', 'google@test', '');
  set session_replication_role = origin;

  insert into public.user_profiles (id, full_name) values ('${U.withPassword}', 'Pat'), ('${U.googleOnly}', 'Gia');
`;

let db: TestDatabase;

beforeAll(async () => {
  db = await createTestDatabase();
  await db.owner(SEED);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

const isPermissionDenied = (outcome: QueryOutcome) => /permission denied|insufficient|server only/i.test(outcome.error ?? "");

describe("auth_user_has_password", () => {
  it("is true only for accounts with a password hash", async () => {
    const check = (id: string) => db.as("service_role", null, `select public.auth_user_has_password('${id}') as has`);
    expect((await check(U.withPassword)).rows[0].has).toBe(true);
    expect((await check(U.googleOnly)).rows[0].has).toBe(false);
    expect((await check("00000000-0000-4000-8000-000000000000")).rows[0].has).toBe(false);
  });

  it("can't be called from the API", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      const outcome = await db.as(role, U.withPassword, `select public.auth_user_has_password('${U.withPassword}')`);
      expect(isPermissionDenied(outcome), role).toBe(true);
    }
  });
});

describe("terms acceptance columns", () => {
  const accept = (id: string) =>
    `update public.user_profiles set terms_version = '2026-06-12', terms_accepted_at = now() where id = '${id}'`;

  it("can't be written by users, even on their own profile", async () => {
    const outcome = await db.as("authenticated", U.withPassword, accept(U.withPassword));
    expect(outcome.error).toMatch(/recorded by the server only/);
  });

  it("leave users' other profile edits alone", async () => {
    const outcome = await db.as(
      "authenticated",
      U.withPassword,
      `update public.user_profiles set full_name = 'Patricia' where id = '${U.withPassword}'`
    );
    expect(outcome.error).toBeUndefined();
    expect(outcome.affected).toBe(1);
  });

  it("are written by the server (service role)", async () => {
    const [, row] = await db.asSteps("service_role", null, [
      accept(U.googleOnly),
      `select terms_version from public.user_profiles where id = '${U.googleOnly}'`,
    ]);
    expect(row.rows[0].terms_version).toBe("2026-06-12");
  });
});

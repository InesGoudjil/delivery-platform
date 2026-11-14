import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

/**
 * In-memory Postgres (PGlite) built from supabase/migrations, for testing
 * row-level security exactly as the Supabase API roles see it.
 *
 * Building from the migrations folder is itself a test: if the migrations can
 * no longer rebuild the database, every RLS test fails at setup.
 */

export const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/** What a Supabase project provides before any migration runs. */
const SUPABASE_BOOTSTRAP = `
  create schema if not exists extensions;
  create schema if not exists auth;
  create schema if not exists vault;

  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;
  grant usage on schema public, auth, extensions to anon, authenticated, service_role;

  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    email_confirmed_at timestamptz,
    last_sign_in_at timestamptz,
    banned_until timestamptz,
    deleted_at timestamptz,
    created_at timestamptz default now()
  );

  -- Supabase types factor_type and status as enums; text compares the same way.
  create table auth.mfa_factors (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    friendly_name text,
    factor_type text not null default 'totp',
    status text not null default 'unverified',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create or replace function auth.role() returns text language sql stable as $$
    select nullif(current_setting('request.jwt.claim.role', true), '')
  $$;
  create or replace function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
`;

/**
 * Drops statements PGlite can't run. They are Supabase-managed and don't
 * affect access control: two hosted extensions and the realtime publication.
 */
export function shimForPglite(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !/CREATE EXTENSION IF NOT EXISTS "(pg_stat_statements|supabase_vault)"/i.test(line))
    .filter((line) => !/PUBLICATION "?supabase_realtime"?/i.test(line))
    .join("\n");
}

export type ApiRole = "anon" | "authenticated" | "service_role";

export interface QueryOutcome {
  rows: Record<string, any>[];
  /** Rows inserted/updated/deleted. */
  affected: number;
  error?: string;
  code?: string;
}

export interface TestDatabase {
  migrations: string[];
  /**
   * Runs one statement as a Supabase API role, with `auth.uid()` returning
   * `userId`, inside a transaction that is always rolled back, so tests never
   * change the fixtures. Errors (RLS violations, permission denied) are
   * returned, not thrown.
   */
  as(role: ApiRole, userId: string | null, sql: string): Promise<QueryOutcome>;
  /** Like `as`, for several statements that must share one transaction. */
  asSteps(role: ApiRole, userId: string | null, statements: string[]): Promise<QueryOutcome[]>;
  /** Runs SQL as the database owner, bypassing RLS. Persists. For fixtures only. */
  owner(sql: string): Promise<Record<string, any>[]>;
  close(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const db = await PGlite.create({ extensions: { pgcrypto, uuid_ossp } });
  await db.exec(SUPABASE_BOOTSTRAP);

  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrations) {
    try {
      await db.exec(shimForPglite(readFileSync(join(MIGRATIONS_DIR, file), "utf8")));
    } catch (err) {
      throw new Error(`Migration ${file} failed to apply: ${(err as Error).message}`);
    }
  }

  // The baseline (a pg_dump) clears search_path and turns row_security off for
  // the session; restore normal settings so RLS applies to the API roles.
  await db.exec(`
    set row_security = on;
    select pg_catalog.set_config('search_path', 'public, extensions', false);
  `);

  async function runAs(role: ApiRole, userId: string | null, statements: string[]) {
    await db.exec("reset role; begin");
    try {
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
      await db.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
      await db.exec(`set local role ${role}`);

      const outcomes: QueryOutcome[] = [];
      for (const [index, sql] of statements.entries()) {
        await db.exec(`savepoint step_${index}`);
        try {
          const res = await db.query(sql);
          outcomes.push({ rows: res.rows as Record<string, any>[], affected: res.affectedRows ?? 0 });
          await db.exec(`release savepoint step_${index}`);
        } catch (err: any) {
          outcomes.push({ rows: [], affected: 0, error: err.message, code: err.code });
          await db.exec(`rollback to savepoint step_${index}`);
        }
      }
      return outcomes;
    } finally {
      await db.exec("rollback");
    }
  }

  return {
    migrations,
    async as(role, userId, sql) {
      const [outcome] = await runAs(role, userId, [sql]);
      return outcome;
    },
    asSteps(role, userId, statements) {
      return runAs(role, userId, statements);
    },
    async owner(sql) {
      await db.exec("reset role");
      const results = await db.exec(sql);
      return (results.at(-1)?.rows ?? []) as Record<string, any>[];
    },
    async close() {
      await db.close();
    },
  };
}

/** True when a write was refused: an error, or no rows affected. */
export function wasBlocked(outcome: QueryOutcome): boolean {
  return Boolean(outcome.error) || outcome.affected === 0;
}

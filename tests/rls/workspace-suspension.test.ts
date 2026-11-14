import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, type TestDatabase } from "./supabase-test-db";

/**
 * 20261113140000_workspace_suspension.sql: only the server (platform admins) suspends a
 * workspace; the admin read model shows and filters suspended workspaces.
 */

const U = {
  owner: "00000000-0000-4000-8000-0000000000d1",
  other: "00000000-0000-4000-8000-0000000000d2",
};
const W = {
  open: "10000000-0000-4000-8000-0000000000d1",
  suspended: "10000000-0000-4000-8000-0000000000d2",
};

const SEED = `
  set session_replication_role = replica;
  insert into auth.users (id, email) values ('${U.owner}', 'owner@t'), ('${U.other}', 'other@t');
  insert into public.user_profiles (id, platform_role) values ('${U.owner}', 'user'), ('${U.other}', 'user');
  insert into public.workspaces (id, owner_id, brand_name, slug, suspended_at, suspended_reason) values
    ('${W.open}', '${U.owner}', 'Open Studio', 'open-studio', null, null),
    ('${W.suspended}', '${U.owner}', 'Closed Studio', 'closed-studio', now(), 'Hosting stolen films');
  insert into public.workspace_members (workspace_id, user_id, role) values
    ('${W.open}', '${U.owner}', 'owner'), ('${W.suspended}', '${U.owner}', 'owner');
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

describe("who can suspend", () => {
  it("doesn't let the workspace's own owner suspend it or lift a suspension", async () => {
    const suspend = await db.as(
      "authenticated",
      U.owner,
      `update public.workspaces set suspended_at = now() where id = '${W.open}'`
    );
    expect(suspend.error).toMatch(/Only platform admins can suspend/);

    const lift = await db.as(
      "authenticated",
      U.owner,
      `update public.workspaces set suspended_at = null, suspended_reason = null where id = '${W.suspended}'`
    );
    expect(lift.error).toMatch(/Only platform admins can suspend/);
  });

  it("still lets the owner change their other settings", async () => {
    const rename = await db.as(
      "authenticated",
      U.owner,
      `update public.workspaces set brand_name = 'Renamed' where id = '${W.open}' returning brand_name`
    );
    expect(rename.error).toBeUndefined();
    expect(rename.rows).toEqual([{ brand_name: "Renamed" }]);
  });

  it("never creates a workspace already suspended through the API", async () => {
    const created = await db.as(
      "authenticated",
      U.other,
      `insert into public.workspaces (owner_id, brand_name, slug, suspended_at, suspended_reason)
       values ('${U.other}', 'New', 'new-studio', now(), 'spoofed')
       returning suspended_at, suspended_reason`
    );
    expect(created.error).toBeUndefined();
    expect(created.rows).toEqual([{ suspended_at: null, suspended_reason: null }]);
  });

  it("lets the server suspend and lift a suspension", async () => {
    const steps = await db.asSteps("service_role", null, [
      `update public.workspaces set suspended_at = now(), suspended_reason = 'Abuse report' where id = '${W.open}' returning suspended_reason`,
      `update public.workspaces set suspended_at = null, suspended_reason = null where id = '${W.suspended}' returning suspended_at`,
    ]);
    expect(steps.map((step) => step.error)).toEqual([undefined, undefined]);
    expect(steps[0].rows).toEqual([{ suspended_reason: "Abuse report" }]);
    expect(steps[1].rows).toEqual([{ suspended_at: null }]);
  });
});

describe("admin read model", () => {
  it("shows the suspension and filters on it", async () => {
    const { rows, error } = await db.as(
      "service_role",
      null,
      "select slug, suspended_reason, suspended_at is not null as suspended from public.admin_list_workspaces(p_flag => 'suspended')"
    );
    expect(error).toBeUndefined();
    expect(rows).toEqual([{ slug: "closed-studio", suspended_reason: "Hosting stolen films", suspended: true }]);
  });

  it("keeps the dashboard numbers working after the overview was recreated", async () => {
    const { rows, error } = await db.as("service_role", null, "select public.admin_platform_kpis() as kpis");
    expect(error).toBeUndefined();
    expect(rows[0].kpis.workspaces).toBe(2);
  });

  it("is still closed to signed-in users", async () => {
    const outcome = await db.as("authenticated", U.owner, "select * from public.admin_list_workspaces()");
    expect(outcome.error).toMatch(/permission denied/);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MIGRATIONS_DIR, createTestDatabase, shimForPglite, wasBlocked, type QueryOutcome, type TestDatabase } from "./supabase-test-db";

/**
 * Where a file is stored is written by the server only (20261111120300_protect_file_locations.sql).
 *
 * Server code signs, copies and deletes whatever asset_versions' media columns point at with
 * its own storage credentials, so no signed-in API user, whatever their workspace role, may
 * write them or create versions. The service role (server code after its own checks) can, and
 * the storage counter still follows what it writes.
 */

const U = {
  ownerA: "00000000-0000-4000-8000-0000000000a1",
  viewerA: "00000000-0000-4000-8000-0000000000a2",
  adminA: "00000000-0000-4000-8000-0000000000a3",
  editorA: "00000000-0000-4000-8000-0000000000a4",
  ownerB: "00000000-0000-4000-8000-0000000000b1",
};
const W = { a: "10000000-0000-4000-8000-00000000000a", b: "10000000-0000-4000-8000-00000000000b" };
const D = { a: "30000000-0000-4000-8000-00000000000a", b: "30000000-0000-4000-8000-00000000000b" };
const A = {
  a1: "40000000-0000-4000-8000-0000000000a1",
  b1: "40000000-0000-4000-8000-0000000000b1",
  new: "40000000-0000-4000-8000-0000000000e1",
};
const V = {
  a1: "50000000-0000-4000-8000-0000000000a1", // active
  a1v2: "50000000-0000-4000-8000-0000000000a2", // second version of the same file, inactive
  b1: "50000000-0000-4000-8000-0000000000b1",
  new: "50000000-0000-4000-8000-0000000000e1",
};
const STREAM_UID = "0123456789abcdef0123456789abcdef";
const KEY_A = `private/workspaces/${W.a}/deliveries/${D.a}/assets/${A.a1}/v1/1-cut.mp4`;
const KEY_B = `private/workspaces/${W.b}/deliveries/${D.b}/assets/${A.b1}/v1/1-secret.mp4`;

const SEED = `
  set session_replication_role = replica; -- fixtures only: skip signup/storage triggers

  insert into auth.users (id, email) values
    ('${U.ownerA}', 'owner-a@test'), ('${U.viewerA}', 'viewer-a@test'), ('${U.adminA}', 'admin-a@test'),
    ('${U.editorA}', 'editor-a@test'), ('${U.ownerB}', 'owner-b@test');
  insert into public.user_profiles (id, platform_role) values
    ('${U.ownerA}', 'user'), ('${U.viewerA}', 'user'), ('${U.adminA}', 'user'), ('${U.editorA}', 'user'),
    ('${U.ownerB}', 'user');

  insert into public.workspaces (id, owner_id, brand_name, slug) values
    ('${W.a}', '${U.ownerA}', 'Studio A', 'studio-a'), ('${W.b}', '${U.ownerB}', 'Studio B', 'studio-b');
  insert into public.workspace_members (workspace_id, user_id, role) values
    ('${W.a}', '${U.ownerA}', 'owner'), ('${W.a}', '${U.adminA}', 'admin'), ('${W.a}', '${U.editorA}', 'editor'),
    ('${W.a}', '${U.viewerA}', 'viewer'), ('${W.b}', '${U.ownerB}', 'owner');

  insert into public.deliveries (id, workspace_id, title, share_token) values
    ('${D.a}', '${W.a}', 'Delivery A', 'share-token-a'), ('${D.b}', '${W.b}', 'Delivery B', 'share-token-b');
  insert into public.assets (id, workspace_id, delivery_id, title) values
    ('${A.a1}', '${W.a}', '${D.a}', 'Cut A1'), ('${A.b1}', '${W.b}', '${D.b}', 'Cut B1');
  insert into public.asset_versions
    (id, asset_id, version_number, raw_file_url, file_size_bytes, transcoding_status, is_active_version) values
    ('${V.a1}', '${A.a1}', 1, '${KEY_A}', 100, 'ready', true),
    ('${V.a1v2}', '${A.a1}', 2, 'private/workspaces/${W.a}/deliveries/${D.a}/assets/${A.a1}/v2/2-cut.mp4', 200, 'ready', false),
    ('${V.b1}', '${A.b1}', 1, '${KEY_B}', 100, 'ready', true);

  set session_replication_role = origin;
`;

let db: TestDatabase;

const as = (userId: string, sql: string) => db.as("authenticated", userId, sql);
const isPermissionDenied = (outcome: QueryOutcome) => /permission denied/i.test(outcome.error ?? "");
const counterOf = (workspaceId: string) =>
  `select storage_used_bytes::bigint::int as n from public.workspaces where id = '${workspaceId}'`;

/** Every write that would change what a version points at, its size or its state. */
const PROTECTED_CHANGES: Record<string, string> = {
  raw_file_url: `raw_file_url = '${KEY_B}'`,
  hls_manifest_url: `hls_manifest_url = 'https://videodelivery.net/${STREAM_UID}/manifest/video.m3u8'`,
  thumbnail_url: `thumbnail_url = '${KEY_B}'`,
  file_size_bytes: "file_size_bytes = 1",
  transcoding_status: "transcoding_status = 'ready'",
  duration_seconds: "duration_seconds = 12",
  silo_archive_key: "silo_archive_key = 'silo/workspaces/x/a.mp4'",
  silo_storage_class: "silo_storage_class = 'GLACIER'",
  version_number: "version_number = 9",
};

beforeAll(async () => {
  db = await createTestDatabase();
  await db.owner(SEED);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

describe("file versions: signed-in API users", () => {
  it("have only is_active_version and label as writable columns", async () => {
    const rows = await db.owner(`
      select attname from pg_attribute
      where attrelid = 'public.asset_versions'::regclass and attnum > 0 and not attisdropped
        and has_column_privilege('authenticated', attrelid, attnum, 'UPDATE')
      order by 1`);
    expect(rows.map((r) => r.attname)).toEqual(["is_active_version", "label"]);
    const [insertable] = await db.owner(
      `select has_any_column_privilege('authenticated', 'public.asset_versions'::regclass, 'INSERT') as ok`
    );
    expect(insertable.ok).toBe(false);
  });

  it("can't create versions, whatever their role", async () => {
    for (const userId of [U.editorA, U.adminA, U.ownerA]) {
      const insert = await as(userId, `insert into public.asset_versions (asset_id, version_number, raw_file_url, file_size_bytes)
        values ('${A.a1}', 3, '${KEY_B}', 1)`);
      expect(isPermissionDenied(insert), userId).toBe(true);
    }
  });

  it("can't change where a file is stored, its size, state or archive columns, whatever their role", async () => {
    for (const userId of [U.editorA, U.adminA, U.ownerA]) {
      for (const [column, change] of Object.entries(PROTECTED_CHANGES)) {
        const update = await as(userId, `update public.asset_versions set ${change} where id = '${V.a1}'`);
        expect(isPermissionDenied(update), `${column} as ${userId}`).toBe(true);
      }
    }
  });

  it("can't plant another studio's key in their own version, even together with an allowed column", async () => {
    const planted = await as(U.ownerA,
      `update public.asset_versions set label = 'V1', raw_file_url = '${KEY_B}' where id = '${V.a1}'`);
    expect(isPermissionDenied(planted)).toBe(true);
    const [row] = await db.owner(`select raw_file_url from public.asset_versions where id = '${V.a1}'`);
    expect(row.raw_file_url).toBe(KEY_A);
  });

  it("can still rename a version and switch the active one (editors and up, in their workspace)", async () => {
    expect(await as(U.editorA, `update public.asset_versions set label = 'Final' where id = '${V.a1}'`)).toMatchObject({
      affected: 1,
    });
    const [deactivate, activate, active] = await db.asSteps("authenticated", U.editorA, [
      `update public.asset_versions set is_active_version = false where asset_id = '${A.a1}' and id <> '${V.a1v2}'`,
      `update public.asset_versions set is_active_version = true where id = '${V.a1v2}' and asset_id = '${A.a1}'`,
      `select id from public.asset_versions where asset_id = '${A.a1}' and is_active_version`,
    ]);
    expect(deactivate).toMatchObject({ affected: 1 });
    expect(activate).toMatchObject({ affected: 1 });
    expect(active.rows.map((r) => r.id)).toEqual([V.a1v2]);

    expect(wasBlocked(await as(U.viewerA, `update public.asset_versions set label = 'x' where id = '${V.a1}'`))).toBe(true);
    expect(wasBlocked(await as(U.ownerB, `update public.asset_versions set label = 'x' where id = '${V.a1}'`))).toBe(true);
  });

  it("can't make a second version active while another one is", async () => {
    const second = await as(U.editorA, `update public.asset_versions set is_active_version = true where id = '${V.a1v2}'`);
    expect(second.code).toBe("23505");
  });
});

describe("file versions: the server (service role)", () => {
  it("creates versions and writes their media columns", async () => {
    const [asset, version, located] = await db.asSteps("service_role", null, [
      `insert into public.assets (id, workspace_id, delivery_id, title) values ('${A.new}', '${W.a}', '${D.a}', 'New cut')`,
      `insert into public.asset_versions (id, asset_id, version_number, raw_file_url, file_size_bytes, transcoding_status, is_active_version)
       values ('${V.new}', '${A.new}', 1, 'private/workspaces/${W.a}/deliveries/${D.a}/assets/${A.new}/v1/1-new.mp4', 500, 'pending', false)`,
      `update public.asset_versions
       set hls_manifest_url = 'https://videodelivery.net/${STREAM_UID}/manifest/video.m3u8',
           thumbnail_url = 'https://videodelivery.net/${STREAM_UID}/thumbnails/thumbnail.jpg',
           file_size_bytes = 400, transcoding_status = 'processing', duration_seconds = 12.5,
           silo_archive_key = null
       where id = '${V.new}'`,
    ]);
    expect(asset.error).toBeUndefined();
    expect(version.error).toBeUndefined();
    expect(located).toMatchObject({ affected: 1 });
  });

  it("is counted by the storage trigger: a pending version isn't, a confirmed active one is", async () => {
    const steps = await db.asSteps("service_role", null, [
      `insert into public.assets (id, workspace_id, delivery_id, title) values ('${A.new}', '${W.a}', '${D.a}', 'New cut')`,
      // Requested upload: inactive and pending, so not counted yet.
      `insert into public.asset_versions (id, asset_id, version_number, raw_file_url, file_size_bytes, transcoding_status, is_active_version)
       values ('${V.new}', '${A.new}', 1, 'private/workspaces/${W.a}/deliveries/${D.a}/assets/${A.new}/v1/1-new.mp4', 500, 'pending', false)`,
      counterOf(W.a),
      // Confirmed: the real size from storage, a streaming copy, then made active.
      `update public.asset_versions
       set file_size_bytes = 400, transcoding_status = 'processing',
           hls_manifest_url = 'https://videodelivery.net/${STREAM_UID}/manifest/video.m3u8'
       where id = '${V.new}'`,
      `update public.asset_versions set is_active_version = true where id = '${V.new}'`,
      counterOf(W.a),
    ]);
    expect(steps.map((s) => s.error)).toEqual(Array(6).fill(undefined));
    // Studio A: V.a1 (100) is active. The new version adds 400 + 35% for its streaming copy.
    expect(steps[2].rows[0].n).toBe(100);
    expect(steps[5].rows[0].n).toBe(100 + 400 + 140);
  });

  it("can't make two versions of a file active either", async () => {
    const second = await db.as("service_role", null,
      `update public.asset_versions set is_active_version = true where id = '${V.a1v2}'`);
    expect(second.code).toBe("23505");
  });
});

describe("the migration", () => {
  it("leaves one active version per file, preferring the newest one that isn't a pending upload", async () => {
    const migration = readdirMigration("_protect_file_locations.sql");
    const assetDup = "40000000-0000-4000-8000-0000000000d1";
    const versions = {
      done: "50000000-0000-4000-8000-0000000000d1",
      newerDone: "50000000-0000-4000-8000-0000000000d2",
      pending: "50000000-0000-4000-8000-0000000000d3",
    };
    await db.owner(`begin;
      drop index public.uq_asset_versions_one_active;
      set session_replication_role = replica;
      insert into public.assets (id, workspace_id, delivery_id, title) values ('${assetDup}', '${W.a}', '${D.a}', 'Dup');
      insert into public.asset_versions (id, asset_id, version_number, raw_file_url, transcoding_status, is_active_version) values
        ('${versions.done}', '${assetDup}', 1, 'k1', 'ready', true),
        ('${versions.newerDone}', '${assetDup}', 2, 'k2', 'processing', true),
        ('${versions.pending}', '${assetDup}', 3, 'k3', 'pending', true);
      set session_replication_role = origin;`);
    try {
      await db.owner(migration);
      const active = await db.owner(
        `select id from public.asset_versions where asset_id = '${assetDup}' and is_active_version order by id`
      );
      expect(active.map((r) => r.id)).toEqual([versions.newerDone]);
      const [index] = await db.owner(`select count(*)::int as n from pg_indexes where indexname = 'uq_asset_versions_one_active'`);
      expect(index.n).toBe(1);
    } finally {
      await db.owner("rollback");
    }
  });
});

function readdirMigration(suffix: string): string {
  const file = db.migrations.find((name) => name.endsWith(suffix));
  if (!file) throw new Error(`migration *${suffix} not found`);
  return shimForPglite(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
}

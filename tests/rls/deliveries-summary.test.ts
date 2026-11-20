import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, type TestDatabase } from "./supabase-test-db";

/**
 * The deliveries list's summary view (20261120120000_deliveries_summary_activity.sql): open
 * client notes and last activity per delivery, read by members through row-level security.
 */

const U = {
  ownerA: "00000000-0000-4000-8000-0000000000a1",
  viewerA: "00000000-0000-4000-8000-0000000000a2",
  ownerB: "00000000-0000-4000-8000-0000000000b1",
};
const W = { a: "10000000-0000-4000-8000-00000000000a", b: "10000000-0000-4000-8000-00000000000b" };
const C = { a: "20000000-0000-4000-8000-00000000000a" };
const D = {
  busy: "30000000-0000-4000-8000-0000000000a1",
  quiet: "30000000-0000-4000-8000-0000000000a2",
  approved: "30000000-0000-4000-8000-0000000000a3",
  b: "30000000-0000-4000-8000-0000000000b1",
};
const A = {
  live: "40000000-0000-4000-8000-0000000000a1",
  trashed: "40000000-0000-4000-8000-0000000000a2",
  b: "40000000-0000-4000-8000-0000000000b1",
};
const V = {
  first: "50000000-0000-4000-8000-0000000000a1",
  second: "50000000-0000-4000-8000-0000000000a2",
  trashed: "50000000-0000-4000-8000-0000000000a3",
  b: "50000000-0000-4000-8000-0000000000b1",
};
const F = {
  open1: "60000000-0000-4000-8000-0000000000a1",
  open2: "60000000-0000-4000-8000-0000000000a2",
  resolved: "60000000-0000-4000-8000-0000000000a3",
  studio: "60000000-0000-4000-8000-0000000000a4",
  trashed: "60000000-0000-4000-8000-0000000000a5",
  unsetResolved: "60000000-0000-4000-8000-0000000000a6",
  b: "60000000-0000-4000-8000-0000000000b1",
};

/** The view's columns before this migration, in order. Readers depend on them. */
const ORIGINAL_COLUMNS = [
  "id",
  "workspace_id",
  "client_id",
  "title",
  "description",
  "share_token",
  "status",
  "is_download_allowed",
  "is_comment_allowed",
  "passcode_protected",
  "client_name",
  "assets_count",
  "comments_count",
  "active_version_number",
  "active_duration_seconds",
  "created_at",
  "updated_at",
];

let db: TestDatabase;

const iso = (value: unknown) => (value == null ? null : new Date(value as string).toISOString());

async function summaryAs(userId: string, deliveryId: string) {
  const outcome = await db.as(
    "authenticated",
    userId,
    `select * from public.view_workspace_deliveries_summary where id = '${deliveryId}'`
  );
  if (outcome.error) throw new Error(outcome.error);
  return outcome.rows[0];
}

beforeAll(async () => {
  db = await createTestDatabase();
  await db.owner(`
    set session_replication_role = replica; -- fixtures only: skip triggers

    insert into auth.users (id, email) values
      ('${U.ownerA}', 'owner-a@test'), ('${U.viewerA}', 'viewer-a@test'), ('${U.ownerB}', 'owner-b@test');
    insert into public.workspaces (id, owner_id, brand_name, slug) values
      ('${W.a}', '${U.ownerA}', 'Studio A', 'studio-a'), ('${W.b}', '${U.ownerB}', 'Studio B', 'studio-b');
    insert into public.workspace_members (workspace_id, user_id, role) values
      ('${W.a}', '${U.ownerA}', 'owner'), ('${W.a}', '${U.viewerA}', 'viewer'), ('${W.b}', '${U.ownerB}', 'owner');
    insert into public.clients (id, workspace_id, name) values ('${C.a}', '${W.a}', 'Sahara Coffee');

    insert into public.deliveries
      (id, workspace_id, client_id, title, share_token, status, approved_at, approved_by_name, created_at, updated_at)
    values
      ('${D.busy}', '${W.a}', '${C.a}', 'Spring launch', 'token-busy', 'in_review', null, null,
        '2026-11-01T09:00:00Z', '2026-11-02T09:00:00Z'),
      ('${D.quiet}', '${W.a}', null, 'Empty room', 'token-quiet', 'draft', null, null,
        '2026-11-03T00:00:00Z', '2026-11-03T00:00:00Z'),
      ('${D.approved}', '${W.a}', null, 'Wedding film', 'token-approved', 'approved', '2026-11-05T12:00:00Z', 'Nour',
        '2026-11-01T00:00:00Z', '2026-11-05T11:00:00Z'),
      ('${D.b}', '${W.b}', null, 'Other studio', 'token-b', 'in_review', null, null,
        '2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z');

    -- One live file, and one in the Trash whose (later) activity must not count.
    insert into public.assets (id, workspace_id, delivery_id, title, is_archived, created_at) values
      ('${A.live}', '${W.a}', '${D.busy}', 'Cut', false, '2026-11-02T10:00:00Z'),
      ('${A.trashed}', '${W.a}', '${D.busy}', 'Old cut', true, '2026-11-09T00:00:00Z'),
      ('${A.b}', '${W.b}', '${D.b}', 'Cut B', false, '2026-11-01T00:00:00Z');
    insert into public.asset_versions
      (id, asset_id, version_number, raw_file_url, file_size_bytes, is_active_version, created_at)
    values
      ('${V.first}', '${A.live}', 1, 'private/a/v1.mp4', 100, false, '2026-11-02T10:00:00Z'),
      ('${V.second}', '${A.live}', 2, 'private/a/v2.mp4', 100, true, '2026-11-04T08:00:00Z'),
      ('${V.trashed}', '${A.trashed}', 1, 'private/a/old.mp4', 100, true, '2026-11-09T00:00:00Z'),
      ('${V.b}', '${A.b}', 1, 'private/b/v1.mp4', 100, true, '2026-11-01T00:00:00Z');

    -- Guests write with no author_user_id; the studio's own note has one.
    insert into public.feedback
      (id, asset_version_id, author_user_id, author_name, comment_text, is_resolved, created_at)
    values
      ('${F.open1}', '${V.first}', null, 'Client', 'Trim the intro', false, '2026-11-03T10:00:00Z'),
      ('${F.unsetResolved}', '${V.first}', null, 'Client', 'Louder music', null, '2026-11-03T11:00:00Z'),
      ('${F.open2}', '${V.second}', null, 'Client', 'Warmer grade', false, '2026-11-04T09:00:00Z'),
      ('${F.resolved}', '${V.second}', null, 'Client', 'Typo in title', true, '2026-11-04T09:30:00Z'),
      ('${F.studio}', '${V.second}', '${U.ownerA}', 'Owner A', 'Check the new end card', false, '2026-11-04T10:00:00Z'),
      ('${F.trashed}', '${V.trashed}', null, 'Client', 'On the old cut', false, '2026-11-09T10:00:00Z'),
      ('${F.b}', '${V.b}', null, 'Client B', 'Hello', false, '2026-11-01T00:00:00Z');
    insert into public.feedback_replies (feedback_id, author_user_id, author_name, comment_text, created_at) values
      ('${F.open1}', '${U.ownerA}', 'Owner A', 'On it', '2026-11-06T15:00:00Z');

    -- Two links: the deleted one was opened last, and that visit still counts.
    insert into public.share_links
      (workspace_id, delivery_id, token, label, last_opened_at, last_downloaded_at, deleted_at)
    values
      ('${W.a}', '${D.busy}', 'link-busy-1', 'Client link', '2026-11-07T08:00:00Z', '2026-11-06T20:00:00Z', null),
      ('${W.a}', '${D.busy}', 'link-busy-2', 'Agency', '2026-11-08T08:00:00Z', null, '2026-11-08T09:00:00Z'),
      ('${W.b}', '${D.b}', 'link-b', 'Client link', '2026-11-10T00:00:00Z', null, null);

    set session_replication_role = origin;
  `);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

describe("view_workspace_deliveries_summary", () => {
  it("keeps its original columns first, in order", async () => {
    const rows = await db.owner(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'view_workspace_deliveries_summary'
      order by ordinal_position
    `);
    const columns = rows.map((row) => row.column_name);
    expect(columns.slice(0, ORIGINAL_COLUMNS.length)).toEqual(ORIGINAL_COLUMNS);
    expect(columns).toEqual(
      expect.arrayContaining([
        "approved_at",
        "approved_by_name",
        "open_notes_count",
        "last_note_at",
        "last_opened_at",
        "last_downloaded_at",
        "last_activity_at",
      ])
    );
  });

  it("counts unresolved client notes on live files only", async () => {
    const row = await summaryAs(U.ownerA, D.busy);
    // open1, open2 and the one with is_resolved unset. Not the resolved one, the studio's own
    // note, or the note on the file in the Trash.
    expect(row.open_notes_count).toBe(3);
    // Every note on live files, as before.
    expect(row.comments_count).toBe(5);
  });

  it("takes the newest note or reply as the last note", async () => {
    const row = await summaryAs(U.ownerA, D.busy);
    expect(iso(row.last_note_at)).toBe("2026-11-06T15:00:00.000Z");
  });

  it("takes client visits and downloads from every link, deleted ones included", async () => {
    const row = await summaryAs(U.ownerA, D.busy);
    expect(iso(row.last_opened_at)).toBe("2026-11-08T08:00:00.000Z");
    expect(iso(row.last_downloaded_at)).toBe("2026-11-06T20:00:00.000Z");
  });

  it("makes last activity the latest of everything, ignoring files in the Trash", async () => {
    expect(iso((await summaryAs(U.ownerA, D.busy)).last_activity_at)).toBe("2026-11-08T08:00:00.000Z");
    // Nothing happened in the empty room: its own updated_at.
    const quiet = await summaryAs(U.ownerA, D.quiet);
    expect(quiet.open_notes_count).toBe(0);
    expect(quiet.last_note_at).toBeNull();
    expect(quiet.last_opened_at).toBeNull();
    expect(iso(quiet.last_activity_at)).toBe("2026-11-03T00:00:00.000Z");
  });

  it("returns the approval and counts it as activity", async () => {
    const row = await summaryAs(U.ownerA, D.approved);
    expect(iso(row.approved_at)).toBe("2026-11-05T12:00:00.000Z");
    expect(row.approved_by_name).toBe("Nour");
    expect(iso(row.last_activity_at)).toBe("2026-11-05T12:00:00.000Z");
  });

  it("shows a viewer the same numbers", async () => {
    const row = await summaryAs(U.viewerA, D.busy);
    expect(row.open_notes_count).toBe(3);
    expect(iso(row.last_opened_at)).toBe("2026-11-08T08:00:00.000Z");
  });

  it("shows another studio nothing", async () => {
    const outcome = await db.as(
      "authenticated",
      U.ownerB,
      `select count(*)::int as n from public.view_workspace_deliveries_summary where workspace_id = '${W.a}'`
    );
    expect(outcome.error).toBeUndefined();
    expect(outcome.rows[0].n).toBe(0);
  });
});

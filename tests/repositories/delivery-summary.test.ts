import { describe, it, expect } from "vitest";
import { SupabaseDeliveryRepository, latestOf } from "@/core/repositories/delivery.repository";

/**
 * A Supabase client that answers each table with fixed rows (or an error), whatever the
 * filters, and records which tables were queried.
 */
function fakeClient(tables: Record<string, { data?: any[]; error?: { message: string } }>) {
  const queried: string[] = [];
  const client = {
    from: (table: string) => {
      queried.push(table);
      const answer = tables[table] ?? { error: { message: `relation "${table}" does not exist` } };
      const builder: any = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === "then") {
              return (resolve: (value: unknown) => unknown) =>
                resolve({ data: answer.error ? null : answer.data ?? [], error: answer.error ?? null });
            }
            return () => builder;
          },
        }
      );
      return builder;
    },
  };
  return { client: client as any, queried };
}

const BASE_VIEW_ROW = {
  id: "d1",
  workspace_id: "w1",
  client_id: "c1",
  title: "Spring launch",
  description: null,
  share_token: "token-d1",
  status: "in_review",
  is_download_allowed: false,
  is_comment_allowed: true,
  passcode_protected: false,
  client_name: "Sahara Coffee",
  assets_count: 1,
  comments_count: 3,
  active_version_number: 2,
  active_duration_seconds: 75,
  created_at: "2026-11-01T09:00:00+00:00",
  updated_at: "2026-11-02T09:00:00+00:00",
};

const DELIVERY_ROW = {
  id: "d1",
  workspace_id: "w1",
  client_id: "c1",
  title: "Spring launch",
  description: null,
  share_token: "token-d1",
  passcode_hash: null,
  status: "in_review",
  is_download_allowed: false,
  is_comment_allowed: true,
  approved_at: null,
  approved_by_name: null,
  created_at: "2026-11-01T09:00:00+00:00",
  updated_at: "2026-11-02T09:00:00+00:00",
  client: { name: "Sahara Coffee" },
  assets: [
    {
      id: "a1",
      sort_order: 0,
      is_archived: false,
      created_at: "2026-11-02T10:00:00+00:00",
      versions: [
        { id: "v1", version_number: 1, is_active_version: false, created_at: "2026-11-02T10:00:00+00:00", feedback: [] },
        {
          id: "v2",
          version_number: 2,
          duration_seconds: 75,
          is_active_version: true,
          created_at: "2026-11-04T08:00:00+00:00",
          feedback: [
            { id: "f1", author_user_id: null, is_resolved: false, created_at: "2026-11-04T09:00:00+00:00", replies: [] },
            { id: "f2", author_user_id: null, is_resolved: null, created_at: "2026-11-04T09:10:00+00:00", replies: [] },
            { id: "f3", author_user_id: null, is_resolved: true, created_at: "2026-11-04T09:20:00+00:00", replies: [] },
            {
              id: "f4",
              author_user_id: "member-1",
              is_resolved: false,
              created_at: "2026-11-04T09:30:00+00:00",
              replies: [{ created_at: "2026-11-06T15:00:00+00:00" }],
            },
          ],
        },
      ],
    },
    {
      // In the Trash: none of it counts.
      id: "a2",
      sort_order: 1,
      is_archived: true,
      created_at: "2026-11-09T00:00:00+00:00",
      versions: [
        {
          id: "v3",
          version_number: 1,
          is_active_version: true,
          created_at: "2026-11-09T00:00:00+00:00",
          feedback: [{ id: "f5", author_user_id: null, is_resolved: false, created_at: "2026-11-09T10:00:00+00:00", replies: [] }],
        },
      ],
    },
  ],
};

describe("latestOf", () => {
  it("picks the latest time and skips missing or unreadable ones", () => {
    expect(latestOf("2026-11-01T00:00:00Z", null, "2026-11-03T00:00:00Z", undefined, "not a date")).toBe(
      "2026-11-03T00:00:00Z"
    );
    expect(latestOf(null, undefined)).toBeNull();
  });
});

describe("SupabaseDeliveryRepository.listDeliveriesSummary", () => {
  it("maps the view's activity columns and stops there", async () => {
    const { client, queried } = fakeClient({
      view_workspace_deliveries_summary: {
        data: [
          {
            ...BASE_VIEW_ROW,
            approved_at: null,
            approved_by_name: null,
            open_notes_count: 2,
            last_note_at: "2026-11-06T15:00:00+00:00",
            last_opened_at: null,
            last_downloaded_at: null,
            last_activity_at: "2026-11-06T15:00:00+00:00",
          },
        ],
      },
    });
    const [item] = await new SupabaseDeliveryRepository(client).listDeliveriesSummary("w1");

    expect(queried).toEqual(["view_workspace_deliveries_summary"]);
    expect(item.openNotesCount).toBe(2);
    expect(item.lastNoteAt).toBe("2026-11-06T15:00:00+00:00");
    // Never opened, and known to be: null, not undefined.
    expect(item.lastOpenedAt).toBeNull();
    expect(item.lastActivityAt).toBe("2026-11-06T15:00:00+00:00");
  });

  it("works the activity out itself while the view predates the migration", async () => {
    const { client, queried } = fakeClient({
      view_workspace_deliveries_summary: { data: [BASE_VIEW_ROW] },
      deliveries: { data: [DELIVERY_ROW] },
      share_links: {
        data: [
          { delivery_id: "d1", last_opened_at: "2026-11-07T08:00:00+00:00", last_downloaded_at: null },
          { delivery_id: "d1", last_opened_at: "2026-11-08T08:00:00+00:00", last_downloaded_at: "2026-11-06T20:00:00+00:00" },
        ],
      },
    });
    const [item] = await new SupabaseDeliveryRepository(client).listDeliveriesSummary("w1");

    expect(queried).toEqual(expect.arrayContaining(["view_workspace_deliveries_summary", "deliveries", "share_links"]));
    // f1 and f2 (unset counts as open). Not the resolved one, the studio's, or the trashed file's.
    expect(item.openNotesCount).toBe(2);
    expect(item.commentsCount).toBe(4);
    expect(item.lastNoteAt).toBe("2026-11-06T15:00:00+00:00");
    expect(item.lastOpenedAt).toBe("2026-11-08T08:00:00+00:00");
    expect(item.lastDownloadedAt).toBe("2026-11-06T20:00:00+00:00");
    expect(item.lastActivityAt).toBe("2026-11-08T08:00:00+00:00");
    expect(item.assetsCount).toBe(1);
  });

  it("leaves client visits unknown when the links can't be read", async () => {
    const { client } = fakeClient({
      view_workspace_deliveries_summary: { error: { message: "view missing" } },
      deliveries: { data: [DELIVERY_ROW] },
      share_links: { error: { message: 'relation "share_links" does not exist' } },
    });
    const [item] = await new SupabaseDeliveryRepository(client).listDeliveriesSummary("w1");

    expect(item.lastOpenedAt).toBeUndefined();
    expect(item.lastDownloadedAt).toBeUndefined();
    // Still the latest of what is known: the studio's reply.
    expect(item.lastActivityAt).toBe("2026-11-06T15:00:00+00:00");
  });
});

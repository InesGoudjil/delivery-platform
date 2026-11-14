import { describe, it, expect, vi, afterEach } from "vitest";
import { AdminReadModel, maskEmail, maskPhone } from "@/core/admin/read-model";

/** A Supabase query-builder double: every filter returns itself; awaiting it gives `result`. */
function query(result: { data: unknown; error: unknown; count?: number }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gt", "gte", "ilike", "order", "range", "limit", "in"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (value: unknown) => void) => resolve(result);
  return builder;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("recipient masking", () => {
  it("keeps enough of an address to recognise it, not the whole thing", () => {
    expect(maskEmail("client@example.com")).toBe("cl•••@example.com");
    expect(maskEmail("not-an-email")).toBe("•••");
    expect(maskEmail(null)).toBeNull();
    expect(maskPhone("+971 50 123 4567")).toBe("+9715•••4567");
    expect(maskPhone("12345")).toBe("•••");
  });
});

describe("AdminReadModel.getScheduler", () => {
  it("is stale when the job never ran, or not for more than 30 minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));

    const never = new AdminReadModel({ from: () => query({ data: null, error: null }) } as any);
    await expect(never.getScheduler()).resolves.toMatchObject({ lastFinishedAt: null, stale: true });

    const recent = new AdminReadModel({
      from: () =>
        query({ data: { last_finished_at: "2026-11-13T11:55:00Z", last_status: "ok" }, error: null }),
    } as any);
    await expect(recent.getScheduler()).resolves.toMatchObject({ lastStatus: "ok", stale: false });

    const old = new AdminReadModel({
      from: () => query({ data: { last_finished_at: "2026-11-13T11:00:00Z", last_status: "ok" }, error: null }),
    } as any);
    await expect(old.getScheduler()).resolves.toMatchObject({ stale: true });
  });
});

describe("AdminReadModel.listPendingBatches", () => {
  it("marks email batches overdue 15 minutes after their window closed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
    const tables: Record<string, unknown> = {
      comment_email_batches: query({
        data: [
          { delivery_id: "d1", workspace_id: "w1", send_at: "2026-11-13T11:30:00Z", comment_count: 3, deliveries: { title: "Film" }, workspaces: { brand_name: "Studio" } },
          { delivery_id: "d2", workspace_id: "w1", send_at: "2026-11-13T11:55:00Z", comment_count: 1, deliveries: null, workspaces: null },
        ],
        error: null,
      }),
      whatsapp_comment_batches: query({ data: [], error: null }),
    };
    const model = new AdminReadModel({ from: (table: string) => tables[table] } as any);
    const batches = await model.listPendingBatches();
    expect(batches.map((batch) => [batch.deliveryId, batch.overdue])).toEqual([
      ["d1", true],
      ["d2", false],
    ]);
    expect(batches[0]).toMatchObject({ kind: "email", deliveryTitle: "Film", workspaceName: "Studio", comments: 3 });
  });
});

describe("AdminReadModel.listNotifications", () => {
  it("masks recipients before they leave the server", async () => {
    const model = new AdminReadModel({
      from: () =>
        query({
          data: [
            { id: "n1", workspace_id: "w1", channel: "email", status: "failed", recipient_email: "client@example.com", created_at: "2026-11-13T10:00:00Z", workspaces: { brand_name: "Studio" } },
            { id: "n2", workspace_id: "w1", channel: "whatsapp", status: "sent", recipient_phone: "+971501234567", created_at: "2026-11-13T10:00:00Z", workspaces: null },
          ],
          error: null,
          count: 2,
        }),
    } as any);
    const page = await model.listNotifications({ page: 1, pageSize: 25 });
    expect(page.total).toBe(2);
    expect(page.rows.map((row) => row.recipient)).toEqual(["cl•••@example.com", "+9715•••4567"]);
    expect(JSON.stringify(page.rows)).not.toContain("client@example.com");
  });
});

describe("AdminReadModel.search", () => {
  it("puts an exact share-token match first, drops duplicates, and strips filter syntax from title searches", async () => {
    const titleQuery = query({
      data: [
        { id: "d1", title: "Wedding film", workspace_id: "w1", workspaces: { brand_name: "Studio" } },
        { id: "d2", title: "Wedding teaser", workspace_id: "w1", workspaces: { brand_name: "Studio" } },
      ],
      error: null,
    });
    const tokenQuery = query({ data: [{ id: "d2", title: "Wedding teaser", workspace_id: "w1", workspaces: null }], error: null });
    let deliveriesCalls = 0;
    const client = {
      rpc: vi.fn(async (fn: string) => ({
        data: fn === "admin_list_workspaces" ? [{ id: "w1", brand_name: "Studio", slug: "studio", owner_email: "o@t" }] : [],
        error: null,
      })),
      from: vi.fn(() => (deliveriesCalls++ === 0 ? tokenQuery : titleQuery)),
    };
    const results = await new AdminReadModel(client as any).search("wedding,(x)");
    expect(results.workspaces).toEqual([{ id: "w1", name: "Studio", slug: "studio", ownerEmail: "o@t" }]);
    expect(results.deliveries.map((delivery) => [delivery.id, delivery.matchedShareToken])).toEqual([
      ["d2", true],
      ["d1", false],
    ]);
    expect((titleQuery.ilike as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual(["title", "%wedding  x%"]);
  });
});

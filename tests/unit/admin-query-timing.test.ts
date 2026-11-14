import { describe, it, expect, vi, afterEach } from "vitest";
import { SLOW_ADMIN_QUERY_MS, timedQuery } from "@/core/admin/query-timing";

function fakeLog() {
  return { debug: vi.fn(), warn: vi.fn() } as any;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("timedQuery", () => {
  it("logs a fast query at debug level with its duration", async () => {
    const log = fakeLog();
    vi.spyOn(performance, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1042);

    await expect(timedQuery(log, "listWorkspaces", async () => "rows")).resolves.toBe("rows");

    expect(log.debug).toHaveBeenCalledWith({ query: "listWorkspaces", durationMs: 42, failed: false }, "Admin query");
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("warns when a query is slower than the target", async () => {
    const log = fakeLog();
    vi.spyOn(performance, "now").mockReturnValueOnce(0).mockReturnValueOnce(SLOW_ADMIN_QUERY_MS + 5);

    await timedQuery(log, "platformKpis", async () => ({}));

    expect(log.warn).toHaveBeenCalledWith(
      { query: "platformKpis", durationMs: SLOW_ADMIN_QUERY_MS + 5, failed: false },
      expect.stringContaining("Slow admin query")
    );
  });

  it("rethrows a failed query and marks the log entry as failed", async () => {
    const log = fakeLog();
    await expect(
      timedQuery(log, "listUsers", async () => {
        throw new Error("database down");
      })
    ).rejects.toThrow("database down");
    expect(log.debug.mock.calls[0]?.[0] ?? log.warn.mock.calls[0]?.[0]).toMatchObject({ query: "listUsers", failed: true });
  });

  it("just runs the query when there's no logger", async () => {
    await expect(timedQuery(undefined, "listUsers", async () => 7)).resolves.toBe(7);
  });
});

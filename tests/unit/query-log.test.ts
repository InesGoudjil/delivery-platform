import { describe, it, expect, vi, afterEach } from "vitest";
import {
  QueryLog,
  SLOW_QUERY_MS,
  SLOW_REQUEST_MS,
  queryAreaForPath,
  timeQueries,
  timeQuery,
} from "@/core/observability/query-log";
import { createCoreServices } from "@/core/container";

function fakeLog(debugEnabled = true) {
  return {
    debug: vi.fn(),
    warn: vi.fn(),
    isLevelEnabled: vi.fn((level: string) => level !== "debug" || debugEnabled),
  } as any;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("queryAreaForPath", () => {
  it.each([
    ["/", "landing"],
    ["/acme", "workspace"],
    ["/acme/deliveries/123", "workspace"],
    ["/new-workspace", "workspace"],
    ["/admin/users", "admin"],
    ["/deliver/abc", "client-room"],
    ["/demo", "client-room"],
    ["/p/acme", "portfolio"],
    ["/login", "auth"],
    ["/blog/some-post", "public"],
    ["/api/media/x", "api"],
    [null, "server"],
  ])("%s is %s", (path, area) => {
    expect(queryAreaForPath(path)).toBe(area);
  });
});

describe("QueryLog", () => {
  it("logs a query at debug level with the request it ran for", () => {
    const log = fakeLog();
    const queryLog = new QueryLog(log, { area: "workspace", requestId: "req-1", path: "/acme/deliveries" });

    queryLog.record("delivery.listDeliveriesSummary", 1000, 1042, false);

    expect(log.debug).toHaveBeenCalledWith(
      {
        area: "workspace",
        requestId: "req-1",
        path: "/acme/deliveries",
        query: "delivery.listDeliveriesSummary",
        durationMs: 42,
        failed: false,
      },
      "Workspace query"
    );
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("names the line after the area and leaves out what isn't known", () => {
    const log = fakeLog();
    new QueryLog(log, { area: "landing", requestId: null, path: "/" }).record("plan.listActivePlans", 0, 10, false);
    expect(log.debug).toHaveBeenCalledWith(
      { area: "landing", path: "/", query: "plan.listActivePlans", durationMs: 10, failed: false },
      "Landing query"
    );
  });

  it("warns when a query is slow, even with debug lines off", () => {
    const log = fakeLog(false);
    const queryLog = new QueryLog(log, { area: "client-room", requestId: "req-2" });

    queryLog.record("asset.listByDeliveryId", 0, 5, false);
    queryLog.record("subscription.findByWorkspaceId", 0, SLOW_QUERY_MS + 12, false);

    expect(log.debug).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ query: "subscription.findByWorkspaceId", durationMs: SLOW_QUERY_MS + 12 }),
      `Slow client room query: subscription.findByWorkspaceId took ${SLOW_QUERY_MS + 12} ms`
    );
  });

  it("marks server actions and prefetches", () => {
    const log = fakeLog();
    new QueryLog(log, { area: "workspace", serverAction: true, prefetch: true }).record("workspace.findBySlug", 0, 1, false);
    expect(log.debug.mock.calls[0][0]).toMatchObject({ serverAction: true, prefetch: true });
  });

  it("times a query, rethrowing failures", async () => {
    const log = fakeLog();
    const queryLog = new QueryLog(log, { area: "workspace" });

    await expect(queryLog.time("plan.findBySlug", async () => "starter")).resolves.toBe("starter");
    await expect(
      queryLog.time("plan.findById", async () => {
        throw new Error("database down");
      })
    ).rejects.toThrow("database down");

    expect(log.debug.mock.calls.map(([entry]: any[]) => [entry.query, entry.failed])).toEqual([
      ["plan.findBySlug", false],
      ["plan.findById", true],
    ]);
  });

  it("puts the user on lines logged after the session is read", () => {
    const log = fakeLog();
    const queryLog = new QueryLog(log, { area: "workspace", requestId: "req-3" });

    queryLog.record("auth.getUser", 0, 1, false);
    queryLog.setUser("user-1");
    queryLog.record("workspace.findBySlug", 1, 2, false);

    expect(log.debug.mock.calls[0][0].userId).toBeUndefined();
    expect(log.debug.mock.calls[1][0]).toMatchObject({ requestId: "req-3", userId: "user-1" });
  });

  it("sums a request up: count, span from first start to last end, total, slowest", () => {
    const log = fakeLog();
    const queryLog = new QueryLog(log, { area: "workspace", requestId: "req-4", path: "/acme" });

    queryLog.record("auth.getUser", 0, 100, false);
    queryLog.record("plan.findBySlug", 100, 180, false);
    queryLog.record("subscription.findByWorkspaceId", 100, 250, false); // in parallel with the one above
    queryLog.record("workspaceFeatures.findByWorkspaceId", 250, 300, true);
    queryLog.logSummary();

    expect(queryLog.summary()).toEqual({
      queries: 4,
      failedQueries: 1,
      slowQueries: 0,
      spanMs: 300,
      queryMs: 380,
      slowest: "subscription.findByWorkspaceId",
      slowestMs: 150,
    });
    expect(log.debug).toHaveBeenLastCalledWith(
      expect.objectContaining({ area: "workspace", requestId: "req-4", path: "/acme", queries: 4, spanMs: 300 }),
      "Workspace request: 4 queries over 300 ms"
    );
  });

  it("warns about a slow request even with debug lines off", () => {
    const log = fakeLog(false);
    const queryLog = new QueryLog(log, { area: "landing", path: "/" });

    queryLog.record("siteSettings.getWithMeta", 0, 200, false);
    queryLog.record("plan.listActivePlans", SLOW_REQUEST_MS - 100, SLOW_REQUEST_MS + 50, false);
    queryLog.logSummary();

    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ queries: 2, spanMs: SLOW_REQUEST_MS + 50 }),
      `Slow landing request: 2 queries over ${SLOW_REQUEST_MS + 50} ms`
    );
  });

  it("logs no summary for a request without queries", () => {
    const log = fakeLog();
    const queryLog = new QueryLog(log, { area: "workspace" });
    queryLog.logSummary();
    expect(queryLog.summary()).toBeNull();
    expect(log.debug).not.toHaveBeenCalled();
  });
});

describe("timeQuery", () => {
  it("just runs the query when there's no log", async () => {
    await expect(timeQuery(undefined, "auth.getUser", async () => 7)).resolves.toBe(7);
  });
});

describe("timeQueries", () => {
  class FakeRepository {
    calls: string[] = [];
    rows = ["a", "b"];

    async findAll(): Promise<string[]> {
      this.calls.push("findAll");
      return this.rows.map(this.toEntity);
    }

    async findFirst(): Promise<string | null> {
      // A call through `this` reaches the real object: not logged a second time.
      const all = await this.findAll();
      return all[0] ?? null;
    }

    async broken(): Promise<never> {
      throw new Error("relation does not exist");
    }

    toEntity(row: string): string {
      return row.toUpperCase();
    }
  }

  it("times each async method as <name>.<method>", async () => {
    const log = fakeLog();
    const repository = timeQueries(new FakeRepository(), "fake", new QueryLog(log, { area: "workspace" }));

    await expect(repository.findAll()).resolves.toEqual(["A", "B"]);
    await expect(repository.findFirst()).resolves.toBe("A");

    expect(log.debug.mock.calls.map(([entry]: any[]) => entry.query)).toEqual(["fake.findAll", "fake.findFirst"]);
  });

  it("leaves synchronous methods and fields alone", () => {
    const log = fakeLog();
    const repository = timeQueries(new FakeRepository(), "fake", new QueryLog(log, { area: "workspace" }));

    expect(repository.toEntity("x")).toBe("X");
    expect(repository.rows).toEqual(["a", "b"]);
    expect(repository).toBeInstanceOf(FakeRepository);
    expect(log.debug).not.toHaveBeenCalled();
  });

  it("records a failed query and rethrows it", async () => {
    const log = fakeLog();
    const repository = timeQueries(new FakeRepository(), "fake", new QueryLog(log, { area: "workspace" }));

    await expect(repository.broken()).rejects.toThrow("relation does not exist");
    expect(log.debug.mock.calls[0][0]).toMatchObject({ query: "fake.broken", failed: true });
  });

  it("uses a method replaced after wrapping (a test spy)", async () => {
    const log = fakeLog();
    const repository = timeQueries(new FakeRepository(), "fake", new QueryLog(log, { area: "workspace" }));
    await repository.findAll();

    repository.findAll = vi.fn(async () => ["spied"]);

    await expect(repository.findAll()).resolves.toEqual(["spied"]);
    expect(log.debug).toHaveBeenCalledTimes(2);
  });
});

describe("createCoreServices with a query log", () => {
  /** A Supabase client whose every query answers no rows, and whose session has one user. */
  function fakeSupabase() {
    const tables: string[] = [];
    const builder: any = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null, count: 0 });
          }
          return () => builder;
        },
      }
    );
    return {
      tables,
      client: {
        from: (table: string) => {
          tables.push(table);
          return builder;
        },
        auth: {
          getUser: async () => ({ data: { user: { id: "user-9" } }, error: null }),
        },
      },
    };
  }

  it("logs each repository query and the session lookup under the request", async () => {
    const log = fakeLog();
    const queryLog = new QueryLog(log, { area: "workspace", requestId: "req-5", path: "/acme" });
    const { client, tables } = fakeSupabase();
    const { services } = createCoreServices(client as any, { queryLog });

    await services.auth.getCurrentUser();
    await services.workspace.getWorkspaceBySlug("acme");
    await services.subscription.getCurrentPlan("ws-1");

    expect(tables).toEqual(["workspaces", "plans", "subscriptions"]);
    const queries = log.debug.mock.calls.map(([entry]: any[]) => entry.query);
    expect(queries.slice(0, 2)).toEqual(["auth.getUser", "workspace.findBySlug"]);
    // The plans and the subscription are read at once.
    expect(queries.slice(2).sort()).toEqual(["plan.listAllPlans", "subscription.findByWorkspaceId"]);
    expect(log.debug.mock.calls[1]).toEqual([
      {
        area: "workspace",
        requestId: "req-5",
        path: "/acme",
        userId: "user-9",
        query: "workspace.findBySlug",
        durationMs: expect.any(Number),
        failed: false,
      },
      "Workspace query",
    ]);
  });

  it("times nothing without a query log", async () => {
    const record = vi.spyOn(QueryLog.prototype, "record");
    const { client } = fakeSupabase();
    const { services } = createCoreServices(client as any);

    await services.auth.getCurrentUser();
    await services.workspace.getWorkspaceBySlug("acme");

    expect(record).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { headers } from "next/headers";

const mocks = vi.hoisted(() => ({ after: vi.fn() }));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: mocks.after,
}));

import { QueryLog } from "@/core/observability/query-log";
import { backgroundQueryLog, requestQueryLog } from "@/core/observability/request-query-log";

function requestHeaders(values: Record<string, string>) {
  vi.mocked(headers).mockResolvedValue(new Headers(values) as any);
}

beforeEach(() => {
  mocks.after.mockReset();
  vi.mocked(headers).mockResolvedValue(new Headers() as any);
});

describe("requestQueryLog", () => {
  it("reads the request ID, path and kind the middleware and router send", async () => {
    requestHeaders({
      "x-request-id": "req-a",
      "x-pathname": "/acme/portfolio",
      "next-action": "abc123",
    });

    const queryLog = await requestQueryLog();

    expect(queryLog.context).toEqual({
      area: "workspace",
      requestId: "req-a",
      path: "/acme/portfolio",
      serverAction: true,
      prefetch: undefined,
    });
  });

  it("shares one log across a request and sums it up once the response is done", async () => {
    requestHeaders({ "x-request-id": "req-b", "x-pathname": "/" });

    const first = await requestQueryLog();
    const second = await requestQueryLog();
    expect(second).toBe(first);
    expect(mocks.after).toHaveBeenCalledTimes(1);

    const logSummary = vi.spyOn(first, "logSummary").mockImplementation(() => {});
    mocks.after.mock.calls[0][0]();
    expect(logSummary).toHaveBeenCalledTimes(1);

    // The request is done: a later call is a new request's log.
    const next = await requestQueryLog();
    expect(next).not.toBe(first);
  });

  it("doesn't keep a log it can't sum up (outside a request)", async () => {
    mocks.after.mockImplementation(() => {
      throw new Error("`after` was called outside a request scope");
    });
    requestHeaders({ "x-request-id": "req-c", "x-pathname": "/acme" });

    const first = await requestQueryLog();
    const second = await requestQueryLog();
    expect(first).toBeInstanceOf(QueryLog);
    expect(second).not.toBe(first);
  });

  it("falls back to an untagged log when the headers can't be read", async () => {
    vi.mocked(headers).mockRejectedValueOnce(new Error("headers was called outside a request scope"));
    const queryLog = await requestQueryLog();
    expect(queryLog.context).toEqual({ area: "server" });
  });
});

describe("backgroundQueryLog", () => {
  it("logs under the given area, without a request", () => {
    expect(backgroundQueryLog("portfolio").context).toEqual({ area: "portfolio" });
    expect(backgroundQueryLog().context).toEqual({ area: "server" });
  });
});

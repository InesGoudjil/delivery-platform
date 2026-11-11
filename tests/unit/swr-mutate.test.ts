import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mutatePrefix, mutateSuffix, optimisticMutate } from "@/lib/swr/mutate";
import { fetcher } from "@/lib/swr/fetcher";
import * as swr from "swr";

vi.mock("swr", () => ({
  mutate: vi.fn(),
}));

describe("lib/swr/mutate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mutatePrefix", () => {
    it("calls swr.mutate with a prefix matching function for single prefix string", () => {
      mutatePrefix("/api/deliveries");
      expect(swr.mutate).toHaveBeenCalledOnce();

      const [matcher, data, options] = vi.mocked(swr.mutate).mock.calls[0];
      expect(typeof matcher).toBe("function");
      expect(data).toBeUndefined();
      expect(options).toEqual({ revalidate: true });

      const predicate = matcher as (key: any) => boolean;
      expect(predicate("/api/deliveries?page=1")).toBe(true);
      expect(predicate("/api/deliveries/del_123")).toBe(true);
      expect(predicate("/api/workspaces")).toBe(false);
      expect(predicate(null)).toBe(false);
      expect(predicate(123)).toBe(false);
    });

    it("matches multiple prefixes when an array is provided", () => {
      mutatePrefix(["/api/deliveries", "/api/workspaces"]);
      const [matcher] = vi.mocked(swr.mutate).mock.calls[0];
      const predicate = matcher as (key: any) => boolean;

      expect(predicate("/api/deliveries?status=active")).toBe(true);
      expect(predicate("/api/workspaces/settings")).toBe(true);
      expect(predicate("/api/analytics")).toBe(false);
    });
  });

  describe("mutateSuffix", () => {
    it("calls swr.mutate with a suffix matching function", () => {
      mutateSuffix("/count");
      const [matcher] = vi.mocked(swr.mutate).mock.calls[0];
      const predicate = matcher as (key: any) => boolean;

      expect(predicate("/api/deliveries/count")).toBe(true);
      expect(predicate("/api/deliveries/count?page=1")).toBe(false);
      expect(predicate("/api/deliveries")).toBe(false);
    });

    it("matches multiple suffixes when an array is provided", () => {
      mutateSuffix(["/count", "/metrics"]);
      const [matcher] = vi.mocked(swr.mutate).mock.calls[0];
      const predicate = matcher as (key: any) => boolean;

      expect(predicate("/api/deliveries/count")).toBe(true);
      expect(predicate("/api/deliveries/metrics")).toBe(true);
      expect(predicate("/api/deliveries/items")).toBe(false);
    });
  });

  describe("optimisticMutate", () => {
    it("passes optimisticData and executes mutation function through swr.mutate", async () => {
      const mockKey = "/api/deliveries/del_1";
      const updater = vi.fn((current: any) => ({ ...current, isApproved: true }));
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      vi.mocked(swr.mutate).mockImplementation(async (key, fn, opts) => {
        if (typeof fn === "function") {
          await fn();
        }
        return undefined as any;
      });

      await optimisticMutate(mockKey, updater, mutationFn);

      expect(swr.mutate).toHaveBeenCalledWith(
        mockKey,
        expect.any(Function),
        expect.objectContaining({
          optimisticData: updater,
          rollbackOnError: true,
          revalidate: true,
        })
      );
      expect(mutationFn).toHaveBeenCalledOnce();
    });
  });
});

describe("lib/swr/fetcher", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns parsed JSON when response is ok", async () => {
    const mockData = { items: [{ id: "1" }], count: 1 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    } as any);

    const result = await fetcher("/api/deliveries");
    expect(result).toEqual(mockData);
  });

  it("throws SWRError with status and parsed message when response fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Access denied to delivery" }),
    } as any);

    await expect(fetcher("/api/deliveries")).rejects.toMatchObject({
      message: "Access denied to delivery",
      status: 403,
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

/*
 * useServerSeededData runs here without a DOM: React's hooks are replaced by plain functions
 * (effects are collected and run by the test), and SWR's config by a fake cache and mutate.
 * SWR's own handling of `revalidateOnMount` is SWR's: with it false, no fetch on mount.
 */

const mocks = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  cache: new Map<string, { data?: unknown }>(),
  mutate: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (init: unknown) => [typeof init === "function" ? (init as () => unknown)() : init, () => {}],
  useRef: (value: unknown) => ({ current: value }),
  useEffect: (effect: () => void) => mocks.effects.push(effect),
  useLayoutEffect: (effect: () => void) => mocks.effects.push(effect),
}));

vi.mock("swr", async (importOriginal) => ({
  ...(await importOriginal<typeof import("swr")>()),
  useSWRConfig: () => ({ cache: mocks.cache, mutate: mocks.mutate }),
}));

import { useServerSeededData } from "@/lib/swr/server-data";

function useTestMount<T>(key: string | null, serverData: T | undefined) {
  const revalidateOnMount = useServerSeededData(key, serverData);
  mocks.effects.splice(0).forEach((effect) => effect());
  return revalidateOnMount;
}

beforeEach(() => {
  mocks.effects.length = 0;
  mocks.cache.clear();
  mocks.mutate.mockReset();
});

describe("useServerSeededData", () => {
  it("doesn't refetch the server's data on mount, and puts it in the cache for updates", () => {
    const serverData = { items: [1, 2] };

    expect(useTestMount("/api/workspaces/acme/portfolio", serverData)).toBe(false);
    expect(mocks.mutate).toHaveBeenCalledWith("/api/workspaces/acme/portfolio", serverData, { revalidate: false });
  });

  it("revalidates as before when the cache already has the key, and keeps the cached copy", () => {
    mocks.cache.set("/api/workspaces/acme", { data: { brandName: "Cached" } });

    expect(useTestMount("/api/workspaces/acme", { brandName: "Server" })).toBe(true);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("leaves SWR's default without server data", () => {
    expect(useTestMount("/api/workspaces/acme/members", undefined)).toBeUndefined();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("does nothing without a key", () => {
    expect(useTestMount(null, { items: [] })).toBe(false);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});

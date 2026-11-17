"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * For an SWR hook whose first data comes from the server render (its `fallbackData`). Returns
 * the `revalidateOnMount` value to pass to useSWR.
 *
 * The first time a key is used in this tab, the page's server data is as fresh as a refetch
 * would be. So the hook doesn't fetch it again on mount (that ran a Server Action after every
 * page load, and actions run one at a time, so the next click waited behind it). The data goes
 * into the SWR cache instead, where `mutate(current => …)` updates can see it: fallbackData alone
 * isn't in the cache, so those updaters would get `undefined`.
 *
 * A key the cache already holds (a page opened earlier in this tab) revalidates on mount as
 * before: either copy may be the newer one.
 *
 * `serverData` must be the data for `key` exactly (a hook with filters passes it only for the
 * key the server rendered). Without it, SWR fetches on mount as usual.
 */
export function useServerSeededData<T>(key: string | null, serverData: T | undefined): boolean | undefined {
  const { cache, mutate } = useSWRConfig();
  // SWR reads revalidateOnMount on the first render only, so this is read once too.
  const [cacheHadData] = useState(() => key !== null && cache.get(key)?.data !== undefined);
  const seeded = useRef<{ key: string; data: T } | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (key === null || serverData === undefined) return;
    if (seeded.current?.key === key && seeded.current.data === serverData) return;
    seeded.current = { key, data: serverData };
    // Never over a cached copy: it may hold optimistic changes or a newer fetch.
    if (cache.get(key)?.data === undefined) {
      void mutate(key, serverData, { revalidate: false });
    }
  }, [key, serverData, cache, mutate]);

  if (serverData === undefined) return undefined;
  return cacheHadData;
}

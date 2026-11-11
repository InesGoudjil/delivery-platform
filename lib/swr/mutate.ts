import { mutate } from "swr";

/**
 * Revalidates all SWR cache entries whose keys begin with a specified prefix (or array of prefixes).
 * Extremely useful for invalidating list queries, filter variations, and paginated data
 * when a mutation (create/update/delete) occurs.
 *
 * Example:
 * ```ts
 * await mutatePrefix("/api/deliveries");
 * ```
 */
export const mutatePrefix = (prefix: string | string[]) =>
  mutate(
    (key) =>
      typeof key === "string" &&
      (Array.isArray(prefix)
        ? prefix.some((p) => key.startsWith(p))
        : key.startsWith(prefix)),
    undefined,
    { revalidate: true }
  );

/**
 * Revalidates all SWR cache entries whose keys end with a specified suffix (or array of suffixes).
 */
export const mutateSuffix = (suffix: string | string[]) =>
  mutate(
    (key) =>
      typeof key === "string" &&
      (Array.isArray(suffix)
        ? suffix.some((s) => key.endsWith(s))
        : key.endsWith(suffix)),
    undefined,
    { revalidate: true }
  );

/**
 * Executes an optimistic mutation on a specific SWR key:
 * 1. Immediately updates the local cache with the expected state.
 * 2. Runs the server mutation (e.g. Server Action or API call).
 * 3. Automatically rolls back to the previous state if the server mutation throws an error.
 * 4. Revalidates from the server to guarantee consistency.
 */
export async function optimisticMutate<TData>(
  key: string,
  optimisticData: (current: TData | undefined) => TData,
  mutationFn: () => Promise<any>
): Promise<void> {
  await mutate(
    key,
    async () => {
      await mutationFn();
    },
    {
      optimisticData,
      rollbackOnError: true,
      populateCache: false,
      revalidate: true,
    }
  );
}

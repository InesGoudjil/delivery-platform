import type { Logger } from "@/lib/logger";

/** Admin queries slower than this are logged as warnings; the plan's target is under 300 ms a page. */
export const SLOW_ADMIN_QUERY_MS = 300;

/**
 * Runs one admin query and logs how long it took: debug normally, a warning when it's slow, so
 * slow admin pages show up in production logs (with the request ID the logger carries).
 */
export async function timedQuery<T>(log: Logger | undefined, query: string, run: () => Promise<T>): Promise<T> {
  if (!log) return run();
  const started = performance.now();
  let failed = false;
  try {
    return await run();
  } catch (err) {
    failed = true;
    throw err;
  } finally {
    const durationMs = Math.round(performance.now() - started);
    const entry = { query, durationMs, failed };
    if (durationMs >= SLOW_ADMIN_QUERY_MS) {
      log.warn(entry, `Slow admin query: ${query} took ${durationMs} ms`);
    } else {
      log.debug(entry, "Admin query");
    }
  }
}

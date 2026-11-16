import type { Logger } from "@/lib/logger";
import { logQueryDuration, SLOW_QUERY_MS } from "@/core/observability/query-log";

/** Admin queries slower than this are logged as warnings; the plan's target is under 300 ms a page. */
export const SLOW_ADMIN_QUERY_MS = SLOW_QUERY_MS;

/**
 * Runs one admin query and logs how long it took: debug normally, a warning when it's slow, so
 * slow admin pages show up in production logs (with the request ID the logger carries). The rest
 * of the app logs its queries the same way (core/observability/query-log.ts).
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
    logQueryDuration(log, "Admin", { query, durationMs: Math.round(performance.now() - started), failed });
  }
}

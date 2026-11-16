import { cache } from "react";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { logger } from "@/lib/logger";
import { QueryLog, queryAreaForPath, type QueryArea } from "./query-log";

/**
 * The query log of the request being handled. Everything built for one request (the layout's
 * services, the page's, the guards', a Server Action's) shares one log, so its lines carry the
 * same request ID, path and user, and one summary line is logged when the response is done.
 *
 * Two lookups find it: React's cache() within a render (no headers needed), and the request ID
 * otherwise (Server Actions and route handlers run outside the render).
 */
const requestStore = cache((): { log?: Promise<QueryLog> } => ({}));

/** Logs of requests still being handled, by request ID. Removed when the response is done. */
const openRequests = new Map<string, QueryLog>();
/** A cap, in case a request never finishes: its log is dropped, never its queries. */
const MAX_OPEN_REQUESTS = 500;

/**
 * This request's query log, with the request ID and path the middleware put in the headers.
 * Reading headers renders the page per request, so call it only where the request is read
 * anyway (code that uses the session cookies, or a page that's dynamic already).
 */
export function requestQueryLog(): Promise<QueryLog> {
  const store = requestStore();
  store.log ??= readRequestQueryLog();
  return store.log;
}

/**
 * The log requestQueryLog() set up for this render, if it did. Doesn't read the request, so
 * static and ISR pages stay static.
 */
export function existingRequestQueryLog(): Promise<QueryLog> | undefined {
  return requestStore().log;
}

/** A query log for work that isn't tied to a request we read (an ISR page, a job). */
export function backgroundQueryLog(area: QueryArea = "server"): QueryLog {
  return new QueryLog(logger, { area });
}

async function readRequestQueryLog(): Promise<QueryLog> {
  let requestHeaders: Headers;
  try {
    requestHeaders = await headers();
  } catch (err) {
    // Next.js's own signals (a static render reaching headers()) must reach Next.js.
    unstable_rethrow(err);
    return backgroundQueryLog();
  }

  const requestId = requestHeaders.get("x-request-id");
  const open = requestId ? openRequests.get(requestId) : undefined;
  if (open) return open;

  const path = requestHeaders.get("x-pathname");
  const queryLog = new QueryLog(logger, {
    area: queryAreaForPath(path),
    requestId,
    path,
    serverAction: requestHeaders.has("next-action") || undefined,
    prefetch: requestHeaders.has("next-router-prefetch") || undefined,
  });
  if (requestId && summarizeWhenDone(requestId, queryLog)) {
    if (openRequests.size >= MAX_OPEN_REQUESTS) {
      const oldest = openRequests.keys().next().value;
      if (oldest !== undefined) openRequests.delete(oldest);
    }
    openRequests.set(requestId, queryLog);
  }
  return queryLog;
}

/** Logs the request's summary line once the response is sent. False outside a request. */
function summarizeWhenDone(requestId: string, queryLog: QueryLog): boolean {
  try {
    after(() => {
      if (openRequests.get(requestId) === queryLog) openRequests.delete(requestId);
      queryLog.logSummary();
    });
    return true;
  } catch {
    return false;
  }
}

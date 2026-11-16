import type { Logger } from "@/lib/logger";

/**
 * Query timing for the app's database and auth calls, in the same shape as the admin panel's
 * ("Admin query", core/admin/query-timing.ts): one line per query with its name, how long it
 * took and whether it failed, plus the request it ran for. Fast queries are logged at debug
 * level (on in development); slow ones are warnings, so they show up in production logs too.
 */

/** Queries slower than this are logged as warnings. The admin panel's target is under 300 ms a page. */
export const SLOW_QUERY_MS = 300;

/** Which part of the site a request belongs to, from its path. */
export type QueryArea =
  | "landing"
  | "workspace"
  | "client-room"
  | "portfolio"
  | "admin"
  | "auth"
  | "public"
  | "api"
  | "server";

const AREA_LABELS: Record<QueryArea, string> = {
  landing: "Landing",
  workspace: "Workspace",
  "client-room": "Client room",
  portfolio: "Portfolio",
  admin: "Admin",
  auth: "Auth page",
  public: "Public page",
  api: "API",
  server: "Server",
};

const AUTH_SEGMENTS = new Set(["login", "signup", "mfa", "forgot-password", "reset-password"]);
const PUBLIC_SEGMENTS = new Set(["blog", "contact", "cookies", "copyright", "privacy", "refunds", "terms", "waitlist"]);
const CLIENT_ROOM_SEGMENTS = new Set(["deliver", "demo", "delivery-view"]);

/** The area of a page path: "/" is the landing page, "/<slug>/..." a workspace page, and so on. */
export function queryAreaForPath(path: string | null | undefined): QueryArea {
  if (!path) return "server";
  if (path === "/") return "landing";
  const first = path.split("/")[1] ?? "";
  if (first === "admin") return "admin";
  if (first === "api") return "api";
  if (first === "p") return "portfolio";
  if (CLIENT_ROOM_SEGMENTS.has(first)) return "client-room";
  if (AUTH_SEGMENTS.has(first)) return "auth";
  if (PUBLIC_SEGMENTS.has(first)) return "public";
  return "workspace";
}

/** What a request's query lines say about the request. */
export interface QueryLogContext {
  area: QueryArea;
  /** The ID the middleware gave the request (x-request-id). */
  requestId?: string | null;
  /** The page path (x-pathname, set by the middleware). Server Actions post to their page's path. */
  path?: string | null;
  /** The signed-in user, once the session has been read. */
  userId?: string;
  /** The request is a Server Action call. */
  serverAction?: boolean;
  /** The request is a router prefetch, not a page the visitor opened. */
  prefetch?: boolean;
}

export interface QueryLogEntry {
  query: string;
  durationMs: number;
  failed: boolean;
}

/**
 * Logs one finished query: debug normally, a warning when it took SLOW_QUERY_MS or more.
 * `label` names the line: "<label> query", or "Slow <label> query: <query> took <n> ms".
 */
export function logQueryDuration(log: Logger, label: string, entry: QueryLogEntry & Record<string, unknown>): void {
  if (entry.durationMs >= SLOW_QUERY_MS) {
    log.warn(entry, `Slow ${label.toLowerCase()} query: ${entry.query} took ${entry.durationMs} ms`);
  } else {
    log.debug(entry, `${label} query`);
  }
}

/** A request whose queries span this long, first start to last end, is logged as a warning. */
export const SLOW_REQUEST_MS = 1000;

/** One request's queries, for the line logged when it ends. */
export interface QueryLogSummary {
  queries: number;
  failedQueries: number;
  slowQueries: number;
  /** From the first query's start to the last one's end: the time spent waiting on queries. */
  spanMs: number;
  /** All queries' durations added up. Above spanMs when queries ran in parallel. */
  queryMs: number;
  slowest: string;
  slowestMs: number;
}

/**
 * The query log of one request. Every core service built for the request shares it
 * (core/observability/request-query-log.ts), so its lines carry the same request ID, path and
 * user, and it can sum the request up when the response is done.
 */
export class QueryLog {
  private queries = 0;
  private failedQueries = 0;
  private slowQueries = 0;
  private queryMs = 0;
  private firstStart = Infinity;
  private lastEnd = -Infinity;
  private slowest = { query: "", ms: -1 };

  constructor(
    private readonly log: Logger,
    readonly context: QueryLogContext
  ) {}

  /** Records a query that ran from `startedAt` to `endedAt` (performance.now() times). */
  record(query: string, startedAt: number, endedAt: number, failed: boolean): void {
    const ms = Math.round(endedAt - startedAt);
    this.queries += 1;
    if (failed) this.failedQueries += 1;
    if (ms >= SLOW_QUERY_MS) this.slowQueries += 1;
    this.queryMs += endedAt - startedAt;
    this.firstStart = Math.min(this.firstStart, startedAt);
    this.lastEnd = Math.max(this.lastEnd, endedAt);
    if (ms > this.slowest.ms) this.slowest = { query, ms };

    // Debug lines are off in production (LOG_LEVEL info): skip building them.
    if (ms < SLOW_QUERY_MS && !this.debugEnabled()) return;
    logQueryDuration(this.log, AREA_LABELS[this.context.area], {
      ...contextFields(this.context),
      query,
      durationMs: ms,
      failed,
    });
  }

  /** Runs one query and records how long it took. Errors are rethrown. */
  async time<T>(query: string, run: () => PromiseLike<T>): Promise<T> {
    const started = performance.now();
    let failed = false;
    try {
      return await run();
    } catch (err) {
      failed = true;
      throw err;
    } finally {
      this.record(query, started, performance.now(), failed);
    }
  }

  /** Puts the signed-in user on this request's later lines. */
  setUser(userId: string): void {
    this.context.userId = userId;
  }

  /** The queries recorded so far, or null when there were none. */
  summary(): QueryLogSummary | null {
    if (this.queries === 0) return null;
    return {
      queries: this.queries,
      failedQueries: this.failedQueries,
      slowQueries: this.slowQueries,
      spanMs: Math.round(this.lastEnd - this.firstStart),
      queryMs: Math.round(this.queryMs),
      slowest: this.slowest.query,
      slowestMs: this.slowest.ms,
    };
  }

  /**
   * Logs one line for the whole request: debug normally, a warning when its queries spanned
   * SLOW_REQUEST_MS or more.
   */
  logSummary(): void {
    const summary = this.summary();
    if (!summary) return;
    const slow = summary.spanMs >= SLOW_REQUEST_MS;
    if (!slow && !this.debugEnabled()) return;
    const label = AREA_LABELS[this.context.area];
    const counts = `${summary.queries} ${summary.queries === 1 ? "query" : "queries"} over ${summary.spanMs} ms`;
    const entry = { ...contextFields(this.context), ...summary };
    if (slow) this.log.warn(entry, `Slow ${label.toLowerCase()} request: ${counts}`);
    else this.log.debug(entry, `${label} request: ${counts}`);
  }

  private debugEnabled(): boolean {
    return this.log.isLevelEnabled?.("debug") !== false;
  }
}

/** Times `run` on `queryLog`, or just runs it when there's no log. */
export async function timeQuery<T>(queryLog: QueryLog | undefined, query: string, run: () => PromiseLike<T>): Promise<T> {
  return queryLog ? queryLog.time(query, run) : run();
}

type AnyMethod = (...args: unknown[]) => unknown;

/**
 * Wraps a repository so each of its async methods is timed as "<name>.<method>", for example
 * "subscription.findByWorkspaceId". Synchronous methods and other properties pass through
 * unchanged. Methods run on the repository itself, so its internal helper calls aren't logged
 * twice.
 */
export function timeQueries<T extends object>(target: T, name: string, queryLog: QueryLog): T {
  // Keyed by the method itself, so a method replaced later (a test spy) gets a fresh wrapper.
  const wrappers = new WeakMap<AnyMethod, AnyMethod>();
  return new Proxy(target, {
    get(obj, prop) {
      const value: unknown = Reflect.get(obj, prop, obj);
      if (typeof value !== "function" || typeof prop !== "string" || prop === "constructor") return value;
      const method = value as AnyMethod;
      let wrapper = wrappers.get(method);
      if (!wrapper) {
        const query = `${name}.${prop}`;
        wrapper = function timed(...args: unknown[]) {
          const started = performance.now();
          const result = method.apply(obj, args);
          // Synchronous helpers (mappers, checks) aren't queries: not logged, errors included.
          if (!isPromiseLike(result)) return result;
          return Promise.resolve(result).then(
            (value) => {
              queryLog.record(query, started, performance.now(), false);
              return value;
            },
            (err: unknown) => {
              queryLog.record(query, started, performance.now(), true);
              throw err;
            }
          );
        };
        wrappers.set(method, wrapper);
      }
      return wrapper;
    },
  });
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/** The context's fields that are set, in a stable order. */
function contextFields(context: QueryLogContext): Record<string, unknown> {
  const fields: Record<string, unknown> = { area: context.area };
  if (context.requestId) fields.requestId = context.requestId;
  if (context.path) fields.path = context.path;
  if (context.userId) fields.userId = context.userId;
  if (context.serverAction) fields.serverAction = true;
  if (context.prefetch) fields.prefetch = true;
  return fields;
}

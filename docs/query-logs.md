# Query logs

Every database query and Supabase Auth call the app makes on the server is timed and logged,
the same way the admin panel's queries are. Use the logs to see why a page is slow: how many
queries it makes, which ones wait for each other, and which are slow.

## What you see

One line per query:

```
[20:07:53] DEBUG: Workspace query
    area: "workspace"
    requestId: "e57ddc14-90a8-4f9a-a95e-bee1e869be6d"
    path: "/acme/deliveries"
    userId: "ce1eddd1-476c-402e-be68-95b78782d9da"
    query: "subscription.findByWorkspaceId"
    durationMs: 112
    failed: false
```

And one line per request, once the response has been sent:

```
[20:07:54] DEBUG: Workspace request: 14 queries over 820 ms
    area: "workspace"
    requestId: "e57ddc14-90a8-4f9a-a95e-bee1e869be6d"
    path: "/acme/deliveries"
    queries: 14
    failedQueries: 0
    slowQueries: 0
    spanMs: 820
    queryMs: 1210
    slowest: "plan.findBySlug"
    slowestMs: 131
```

| Field | Meaning |
| --- | --- |
| `area` | Which part of the site, from the path: `landing`, `workspace`, `client-room`, `portfolio`, `admin`, `auth`, `public`, `api`, or `server` when there's no request (an ISR page). The line's title follows it ("Landing query", "Client room query"). |
| `requestId` | The ID the middleware gives each request (`x-request-id`). All lines of one request share it. |
| `path` | The page path. Server Actions post to their page's path and also have `serverAction: true`; router prefetches have `prefetch: true`. |
| `userId` | The signed-in user, on lines logged after the session was read. |
| `query` | `<repository>.<method>`, for example `asset.listByDeliveryId`, or `auth.getUser` / `auth.getClaims`. |
| `spanMs` | From the first query's start to the last one's end: the time the request spent waiting on queries. |
| `queryMs` | All durations added up. Much higher than `spanMs` means many queries ran at once. |

## Levels

- Fast queries and requests: `debug`. On in development; production logs at `info` unless
  `LOG_LEVEL=debug` is set.
- A query of 300 ms or more: a warning, "Slow workspace query: … took … ms".
- A request whose queries span 1 second or more: a warning, "Slow workspace request: …".

So slow pages show up in production logs without turning on debug.

## Reading them

- Filter by `requestId` to see one request. Queries that start only after the previous one ends
  are a chain: each one adds a full round trip to the database.
- A query that takes 0–2 ms made no network call: usually a repeat that Next.js answered from
  its per-render fetch cache, or `auth.getUser` for a visitor who isn't signed in.
- Run a production build with `LOG_LEVEL=debug npx next start` to get one JSON line per entry,
  easy to process with a script.

## How it works

- `core/observability/query-log.ts`: the timing, the line format, and `timeQueries()`, which
  wraps a repository so each async method is timed.
- `core/container.ts` wraps every repository when it gets a `queryLog`; `AuthService` times its
  session lookups.
- `core/observability/request-query-log.ts`: one log per request, found by React's `cache()`
  during a render and by request ID in Server Actions. It reads `x-request-id` and `x-pathname`
  (set in `middleware.ts`) and logs the summary with `after()`.
- `getServerServices()` and `getServerCore()` always log with the request. During a render,
  `getServerServices()` returns one set of services for the whole request (React's `cache()`), so
  the layout, the page and the guards share it. `getServerAdminServices()`
  doesn't read the request on its own, because that would make static and ISR pages dynamic: pass
  `{ request: true }` from pages rendered per request, or `{ area }` to label background work.
  It uses the request's log anyway when `getServerServices()` already set one up.
- The admin panel keeps its own names (`core/admin/query-timing.ts`) and the same thresholds.

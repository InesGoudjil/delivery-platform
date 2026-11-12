import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, type NextResponse } from "next/server";

/**
 * Device sign-out enforcement in the middleware (lib/supabase/middleware.ts). Both Supabase
 * clients are fakes: the user's client (createServerClient) answers getClaims, signOut and the
 * device-row lookup; the service-role client (createClient) answers the insert of a new row.
 */

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import { updateSession, SESSION_REVOKED_MESSAGE, SESSION_UNVERIFIED_MESSAGE } from "@/lib/supabase/middleware";

const USER = "11111111-1111-4111-8111-111111111111";
const LOGIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
/** tests/setup.ts sets NEXT_PUBLIC_SUPABASE_URL to https://test-project.supabase.co */
const AUTH_COOKIE = "sb-test-project-auth-token";
const NO_CACHE = { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0" };
const CHROME_ON_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

type Result = { data: unknown; error: { message: string } | null };
type Query = { table: string; chain: Array<[string, ...unknown[]]> };

/** A client whose queries answer from per-table queues and are recorded. */
function fakeQueries(results: Record<string, Result[]>) {
  const queries: Query[] = [];
  const from = vi.fn((table: string) => {
    const query: Query = { table, chain: [] };
    queries.push(query);
    const result = results[table]?.shift() ?? { data: null, error: null };
    const builder: any = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
              Promise.resolve(result).then(resolve, reject);
          }
          return (...args: unknown[]) => {
            query.chain.push([String(prop), ...args]);
            return builder;
          };
        },
      }
    );
    return builder;
  });
  return { from, queries };
}

const dbRow = (overrides: Record<string, unknown> = {}) => ({
  id: "c0000000-0000-4000-8000-000000000001",
  user_id: USER,
  session_token_id: LOGIN,
  browser: "Google Chrome",
  os: "macOS",
  device_type: "desktop",
  is_revoked: false,
  last_active_at: "2026-11-11T10:00:00.000Z",
  created_at: "2026-11-11T10:00:00.000Z",
  ...overrides,
});

interface Scenario {
  claims?: Record<string, unknown> | null;
  /** Cookies Supabase writes while verifying (a token refresh). */
  refreshedCookies?: Array<{ name: string; value: string }>;
  /** False: signOut() returns an error before clearing anything. */
  signOutClearsCookies?: boolean;
  userQueries?: Record<string, Result[]>;
  adminQueries?: Record<string, Result[]>;
}

function setup(scenario: Scenario) {
  let cookieMethods: { setAll: (cookies: unknown[], headers: Record<string, string>) => void };
  const user = fakeQueries(scenario.userQueries ?? {});
  const admin = fakeQueries(scenario.adminQueries ?? {});

  const auth = {
    getClaims: vi.fn(async () => {
      if (scenario.refreshedCookies) {
        cookieMethods.setAll(
          scenario.refreshedCookies.map((c) => ({ ...c, options: { path: "/", sameSite: "lax", maxAge: 34560000 } })),
          NO_CACHE
        );
      }
      return { data: scenario.claims ? { claims: scenario.claims } : null, error: null };
    }),
    // What @supabase/ssr does on sign-out: expire the auth cookie through setAll.
    signOut: vi.fn(async () => {
      if (scenario.signOutClearsCookies === false) {
        return { error: new Error("Failed to fetch") };
      }
      cookieMethods.setAll([{ name: AUTH_COOKIE, value: "", options: { path: "/", sameSite: "lax", maxAge: 0 } }], NO_CACHE);
      return { error: null };
    }),
  };

  mocks.createServerClient.mockImplementation((_url: string, _key: string, options: any) => {
    cookieMethods = options.cookies;
    return { auth, from: user.from };
  });
  mocks.createClient.mockImplementation(() => ({ from: admin.from }));

  return { auth, userQueries: user.queries, adminQueries: admin.queries };
}

function request(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(`https://app.test${path}`, {
    headers: { "user-agent": CHROME_ON_MAC, "x-forwarded-for": "203.0.113.7", ...(cookie ? { cookie } : {}) },
  });
}

const signedIn = { [AUTH_COOKIE]: "base64-eyJhY2Nlc3NfdG9rZW4iOiJ4In0" };
const claims = { sub: USER, session_id: LOGIN, role: "authenticated", aal: "aal1" };
/** Fresh each time: the fakes consume their result queues. */
const revokedRow = () => ({ user_sessions: [{ data: dbRow({ is_revoked: true }), error: null }] });
const activeRow = () => ({ user_sessions: [{ data: dbRow(), error: null }] });

const passedThrough = (res: NextResponse) => res.headers.get("x-middleware-next") === "1";
const location = (res: NextResponse) => new URL(res.headers.get("location")!);
const expired = (res: NextResponse, name: string) => {
  const cookie = res.cookies.get(name);
  return cookie?.value === "" && cookie?.maxAge === 0;
};

describe("lib/supabase/middleware: device sign-out enforcement", () => {
  beforeEach(() => {
    mocks.createServerClient.mockReset();
    mocks.createClient.mockReset();
  });

  it("signs a revoked device out (this device only) and redirects it to /login with the cleared auth cookies", async () => {
    const { auth, userQueries } = setup({ claims, userQueries: revokedRow() });

    const res = await updateSession(request("/studio/deliveries", { ...signedIn, cinespace_sid: "legacy-id" }));

    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(res.status).toBe(307);
    expect(location(res).pathname).toBe("/login");
    expect(location(res).searchParams.get("error")).toBe(SESSION_REVOKED_MESSAGE);
    expect(expired(res, AUTH_COOKIE)).toBe(true);
    expect(res.headers.get("cache-control")).toBe(NO_CACHE["Cache-Control"]);
    expect(expired(res, "cinespace_sid")).toBe(true);

    // The row is looked up by the verified token's ids, with the user's own client.
    const lookup = userQueries.find((q) => q.table === "user_sessions")!;
    expect(lookup.chain).toContainEqual(["eq", "user_id", USER]);
    expect(lookup.chain).toContainEqual(["eq", "session_token_id", LOGIN]);
  });

  it("is keyed on the token's session id, so dropping the old tracking cookie doesn't skip the check", async () => {
    const { auth } = setup({ claims, userQueries: revokedRow() });

    const res = await updateSession(request("/", signedIn));

    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(location(res).searchParams.get("error")).toBe(SESSION_REVOKED_MESSAGE);
    expect(res.cookies.get("cinespace_sid")).toBeUndefined();
  });

  it("still expires every auth cookie when Supabase's sign-out fails before clearing them", async () => {
    setup({ claims, userQueries: revokedRow(), signOutClearsCookies: false });

    const res = await updateSession(
      request("/studio/security", { [`${AUTH_COOKIE}.0`]: "base64-part0", [`${AUTH_COOKIE}.1`]: "part1", theme: "dark" })
    );

    expect(location(res).pathname).toBe("/login");
    expect(expired(res, `${AUTH_COOKIE}.0`)).toBe(true);
    expect(expired(res, `${AUTH_COOKIE}.1`)).toBe(true);
    expect(res.cookies.get("theme")).toBeUndefined();
  });

  it("signs out a token that names no session (it can't be checked or revoked)", async () => {
    const { auth, userQueries } = setup({ claims: { sub: USER, role: "authenticated" } });

    const res = await updateSession(request("/studio/deliveries", signedIn));

    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(location(res).searchParams.get("error")).toBe(SESSION_UNVERIFIED_MESSAGE);
    expect(expired(res, AUTH_COOKIE)).toBe(true);
    expect(userQueries).toEqual([]);
  });

  it("lets an active session through, with its refreshed tokens and no service-role client", async () => {
    const { auth } = setup({
      claims,
      userQueries: activeRow(),
      refreshedCookies: [{ name: AUTH_COOKIE, value: "base64-refreshed" }],
    });

    const res = await updateSession(request("/studio/deliveries", signedIn));

    expect(passedThrough(res)).toBe(true);
    expect(res.cookies.get(AUTH_COOKIE)?.value).toBe("base64-refreshed");
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("records a login that has no row yet with the service role, never resetting an existing row", async () => {
    const { adminQueries } = setup({
      claims,
      userQueries: { user_sessions: [{ data: null, error: null }] },
      adminQueries: { user_sessions: [{ data: [dbRow()], error: null }] },
    });

    const res = await updateSession(request("/studio/deliveries", signedIn));

    expect(passedThrough(res)).toBe(true);
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://test-project.supabase.co",
      "test-service-role-key",
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) })
    );
    const [method, payload, options] = adminQueries[0].chain[0];
    expect(method).toBe("upsert");
    expect(options).toEqual({ onConflict: "session_token_id", ignoreDuplicates: true });
    expect(payload).toMatchObject({
      user_id: USER,
      session_token_id: LOGIN,
      browser: "Google Chrome",
      os: "macOS",
      device_type: "desktop",
      ip_address: "203.0.113.7",
    });
    expect(payload).not.toHaveProperty("is_revoked");
  });

  it("treats a login revoked between the lookup and the insert as revoked", async () => {
    const { auth } = setup({
      claims,
      userQueries: { user_sessions: [{ data: null, error: null }] },
      adminQueries: {
        user_sessions: [
          { data: [], error: null }, // ON CONFLICT DO NOTHING: the row exists
          { data: dbRow({ is_revoked: true }), error: null },
        ],
      },
    });

    const res = await updateSession(request("/studio/deliveries", signedIn));

    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(location(res).searchParams.get("error")).toBe(SESSION_REVOKED_MESSAGE);
  });

  it("doesn't sign anyone out when the lookup itself fails", async () => {
    const { auth } = setup({
      claims,
      userQueries: { user_sessions: [{ data: null, error: { message: "upstream timeout" } }] },
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await updateSession(request("/studio/deliveries", signedIn));

    expect(passedThrough(res)).toBe(true);
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("redirects signed-out visitors away from workspace pages without looking up sessions", async () => {
    const { userQueries, auth } = setup({ claims: null });

    const res = await updateSession(request("/studio/deliveries"));

    expect(location(res).pathname).toBe("/login");
    expect(location(res).searchParams.get("redirect")).toBe("/studio/deliveries");
    expect(userQueries).toEqual([]);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("keeps refreshed tokens on route-guard redirects too", async () => {
    setup({
      claims,
      userQueries: activeRow(),
      refreshedCookies: [{ name: AUTH_COOKIE, value: "base64-refreshed" }],
    });

    const res = await updateSession(request("/login", signedIn));

    expect(location(res).pathname).toBe("/");
    expect(res.cookies.get(AUTH_COOKIE)?.value).toBe("base64-refreshed");
  });
});

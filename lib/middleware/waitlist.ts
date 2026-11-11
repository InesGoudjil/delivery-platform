import { type NextRequest, NextResponse } from "next/server";

export const WAITLIST_BYPASS_COOKIE_NAME = "waitlist_bypass";
export const WAITLIST_BYPASS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Checks whether waitlist-only mode is active via environment flags.
 */
export function isWaitlistMode(): boolean {
  return (
    process.env.WAITLIST_ONLY === "true" ||
    process.env.NEXT_PUBLIC_WAITLIST_ONLY === "true"
  );
}

/**
 * Checks if the incoming request has a valid waitlist bypass cookie.
 */
export function isWaitlistBypassed(request: NextRequest): boolean {
  const bypassSecret = process.env.WAITLIST_BYPASS_SECRET;
  if (!bypassSecret) return false;

  const bypassCookie = request.cookies.get(WAITLIST_BYPASS_COOKIE_NAME)?.value;
  return Boolean(bypassCookie && bypassCookie === bypassSecret);
}

/**
 * Determines whether a pathname is allowed to be accessed in waitlist mode
 * without a bypass cookie.
 */
export function isAllowedWaitlistPath(pathname: string): boolean {
  // Allow internal Next.js assets, API endpoints, favicon, service worker, and webmanifest
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest"
  ) {
    return true;
  }

  // Allow waitlist page and demo showcase views
  if (
    pathname === "/waitlist" ||
    pathname === "/delivery-view" ||
    pathname === "/demo"
  ) {
    return true;
  }

  return false;
}

export interface WaitlistMiddlewareOptions {
  requestId?: string;
}

/**
 * Handles waitlist gatekeeping, secret bypass tokens, cookie clearing, and redirects.
 *
 * Returns a `NextResponse` when a redirect or cookie mutation is performed.
 * Returns `null` when the request is allowed to proceed to standard application routing.
 */
export function handleWaitlistMiddleware(
  request: NextRequest,
  options?: WaitlistMiddlewareOptions
): NextResponse | null {
  if (!isWaitlistMode()) {
    return null;
  }

  const { pathname } = request.nextUrl;
  const bypassSecret = process.env.WAITLIST_BYPASS_SECRET;
  const previewParam =
    request.nextUrl.searchParams.get("preview") ||
    request.nextUrl.searchParams.get("bypass");

  // 1. Support clearing the bypass cookie (?preview=clear or ?bypass=clear)
  if (previewParam === "clear") {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("preview");
    cleanUrl.searchParams.delete("bypass");
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.delete(WAITLIST_BYPASS_COOKIE_NAME);
    if (options?.requestId) {
      response.headers.set("x-request-id", options.requestId);
    }
    return response;
  }

  // 2. Unlocking preview via secret query param (?preview=SECRET or ?bypass=SECRET)
  if (bypassSecret && previewParam === bypassSecret) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("preview");
    cleanUrl.searchParams.delete("bypass");
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(WAITLIST_BYPASS_COOKIE_NAME, bypassSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: WAITLIST_BYPASS_COOKIE_MAX_AGE,
      path: "/",
    });
    if (options?.requestId) {
      response.headers.set("x-request-id", options.requestId);
    }
    return response;
  }

  // 3. Check if user already holds a valid bypass cookie
  if (isWaitlistBypassed(request)) {
    return null;
  }

  // 4. If path is public / permitted in waitlist mode, proceed
  if (isAllowedWaitlistPath(pathname)) {
    return null;
  }

  // 5. Redirect any protected/dashboard route to /waitlist
  const url = request.nextUrl.clone();
  url.pathname = "/waitlist";
  const redirectRes = NextResponse.redirect(url);
  if (options?.requestId) {
    redirectRes.headers.set("x-request-id", options.requestId);
  }
  return redirectRes;
}

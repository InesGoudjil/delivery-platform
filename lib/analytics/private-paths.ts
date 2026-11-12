/**
 * Pages where no analytics, tracking pixel or session replay runs.
 *
 * Their URLs carry secrets (client-room share tokens, invitation tokens, password-reset
 * and sign-in codes), and what happens on them (a client reviewing a cut, someone
 * resetting a password) isn't ours to send to Meta or PostHog.
 */
const PRIVATE_PATH_PREFIXES = [
  "/deliver", // client rooms: /deliver/<share token>
  "/invite", // workspace invitations: /invite/<token>
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/api/auth",
] as const;

/** True for a private page, and when the path is unknown (fail closed). */
export function isPrivateAnalyticsPath(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  return PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Same check for a full or relative URL, e.g. an analytics event's `$current_url`. */
export function isPrivateAnalyticsUrl(url: unknown): boolean {
  if (typeof url !== "string" || url.length === 0) return true;
  try {
    return isPrivateAnalyticsPath(new URL(url, "https://placeholder.invalid").pathname);
  } catch {
    return true;
  }
}

/** The current browser page is private (always true on the server). */
export function isOnPrivatePage(): boolean {
  if (typeof window === "undefined") return true;
  return isPrivateAnalyticsPath(window.location.pathname);
}

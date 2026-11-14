/**
 * Platform admins must use a two-factor (aal2) session to open the admin panel or run an
 * admin action.
 *
 * Outside production, ADMIN_MFA_OPTIONAL=true turns the requirement off, for a local Supabase
 * where TOTP is disabled. Production builds ignore it, and Vercel previews and staging are
 * production builds too.
 */
export function isAdminMfaRequired(): boolean {
  if (process.env.NODE_ENV === "production") return true;
  return process.env.ADMIN_MFA_OPTIONAL !== "true";
}

/** Same-site path to return to after the two-factor check; anything else falls back to /admin. */
export function safeReturnPath(raw: string | null | undefined, fallback = "/admin"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

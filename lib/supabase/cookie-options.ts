import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Options for Supabase's auth cookies, shared by the browser client, the server client and the
 * middleware. They sit on top of @supabase/ssr's defaults: path /, SameSite=Lax, 400 days, and
 * readable by the browser client (it needs the tokens).
 *
 * Secure in production, so the session never travels over plain HTTP. That includes Vercel
 * previews and staging, which are production builds served over HTTPS.
 */
export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  secure: process.env.NODE_ENV === "production",
};

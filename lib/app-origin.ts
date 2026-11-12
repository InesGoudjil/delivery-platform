import { env } from "@/lib/env";

/**
 * The app's public origin from NEXT_PUBLIC_APP_URL, for links in emails and WhatsApp
 * messages. Null when it isn't set to a usable URL, or still points at localhost in
 * production (a link nobody could open).
 */
export function configuredAppOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_APP_URL;
  if (!configured) return null;
  try {
    const origin = new URL(configured).origin;
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    return isLocal && process.env.NODE_ENV === "production" ? null : origin;
  } catch {
    return null;
  }
}

import { parseUserAgentString } from '@/lib/session-parser';
import type { UserSession } from '@/core/entities/user-session';
import type { DeviceDetails } from '@/core/repositories/user-session.repository';
import type { SessionIdentity, SessionService } from '@/core/services/session.service';

/**
 * Device rows are keyed on the Supabase login (the access token's session_id claim), not on a
 * cookie. This edge-safe module is shared by the middleware, sign-in paths and sign-out.
 */

/**
 * The old device tracking kept a random id in this cookie. Nothing reads it any more; the
 * middleware and sign-out delete it wherever it is still set.
 */
export const LEGACY_SESSION_COOKIE_NAME = 'cinespace_sid';

function decodeHeader(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isLocalAddress(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
}

/** Device and network details for a user_sessions row, from the request headers. */
export function deviceInfoFromHeaders(headers: Headers): DeviceDetails {
  const ipAddress =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    '127.0.0.1';

  const rawCity = headers.get('x-vercel-ip-city') || headers.get('cf-ipcity') || undefined;
  const country = headers.get('x-vercel-ip-country') || headers.get('cf-ipcountry') || undefined;

  let city = rawCity ? decodeHeader(rawCity) : undefined;
  if (!city && isLocalAddress(ipAddress)) city = 'Local Development';

  const { browser, os, deviceType } = parseUserAgentString(headers.get('user-agent') || '');
  return { ipAddress, browser, os, deviceType, city, country };
}

/**
 * Records the device behind a login: sign-in paths call it right after the login is created,
 * and the middleware for any login it sees without a row. An existing row is never reset, so a
 * revoked login stays revoked. Returns the stored row, or null when there is no login.
 */
export async function trackUserSession(
  sessionService: Pick<SessionService, 'registerSession'>,
  identity: SessionIdentity | null,
  requestHeaders: Headers
): Promise<UserSession | null> {
  if (!identity) return null;
  return sessionService.registerSession({
    userId: identity.userId,
    sessionTokenId: identity.sessionId,
    ...deviceInfoFromHeaders(requestHeaders),
  });
}

export interface SignOutServices {
  auth: {
    getSessionIdentity(): Promise<SessionIdentity | null>;
    signOut(): Promise<{ error: Error | null }>;
  };
  session: Pick<SessionService, 'markSignedOut'>;
}

/** The parts of Next's cookie store sign-out needs (`await cookies()`). */
export interface SignOutCookieStore {
  get(name: string): unknown;
  delete(name: string): unknown;
}

/**
 * Signs this device out: flags its login's row revoked (so its last access token is turned away
 * too), ends the Supabase login for this device only (other devices stay signed in) and deletes
 * the legacy tracking cookie. Never throws; a failure to flag the row doesn't stop the sign-out.
 */
export async function signOutCurrentSession(
  services: SignOutServices,
  cookieStore: SignOutCookieStore
): Promise<void> {
  const identity = await services.auth.getSessionIdentity();
  if (identity) {
    try {
      await services.session.markSignedOut(identity);
    } catch (err) {
      console.warn(
        '[SessionManager] Could not flag the session row on sign-out:',
        err instanceof Error ? err.message : err
      );
    }
  }

  const { error } = await services.auth.signOut();
  if (error) {
    console.warn('[SessionManager] Supabase sign-out returned an error:', error.message);
  }

  try {
    if (cookieStore.get(LEGACY_SESSION_COOKIE_NAME)) cookieStore.delete(LEGACY_SESSION_COOKIE_NAME);
  } catch {
    // Read-only cookie store (Server Component); nothing reads the cookie anyway.
  }
}

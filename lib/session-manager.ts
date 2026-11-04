import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { parseClientDeviceInfo } from '@/lib/session-parser';
import { SessionService } from '@/core/services/session.service';

export const SESSION_COOKIE_NAME = 'cinespace_sid';

/**
 * Ensures the client has a session tracking cookie and records/updates the device session in PostgreSQL.
 */
export async function trackUserSession(
  userId: string,
  sessionService: SessionService
): Promise<string> {
  const cookieStore = await cookies();
  let sessionTokenId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionTokenId) {
    sessionTokenId = randomUUID();
    cookieStore.set(SESSION_COOKIE_NAME, sessionTokenId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  }

  try {
    const deviceInfo = await parseClientDeviceInfo();
    await sessionService.registerSession({
      userId,
      sessionTokenId,
      ipAddress: deviceInfo.ipAddress,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      deviceType: deviceInfo.deviceType,
      city: deviceInfo.city,
      country: deviceInfo.country,
    });
  } catch (err: any) {
    console.warn('[SessionManager] Could not record user session:', err.message);
  }

  return sessionTokenId;
}

/**
 * Retrieves the current session token ID from request cookies.
 */
export async function getCurrentSessionTokenId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

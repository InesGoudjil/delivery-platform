'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getServerServices } from '@/core/server';
import { trackUserSession } from '@/lib/session-manager';
import type { DeviceType, UserSession } from '@/core/entities/user-session';

/**
 * One signed-in device, as the security page shows it. Session ids stay on the server: `id` is
 * the row id (what revokeSessionAction takes) and `isCurrent` marks the device asking.
 */
export interface DeviceSession {
  id: string;
  browser: string;
  os: string;
  deviceType: DeviceType;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface SessionsResponse {
  success: boolean;
  data?: DeviceSession[];
  error?: string;
}

const UNVERIFIED_SESSION = "Couldn't verify this device's session. Please sign in again.";

function toDeviceSession(session: UserSession, currentSessionId: string): DeviceSession {
  return {
    id: session.id,
    browser: session.browser,
    os: session.os,
    deviceType: session.deviceType,
    ipAddress: session.ipAddress ?? null,
    city: session.city ?? null,
    country: session.country ?? null,
    lastActiveAt: session.lastActiveAt,
    createdAt: session.createdAt,
    isCurrent: session.sessionTokenId === currentSessionId,
  };
}

export async function getActiveSessionsAction(): Promise<SessionsResponse> {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    const current = await services.auth.getSessionIdentity();
    if (!current || current.userId !== user.id) {
      return { success: false, error: UNVERIFIED_SESSION, data: [] };
    }

    // List this device even if its login has no row yet. Never un-revokes a row.
    try {
      await trackUserSession(services.session, current, await headers());
    } catch (err) {
      console.warn('[getActiveSessionsAction] Could not record this device:', err instanceof Error ? err.message : err);
    }

    const sessions = await services.session.listActiveSessions(user.id);
    return { success: true, data: sessions.map((s) => toDeviceSession(s, current.sessionId)) };
  } catch (err) {
    console.error('[getActiveSessionsAction] Error:', err);
    return { success: false, error: 'Failed to fetch sessions', data: [] };
  }
}

/** Signs one of the caller's other devices out. `sessionId` is a DeviceSession id. */
export async function revokeSessionAction(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const current = await services.auth.getSessionIdentity();
    if (!current || current.userId !== user.id) {
      return { success: false, error: UNVERIFIED_SESSION };
    }

    // Looked up within the caller's own rows: another user's row id is 'not_found'.
    const outcome = await services.session.revokeSession(current, sessionId);
    if (outcome === 'not_found') {
      return { success: false, error: 'Session not found.' };
    }
    if (outcome === 'current') {
      return { success: false, error: "That's the device you're using. Sign out instead." };
    }

    revalidatePath('/[workspaceSlug]/security', 'page');
    return { success: true };
  } catch (err) {
    console.error('[revokeSessionAction] Error:', err);
    return { success: false, error: 'Failed to sign out that device. Please try again.' };
  }
}

/** Signs every other device of the caller out; this one stays signed in. */
export async function revokeAllOtherSessionsAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const current = await services.auth.getSessionIdentity();
    if (!current || current.userId !== user.id) {
      return { success: false, error: UNVERIFIED_SESSION };
    }

    // Rows first: the middleware turns those devices away even if the next step fails.
    await services.session.revokeAllOtherSessions(current);

    // End every other Supabase login of the caller, including logins without a row.
    const { error } = await services.auth.signOutOthers();
    if (error) {
      console.error('[revokeAllOtherSessionsAction] Supabase sign-out of other sessions failed:', error);
      return { success: false, error: 'Failed to sign out your other devices. Please try again.' };
    }

    revalidatePath('/[workspaceSlug]/security', 'page');
    return { success: true };
  } catch (err) {
    console.error('[revokeAllOtherSessionsAction] Error:', err);
    return { success: false, error: 'Failed to sign out your other devices. Please try again.' };
  }
}

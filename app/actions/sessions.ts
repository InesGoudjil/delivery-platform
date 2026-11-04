'use server';

import { getServerServices } from '@/core/server';
import { getCurrentSessionTokenId, trackUserSession } from '@/lib/session-manager';
import { UserSession } from '@/core/entities/user-session';
import { revalidatePath } from 'next/cache';

export interface SessionsResponse {
  success: boolean;
  data?: UserSession[];
  error?: string;
}

export async function getActiveSessionsAction(): Promise<SessionsResponse> {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    // Auto-record / touch current session so current device is registered immediately
    const currentSid = await trackUserSession(user.id, services.session);

    const sessions = await services.session.listActiveSessions(user.id);

    const formattedSessions = sessions.map((s) => ({
      ...s,
      isCurrent: s.sessionTokenId === currentSid,
    }));

    return { success: true, data: formattedSessions };
  } catch (err: any) {
    console.error('[getActiveSessionsAction] Error:', err);
    return { success: false, error: err.message || 'Failed to fetch sessions', data: [] };
  }
}

export async function revokeSessionAction(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    await services.session.revokeSession(sessionId, user.id);
    revalidatePath('/[workspaceSlug]/security', 'page');
    return { success: true };
  } catch (err: any) {
    console.error('[revokeSessionAction] Error:', err);
    return { success: false, error: err.message || 'Failed to revoke session' };
  }
}

export async function revokeAllOtherSessionsAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const currentSid = await getCurrentSessionTokenId();
    if (currentSid) {
      await services.session.revokeAllOtherSessions(user.id, currentSid);
    }

    // Invalidate Supabase's refresh tokens for other sessions
    await services.auth.signOutOthers();

    revalidatePath('/[workspaceSlug]/security', 'page');
    return { success: true };
  } catch (err: any) {
    console.error('[revokeAllOtherSessionsAction] Error:', err);
    return { success: false, error: err.message || 'Failed to sign out other sessions' };
  }
}

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { UserSession, DeviceType } from '@/core/entities/user-session';

export interface IUserSessionRepository {
  upsertSession(data: {
    userId: string;
    sessionTokenId: string;
    ipAddress?: string;
    browser: string;
    os: string;
    deviceType: DeviceType;
    city?: string;
    country?: string;
  }): Promise<UserSession>;

  listActiveByUserId(userId: string): Promise<UserSession[]>;
  findByTokenId(sessionTokenId: string): Promise<UserSession | null>;
  revokeSession(sessionId: string, userId: string): Promise<void>;
  revokeAllOtherSessions(userId: string, currentSessionTokenId: string): Promise<void>;
  updateLastActive(sessionTokenId: string): Promise<void>;
}

export class SupabaseUserSessionRepository implements IUserSessionRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): UserSession {
    return {
      id: row.id,
      userId: row.user_id,
      sessionTokenId: row.session_token_id,
      ipAddress: row.ip_address,
      browser: row.browser || 'Web Browser',
      browserVersion: row.browser_version,
      os: row.os || 'Desktop',
      osVersion: row.os_version,
      deviceType: (row.device_type as DeviceType) || 'desktop',
      city: row.city,
      country: row.country,
      isRevoked: Boolean(row.is_revoked),
      lastActiveAt: row.last_active_at,
      createdAt: row.created_at,
    };
  }

  async upsertSession(data: {
    userId: string;
    sessionTokenId: string;
    ipAddress?: string;
    browser: string;
    os: string;
    deviceType: DeviceType;
    city?: string;
    country?: string;
  }): Promise<UserSession> {
    const { data: row, error } = await (this.supabase as any)
      .from('user_sessions')
      .upsert(
        {
          user_id: data.userId,
          session_token_id: data.sessionTokenId,
          ip_address: data.ipAddress,
          browser: data.browser,
          os: data.os,
          device_type: data.deviceType,
          city: data.city,
          country: data.country,
          is_revoked: false,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: 'session_token_id' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[UserSessionRepository] Error upserting session:', error);
      throw new Error(`Failed to save user session: ${error.message}`);
    }

    return this.mapRowToEntity(row);
  }

  async listActiveByUserId(userId: string): Promise<UserSession[]> {
    const { data, error } = await (this.supabase as any)
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_revoked', false)
      .order('last_active_at', { ascending: false });

    if (error) {
      console.error('[UserSessionRepository] Error listing sessions:', error);
      return [];
    }

    return (data || []).map(this.mapRowToEntity);
  }

  async findByTokenId(sessionTokenId: string): Promise<UserSession | null> {
    const { data, error } = await (this.supabase as any)
      .from('user_sessions')
      .select('*')
      .eq('session_token_id', sessionTokenId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRowToEntity(data);
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('user_sessions')
      .update({ is_revoked: true })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('[UserSessionRepository] Error revoking session:', error);
      throw new Error(`Failed to revoke session: ${error.message}`);
    }
  }

  async revokeAllOtherSessions(userId: string, currentSessionTokenId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('user_sessions')
      .update({ is_revoked: true })
      .eq('user_id', userId)
      .neq('session_token_id', currentSessionTokenId);

    if (error) {
      console.error('[UserSessionRepository] Error revoking other sessions:', error);
      throw new Error(`Failed to revoke other sessions: ${error.message}`);
    }
  }

  async updateLastActive(sessionTokenId: string): Promise<void> {
    await (this.supabase as any)
      .from('user_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('session_token_id', sessionTokenId);
  }
}

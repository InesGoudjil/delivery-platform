import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { UserSession, DeviceType } from '@/core/entities/user-session';

/** What a sign-in records about the device behind it. */
export interface DeviceDetails {
  ipAddress?: string;
  browser: string;
  os: string;
  deviceType: DeviceType;
  city?: string;
  country?: string;
}

export interface NewUserSession extends DeviceDetails {
  userId: string;
  /** The Supabase login's id: the access token's `session_id` claim (auth.sessions.id). */
  sessionTokenId: string;
}

export interface InsertSessionResult {
  session: UserSession;
  /** False when the login already had a row; that row was left exactly as it was. */
  created: boolean;
}

/**
 * public.user_sessions: one row per Supabase login, keyed on session_token_id.
 *
 * The server writes this table with the service role (row-level security off), so every method
 * is scoped to one user. Writes report what they changed (null / false / the changed rows), and
 * database errors are thrown, never swallowed.
 */
export interface IUserSessionRepository {
  /**
   * Records a login the first time it is seen. An existing row is never modified, so a revoked
   * login stays revoked. Returns the user's row, or null when the id belongs to another user.
   */
  insertIfAbsent(data: NewUserSession): Promise<InsertSessionResult | null>;
  /** The user's row for a login, revoked or not. */
  findByTokenId(userId: string, sessionTokenId: string): Promise<UserSession | null>;
  /** The user's row with this row id, revoked or not. */
  findById(userId: string, id: string): Promise<UserSession | null>;
  /** The user's rows that aren't revoked, most recently active first. */
  listActiveByUserId(userId: string): Promise<UserSession[]>;
  /** Flags one of the user's rows revoked. Returns it, or null when the user has no such row. */
  revokeById(userId: string, id: string): Promise<UserSession | null>;
  /** Flags the user's row for a login revoked. Returns it, or null when the login has no row. */
  revokeByTokenId(userId: string, sessionTokenId: string): Promise<UserSession | null>;
  /** Flags every active row of the user except one login's revoked. Returns the rows it flagged. */
  revokeAllExcept(userId: string, keepSessionTokenId: string): Promise<UserSession[]>;
  /** Refreshes an active row's last-active time and device details. False when nothing matched. */
  touch(userId: string, sessionTokenId: string, device: Partial<DeviceDetails>): Promise<boolean>;
  /**
   * Ends the Supabase login itself (its auth.sessions row and refresh tokens), through
   * public.revoke_auth_session. Service role only. False when the user has no such login.
   */
  endAuthSession(userId: string, sessionId: string): Promise<boolean>;
}

interface UserSessionRow {
  id: string;
  user_id: string;
  session_token_id: string;
  ip_address: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device_type: string | null;
  city: string | null;
  country: string | null;
  is_revoked: boolean;
  last_active_at: string;
  created_at: string;
}

function mapRowToEntity(row: UserSessionRow): UserSession {
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

function fail(action: string, error: { message?: string }): never {
  throw new Error(`Failed to ${action}: ${error.message ?? 'unknown database error'}`);
}

export class SupabaseUserSessionRepository implements IUserSessionRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /** user_sessions and revoke_auth_session aren't in the generated Database types. */
  private get db(): any {
    return this.supabase as any;
  }

  async insertIfAbsent(data: NewUserSession): Promise<InsertSessionResult | null> {
    const { data: inserted, error } = await this.db
      .from('user_sessions')
      .upsert(
        {
          user_id: data.userId,
          session_token_id: data.sessionTokenId,
          ip_address: data.ipAddress ?? null,
          browser: data.browser,
          os: data.os,
          device_type: data.deviceType,
          city: data.city ?? null,
          country: data.country ?? null,
        },
        // INSERT ... ON CONFLICT DO NOTHING: an existing row, revoked or not, stays as it is.
        { onConflict: 'session_token_id', ignoreDuplicates: true }
      )
      .select('*');

    if (error) fail('record the user session', error);

    const row = (inserted as UserSessionRow[] | null)?.[0];
    if (row) {
      return { session: mapRowToEntity(row), created: true };
    }

    const existing = await this.findByTokenId(data.userId, data.sessionTokenId);
    return existing ? { session: existing, created: false } : null;
  }

  async findByTokenId(userId: string, sessionTokenId: string): Promise<UserSession | null> {
    const { data, error } = await this.db
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_token_id', sessionTokenId)
      .maybeSingle();

    if (error) fail('load the user session', error);
    return data ? mapRowToEntity(data as UserSessionRow) : null;
  }

  async findById(userId: string, id: string): Promise<UserSession | null> {
    const { data, error } = await this.db
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();

    if (error) fail('load the user session', error);
    return data ? mapRowToEntity(data as UserSessionRow) : null;
  }

  async listActiveByUserId(userId: string): Promise<UserSession[]> {
    const { data, error } = await this.db
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_revoked', false)
      .order('last_active_at', { ascending: false });

    if (error) fail('list user sessions', error);
    return ((data as UserSessionRow[] | null) ?? []).map(mapRowToEntity);
  }

  async revokeById(userId: string, id: string): Promise<UserSession | null> {
    const { data, error } = await this.db
      .from('user_sessions')
      .update({ is_revoked: true })
      .eq('user_id', userId)
      .eq('id', id)
      .select('*');

    if (error) fail('revoke the user session', error);
    const row = (data as UserSessionRow[] | null)?.[0];
    return row ? mapRowToEntity(row) : null;
  }

  async revokeByTokenId(userId: string, sessionTokenId: string): Promise<UserSession | null> {
    const { data, error } = await this.db
      .from('user_sessions')
      .update({ is_revoked: true })
      .eq('user_id', userId)
      .eq('session_token_id', sessionTokenId)
      .select('*');

    if (error) fail('revoke the user session', error);
    const row = (data as UserSessionRow[] | null)?.[0];
    return row ? mapRowToEntity(row) : null;
  }

  async revokeAllExcept(userId: string, keepSessionTokenId: string): Promise<UserSession[]> {
    const { data, error } = await this.db
      .from('user_sessions')
      .update({ is_revoked: true })
      .eq('user_id', userId)
      .eq('is_revoked', false)
      .neq('session_token_id', keepSessionTokenId)
      .select('*');

    if (error) fail('revoke the other user sessions', error);
    return ((data as UserSessionRow[] | null) ?? []).map(mapRowToEntity);
  }

  async touch(userId: string, sessionTokenId: string, device: Partial<DeviceDetails>): Promise<boolean> {
    const changes: Record<string, string | null> = { last_active_at: new Date().toISOString() };
    if (device.ipAddress !== undefined) changes.ip_address = device.ipAddress;
    if (device.browser !== undefined) changes.browser = device.browser;
    if (device.os !== undefined) changes.os = device.os;
    if (device.deviceType !== undefined) changes.device_type = device.deviceType;
    if (device.city !== undefined) changes.city = device.city;
    if (device.country !== undefined) changes.country = device.country;

    const { data, error } = await this.db
      .from('user_sessions')
      .update(changes)
      .eq('user_id', userId)
      .eq('session_token_id', sessionTokenId)
      .eq('is_revoked', false)
      .select('id');

    if (error) fail('update the user session', error);
    return ((data as unknown[] | null) ?? []).length > 0;
  }

  async endAuthSession(userId: string, sessionId: string): Promise<boolean> {
    const { data, error } = await this.db.rpc('revoke_auth_session', {
      p_user_id: userId,
      p_session_id: sessionId,
    });

    if (error) fail('end the login session', error);
    return data === true;
  }
}

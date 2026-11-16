import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { UserProfile, PlatformRole } from '@/core/entities/user-profile';

export interface IUserProfileRepository {
  findById(id: string): Promise<UserProfile | null>;
  listAll(limit?: number): Promise<UserProfile[]>;
  create(profile: { id: string; fullName?: string | null; avatarUrl?: string | null; platformRole?: PlatformRole }): Promise<UserProfile>;
  update(id: string, data: Partial<UserProfile>): Promise<UserProfile>;
  upsert(profile: { id: string; fullName?: string | null; avatarUrl?: string | null; platformRole?: PlatformRole; lastLoginAt?: string | null; lastLoginIp?: string | null }): Promise<UserProfile>;
  updatePlatformRole(id: string, role: PlatformRole): Promise<UserProfile>;
  updateLoginInfo(id: string, ip?: string): Promise<void>;
  /** Service role only: a trigger refuses API users (20261116170000_account_settings). */
  recordTermsAcceptance(id: string, version: string): Promise<void>;
  /** Service role only (auth_user_has_password): false for Google-only users. */
  hasPassword(id: string): Promise<boolean>;
}

export class SupabaseUserProfileRepository implements IUserProfileRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): UserProfile {
    return {
      id: row.id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      platformRole: row.platform_role || 'user',
      lastLoginAt: row.last_login_at,
      lastLoginIp: row.last_login_ip,
      // undefined (not null) while the columns don't exist yet (migration 20261116170000 not applied),
      // so finishSignIn can tell "not accepted" from "can't record it".
      termsVersion: row.terms_version,
      termsAcceptedAt: row.terms_accepted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async recordTermsAcceptance(id: string, version: string): Promise<void> {
    const acceptance = { terms_version: version, terms_accepted_at: new Date().toISOString() };
    const { data, error } = await (this.supabase as any)
      .from('user_profiles')
      .update(acceptance)
      .eq('id', id)
      .select('id');
    if (error) throw new Error(`Error recording terms acceptance: ${error.message}`);
    if (data?.length) return;

    // The sign-up trigger makes every profile, but a missing row must not leave the user unable to
    // accept: create it.
    const { error: insertError } = await (this.supabase as any)
      .from('user_profiles')
      .insert({ id, ...acceptance });
    if (insertError) throw new Error(`Error recording terms acceptance: ${insertError.message}`);
  }

  async hasPassword(id: string): Promise<boolean> {
    const { data, error } = await (this.supabase as any).rpc('auth_user_has_password', { p_user_id: id });
    if (error) throw new Error(`Error reading the password status: ${error.message}`);
    return data === true;
  }

  async findById(id: string): Promise<UserProfile | null> {
    const { data, error } = await (this.supabase as any)
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching user profile: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listAll(limit = 100): Promise<UserProfile[]> {
    const { data, error } = await (this.supabase as any)
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Error listing user profiles: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async create(profile: { id: string; fullName?: string | null; avatarUrl?: string | null; platformRole?: PlatformRole }): Promise<UserProfile> {
    const { data, error } = await (this.supabase as any)
      .from('user_profiles')
      .insert({
        id: profile.id,
        full_name: profile.fullName,
        avatar_url: profile.avatarUrl,
        platform_role: profile.platformRole || 'user',
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating user profile: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const payload: any = {};
    if (data.fullName !== undefined) payload.full_name = data.fullName;
    if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
    if (data.platformRole !== undefined) payload.platform_role = data.platformRole;
    if (data.lastLoginAt !== undefined) payload.last_login_at = data.lastLoginAt;
    if (data.lastLoginIp !== undefined) payload.last_login_ip = data.lastLoginIp;

    const { data: updated, error } = await (this.supabase as any)
      .from('user_profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error updating user profile: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async upsert(profile: {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    platformRole?: PlatformRole;
    lastLoginAt?: string | null;
    lastLoginIp?: string | null;
  }): Promise<UserProfile> {
    const payload: any = {
      id: profile.id,
      updated_at: new Date().toISOString(),
    };
    if (profile.fullName !== undefined) payload.full_name = profile.fullName;
    if (profile.avatarUrl !== undefined) payload.avatar_url = profile.avatarUrl;
    if (profile.platformRole !== undefined) payload.platform_role = profile.platformRole;
    if (profile.lastLoginAt !== undefined) payload.last_login_at = profile.lastLoginAt;
    if (profile.lastLoginIp !== undefined) payload.last_login_ip = profile.lastLoginIp;

    const { data, error } = await (this.supabase as any)
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(`Error upserting user profile: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async updatePlatformRole(id: string, role: PlatformRole): Promise<UserProfile> {
    const { data: updated, error } = await (this.supabase as any)
      .from('user_profiles')
      .update({ platform_role: role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error updating platform role: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async updateLoginInfo(id: string, ip?: string): Promise<void> {
    await (this.supabase as any)
      .from('user_profiles')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: ip,
      })
      .eq('id', id);
  }
}

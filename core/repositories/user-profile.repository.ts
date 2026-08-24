import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { UserProfile, PlatformRole } from '@/core/entities/user-profile';

export interface IUserProfileRepository {
  findById(id: string): Promise<UserProfile | null>;
  listAll(limit?: number): Promise<UserProfile[]>;
  create(profile: { id: string; fullName?: string | null; avatarUrl?: string | null; platformRole?: PlatformRole }): Promise<UserProfile>;
  update(id: string, data: Partial<UserProfile>): Promise<UserProfile>;
  updatePlatformRole(id: string, role: PlatformRole): Promise<UserProfile>;
  updateLoginInfo(id: string, ip?: string): Promise<void>;
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
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

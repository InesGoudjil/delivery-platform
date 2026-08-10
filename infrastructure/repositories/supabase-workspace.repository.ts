import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Workspace } from '@/core/entities/workspace';
import { IWorkspaceRepository, CreateWorkspaceDTO } from '@/core/repositories/i-workspace-repository';

export class SupabaseWorkspaceRepository implements IWorkspaceRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Workspace {
    return {
      id: row.id,
      ownerId: row.owner_id,
      brandName: row.brand_name,
      slug: row.slug,
      logoUrl: row.logo_url,
      customDomain: row.custom_domain,
      accentColor: row.accent_color,
      defaultLanguage: row.default_language,
      storageLimitBytes: row.storage_limit_bytes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByOwnerId(ownerId: string): Promise<Workspace | null> {
    const { data, error } = await (this.supabase as any)
      .from('workspaces')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching workspace: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const { data, error } = await (this.supabase as any)
      .from('workspaces')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw new Error(`Error fetching workspace by slug: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findById(id: string): Promise<Workspace | null> {
    const { data, error } = await (this.supabase as any)
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching workspace: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async create(dto: CreateWorkspaceDTO): Promise<Workspace> {
    const { data, error } = await (this.supabase as any)
      .from('workspaces')
      .insert({
        owner_id: dto.ownerId,
        brand_name: dto.brandName,
        slug: dto.slug,
        logo_url: dto.logoUrl,
        custom_domain: dto.customDomain,
        accent_color: dto.accentColor,
        default_language: dto.defaultLanguage ?? 'ar',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create workspace: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<Workspace>): Promise<Workspace> {
    const { data: updated, error } = await (this.supabase as any)
      .from('workspaces')
      .update({
        brand_name: data.brandName,
        logo_url: data.logoUrl,
        custom_domain: data.customDomain,
        accent_color: data.accentColor,
        default_language: data.defaultLanguage,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update workspace: ${error.message}`);
    return this.mapRowToEntity(updated);
  }
}

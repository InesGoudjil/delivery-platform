import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Workspace, WorkspaceFeatures, WorkspaceFeatureConfig, AccountType, Language } from '@/core/entities/workspace';

export interface CreateWorkspaceDTO {
  ownerId: string;
  brandName: string;
  slug: string;
  logoUrl?: string | null;
  customDomain?: string | null;
  accentColor?: string | null;
  defaultLanguage?: Language;
  accountType?: AccountType;
}

export interface IWorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findByOwnerId(ownerId: string): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  findByCustomDomain(customDomain: string): Promise<Workspace | null>;
  create(dto: CreateWorkspaceDTO): Promise<Workspace>;
  update(id: string, data: Partial<Workspace>): Promise<Workspace>;
  delete(id: string): Promise<void>;
}

export interface IWorkspaceFeaturesRepository {
  findByWorkspaceId(workspaceId: string): Promise<WorkspaceFeatures | null>;
  upsertFeatures(workspaceId: string, features: WorkspaceFeatureConfig): Promise<WorkspaceFeatures>;
}

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
      accountType: row.account_type || 'individual',
      storageUsedBytes: Number(row.storage_used_bytes || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
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

  async findByOwnerId(ownerId: string): Promise<Workspace | null> {
    const { data, error } = await (this.supabase as any)
      .from('workspaces')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching workspace by owner: ${error.message}`);
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

  async findByCustomDomain(customDomain: string): Promise<Workspace | null> {
    const { data, error } = await (this.supabase as any)
      .from('workspaces')
      .select('*')
      .eq('custom_domain', customDomain)
      .maybeSingle();

    if (error) throw new Error(`Error fetching workspace by domain: ${error.message}`);
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
        accent_color: dto.accentColor || '#000000',
        default_language: dto.defaultLanguage ?? 'ar',
        account_type: dto.accountType ?? 'individual',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create workspace: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<Workspace>): Promise<Workspace> {
    const payload: any = {};
    if (data.brandName !== undefined) payload.brand_name = data.brandName;
    if (data.slug !== undefined) payload.slug = data.slug;
    if (data.logoUrl !== undefined) payload.logo_url = data.logoUrl;
    if (data.customDomain !== undefined) payload.custom_domain = data.customDomain;
    if (data.accentColor !== undefined) payload.accent_color = data.accentColor;
    if (data.defaultLanguage !== undefined) payload.default_language = data.defaultLanguage;
    if (data.accountType !== undefined) payload.account_type = data.accountType;
    if (data.storageUsedBytes !== undefined) payload.storage_used_bytes = data.storageUsedBytes;

    const { data: updated, error } = await (this.supabase as any)
      .from('workspaces')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update workspace: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete workspace: ${error.message}`);
  }
}

export class SupabaseWorkspaceFeaturesRepository implements IWorkspaceFeaturesRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByWorkspaceId(workspaceId: string): Promise<WorkspaceFeatures | null> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_features')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching workspace features: ${error.message}`);
    if (!data) return null;

    return {
      workspaceId: data.workspace_id,
      features: (data.features || {}) as WorkspaceFeatureConfig,
      updatedAt: data.updated_at,
    };
  }

  async upsertFeatures(workspaceId: string, features: WorkspaceFeatureConfig): Promise<WorkspaceFeatures> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_features')
      .upsert(
        {
          workspace_id: workspaceId,
          features: features as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id' }
      )
      .select()
      .single();

    if (error) throw new Error(`Error upserting workspace features: ${error.message}`);

    return {
      workspaceId: data.workspace_id,
      features: (data.features || {}) as WorkspaceFeatureConfig,
      updatedAt: data.updated_at,
    };
  }
}

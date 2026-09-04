import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Portfolio, PortfolioProject, SocialLinks } from '@/core/entities/portfolio';

export interface CreatePortfolioDTO {
  workspaceId: string;
  slug: string;
  title: string;
  bio?: string | null;
  coverAssetUrl?: string | null;
  socialLinks?: SocialLinks;
  isPublished?: boolean;
}

export interface IPortfolioRepository {
  findById(id: string): Promise<Portfolio | null>;
  findByWorkspaceId(workspaceId: string): Promise<Portfolio | null>;
  findBySlug(slug: string): Promise<Portfolio | null>;
  create(dto: CreatePortfolioDTO): Promise<Portfolio>;
  update(id: string, data: Partial<Portfolio>): Promise<Portfolio>;
  delete(id: string): Promise<void>;
  
  // Featured projects junction
  getFeaturedProjects(portfolioId: string): Promise<PortfolioProject[]>;
  addFeaturedProject(portfolioId: string, projectId: string, displayOrder?: number): Promise<void>;
  removeFeaturedProject(portfolioId: string, projectId: string): Promise<void>;
  reorderFeaturedProjects(portfolioId: string, projectIdsInOrder: string[]): Promise<void>;
}

export class SupabasePortfolioRepository implements IPortfolioRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Portfolio {
    const defaultAppearance = {
      cardSize: "M" as const,
      aspectRatio: "16:9" as const,
      thumbnailScale: "fill" as const,
      showClientInfo: true,
    };

    return {
      id: row.id,
      workspaceId: row.workspace_id,
      slug: row.slug,
      title: row.title,
      bio: row.bio,
      coverAssetUrl: row.cover_asset_url,
      socialLinks: (row.social_links as SocialLinks) || {},
      isPublished: row.is_published ?? true,
      appearance: row.appearance ? { ...defaultAppearance, ...row.appearance } : defaultAppearance,
      experience: Array.isArray(row.experience) ? row.experience : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Portfolio | null> {
    const { data, error } = await (this.supabase as any)
      .from('portfolios')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching portfolio: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findByWorkspaceId(workspaceId: string): Promise<Portfolio | null> {
    const { data, error } = await (this.supabase as any)
      .from('portfolios')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching portfolio: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findBySlug(slug: string): Promise<Portfolio | null> {
    const { data, error } = await (this.supabase as any)
      .from('portfolios')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw new Error(`Error fetching portfolio by slug: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async create(dto: CreatePortfolioDTO): Promise<Portfolio> {
    const { data, error } = await (this.supabase as any)
      .from('portfolios')
      .insert({
        workspace_id: dto.workspaceId,
        slug: dto.slug,
        title: dto.title,
        bio: dto.bio,
        cover_asset_url: dto.coverAssetUrl,
        social_links: dto.socialLinks || {},
        is_published: dto.isPublished ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create portfolio: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<Portfolio>): Promise<Portfolio> {
    const payload: any = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.slug !== undefined) payload.slug = data.slug;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.coverAssetUrl !== undefined) payload.cover_asset_url = data.coverAssetUrl;
    if (data.socialLinks !== undefined) payload.social_links = data.socialLinks;
    if (data.isPublished !== undefined) payload.is_published = data.isPublished;
    if (data.appearance !== undefined) payload.appearance = data.appearance;
    if (data.experience !== undefined) payload.experience = data.experience;

    const { data: updated, error } = await (this.supabase as any)
      .from('portfolios')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update portfolio: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('portfolios')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete portfolio: ${error.message}`);
  }

  async getFeaturedProjects(portfolioId: string): Promise<PortfolioProject[]> {
    const { data, error } = await (this.supabase as any)
      .from('portfolio_projects')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('display_order', { ascending: true });

    if (error) throw new Error(`Error fetching featured portfolio items: ${error.message}`);
    return (data || []).map((row: any) => ({
      portfolioId: row.portfolio_id,
      projectId: row.project_id ?? null,
      assetId: row.asset_id ?? null,
      displayOrder: row.display_order,
    }));
  }

  async addFeaturedItem(portfolioId: string, itemId: string, itemType: 'project' | 'asset', displayOrder = 0): Promise<void> {
    const payload: any = {
      portfolio_id: portfolioId,
      display_order: displayOrder,
    };

    if (itemType === 'asset') {
      payload.asset_id = itemId;
    } else {
      payload.project_id = itemId;
    }

    const { error } = await (this.supabase as any)
      .from('portfolio_projects')
      .upsert(payload);

    if (error) throw new Error(`Failed to add item to portfolio: ${error.message}`);
  }

  async removeFeaturedItem(portfolioId: string, itemId: string, itemType: 'project' | 'asset'): Promise<void> {
    let query = (this.supabase as any)
      .from('portfolio_projects')
      .delete()
      .eq('portfolio_id', portfolioId);

    if (itemType === 'asset') {
      query = query.eq('asset_id', itemId);
    } else {
      query = query.eq('project_id', itemId);
    }

    const { error } = await query;
    if (error) throw new Error(`Failed to remove item from portfolio: ${error.message}`);
  }

  async addFeaturedProject(portfolioId: string, projectId: string, displayOrder = 0): Promise<void> {
    return this.addFeaturedItem(portfolioId, projectId, 'project', displayOrder);
  }

  async removeFeaturedProject(portfolioId: string, projectId: string): Promise<void> {
    return this.removeFeaturedItem(portfolioId, projectId, 'project');
  }

  async reorderFeaturedProjects(portfolioId: string, projectIdsInOrder: string[]): Promise<void> {
    const updates = projectIdsInOrder.map((projectId, index) => ({
      portfolio_id: portfolioId,
      project_id: projectId,
      display_order: index,
    }));

    const { error } = await (this.supabase as any)
      .from('portfolio_projects')
      .upsert(updates);

    if (error) throw new Error(`Failed to reorder portfolio projects: ${error.message}`);
  }
}

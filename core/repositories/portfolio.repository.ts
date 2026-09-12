import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Portfolio, SocialLinks, PortfolioAppearance, PortfolioExperience, PortfolioStats } from "@/core/entities/portfolio";

export interface CreatePortfolioDTO {
  workspaceId: string;
  slug: string;
  title: string;
  bio?: string | null;
  coverAssetUrl?: string | null;
  socialLinks?: SocialLinks;
  isPublished?: boolean;
  whatsappNumber?: string | null;
  stats?: PortfolioStats;
  layoutTemplate?: string;
}

export interface IPortfolioRepository {
  findById(id: string): Promise<Portfolio | null>;
  findByWorkspaceId(workspaceId: string): Promise<Portfolio | null>;
  findBySlug(slug: string): Promise<Portfolio | null>;
  create(dto: CreatePortfolioDTO): Promise<Portfolio>;
  update(id: string, data: Partial<Portfolio>): Promise<Portfolio>;
  delete(id: string): Promise<void>;
}

export class SupabasePortfolioRepository implements IPortfolioRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Portfolio {
    const defaultAppearance: PortfolioAppearance = {
      cardSize: "M",
      aspectRatio: "16:9",
      thumbnailScale: "fill",
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
      whatsappNumber: row.whatsapp_number || null,
      stats: row.stats || { projects: "80+", years: "6", location: "UAE" },
      layoutTemplate: row.layout_template || "grid",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Portfolio | null> {
    const { data, error } = await (this.supabase as any)
      .from("portfolios")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching portfolio: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findByWorkspaceId(workspaceId: string): Promise<Portfolio | null> {
    const { data, error } = await (this.supabase as any)
      .from("portfolios")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching portfolio: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findBySlug(slug: string): Promise<Portfolio | null> {
    const { data, error } = await (this.supabase as any)
      .from("portfolios")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(`Error fetching portfolio by slug: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async create(dto: CreatePortfolioDTO): Promise<Portfolio> {
    const { data, error } = await (this.supabase as any)
      .from("portfolios")
      .insert({
        workspace_id: dto.workspaceId,
        slug: dto.slug,
        title: dto.title,
        bio: dto.bio,
        cover_asset_url: dto.coverAssetUrl,
        social_links: dto.socialLinks || {},
        is_published: dto.isPublished ?? true,
        whatsapp_number: dto.whatsappNumber ?? null,
        stats: dto.stats || { projects: "80+", years: "6", location: "UAE" },
        layout_template: dto.layoutTemplate || "grid",
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
    if (data.whatsappNumber !== undefined) payload.whatsapp_number = data.whatsappNumber;
    if (data.stats !== undefined) payload.stats = data.stats;
    if (data.layoutTemplate !== undefined) payload.layout_template = data.layoutTemplate;

    const { data: updated, error } = await (this.supabase as any)
      .from("portfolios")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update portfolio: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("portfolios")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Failed to delete portfolio: ${error.message}`);
  }
}

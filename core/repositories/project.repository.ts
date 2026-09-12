import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Project, CreateProjectDTO, UpdateProjectDTO } from "@/core/entities/project";
import { IProjectRepository } from "./i-project-repository";

export class SupabaseProjectRepository implements IProjectRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Project {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      portfolioId: row.portfolio_id,
      title: row.title,
      clientName: row.client_name,
      description: row.description,
      category: row.category || "Commercial",
      coverAssetUrl: row.cover_asset_url,
      year: row.year,
      location: row.location,
      displayOrder: row.display_order ?? 0,
      isPublished: row.is_published ?? true,
      sourceDeliveryId: row.source_delivery_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Project | null> {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!isUuid) return null;

    const { data, error } = await (this.supabase as any)
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching project by id: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByPortfolioId(portfolioId: string): Promise<Project[]> {
    const { data, error } = await (this.supabase as any)
      .from("projects")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Error listing projects for portfolio: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async listByWorkspaceId(workspaceId: string): Promise<Project[]> {
    const { data, error } = await (this.supabase as any)
      .from("projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Error listing projects for workspace: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async create(dto: CreateProjectDTO): Promise<Project> {
    const payload: any = {
      workspace_id: dto.workspaceId,
      portfolio_id: dto.portfolioId,
      title: dto.title,
      client_name: dto.clientName ?? null,
      description: dto.description ?? null,
      category: dto.category ?? "Commercial",
      cover_asset_url: dto.coverAssetUrl ?? null,
      year: dto.year ?? null,
      location: dto.location ?? null,
      display_order: dto.displayOrder ?? 0,
      is_published: dto.isPublished ?? true,
      source_delivery_id: dto.sourceDeliveryId ?? null,
    };

    const { data, error } = await (this.supabase as any)
      .from("projects")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Error creating showcase project: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: UpdateProjectDTO): Promise<Project> {
    const payload: any = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) payload.title = data.title;
    if (data.clientName !== undefined) payload.client_name = data.clientName;
    if (data.description !== undefined) payload.description = data.description;
    if (data.category !== undefined) payload.category = data.category;
    if (data.coverAssetUrl !== undefined) payload.cover_asset_url = data.coverAssetUrl;
    if (data.year !== undefined) payload.year = data.year;
    if (data.location !== undefined) payload.location = data.location;
    if (data.displayOrder !== undefined) payload.display_order = data.displayOrder;
    if (data.isPublished !== undefined) payload.is_published = data.isPublished;
    if (data.sourceDeliveryId !== undefined) payload.source_delivery_id = data.sourceDeliveryId;

    const { data: updated, error } = await (this.supabase as any)
      .from("projects")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error updating showcase project: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Error deleting showcase project: ${error.message}`);
  }

  async attachAsset(projectId: string, assetId: string, displayOrder = 0): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("project_assets")
      .upsert({
        project_id: projectId,
        asset_id: assetId,
        display_order: displayOrder,
      });

    if (error) throw new Error(`Failed to attach asset to project: ${error.message}`);
  }

  async detachAsset(projectId: string, assetId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("project_assets")
      .delete()
      .eq("project_id", projectId)
      .eq("asset_id", assetId);

    if (error) throw new Error(`Failed to detach asset from project: ${error.message}`);
  }

  async getProjectAssetIds(projectId: string): Promise<string[]> {
    const { data, error } = await (this.supabase as any)
      .from("project_assets")
      .select("asset_id")
      .eq("project_id", projectId)
      .order("display_order", { ascending: true });

    if (error) throw new Error(`Failed to fetch project assets: ${error.message}`);
    return (data || []).map((r: any) => r.asset_id);
  }

  async reorderProjects(portfolioId: string, projectIdsInOrder: string[]): Promise<void> {
    const updates = projectIdsInOrder.map((id, index) => ({
      id,
      portfolio_id: portfolioId,
      display_order: index,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await (this.supabase as any)
      .from("projects")
      .upsert(updates);

    if (error) throw new Error(`Failed to reorder projects: ${error.message}`);
  }
}

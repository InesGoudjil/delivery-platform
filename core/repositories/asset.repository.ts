import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Asset, AssetVersion, AssetType, TranscodingStatus } from "@/core/entities/asset";
import {
  IAssetRepository,
  IAssetVersionRepository,
  CreateAssetDTO,
  CreateAssetVersionDTO,
} from "./i-asset-repository";

export class SupabaseAssetRepository implements IAssetRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Asset {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      deliveryId: row.delivery_id ?? null,
      title: row.title,
      type: row.type as AssetType,
      sortOrder: row.sort_order ?? 0,
      isArchived: Boolean(row.is_archived),
      isApproved: Boolean(row.is_approved),
      aspectRatio: row.aspect_ratio || "16:9",
      category: row.category || "film",
      viewsCount: row.views_count ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Asset | null> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching asset by id: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByWorkspaceId(workspaceId: string): Promise<Asset[]> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`Error listing assets for workspace: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async listUnassignedByWorkspaceId(workspaceId: string): Promise<Asset[]> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("delivery_id", null)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`Error listing unassigned assets: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async listByDeliveryId(deliveryId: string): Promise<Asset[]> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`Error listing assets for delivery: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async listByIds(ids: string[]): Promise<Asset[]> {
    if (!ids.length) return [];
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .select("*")
      .in("id", ids);

    if (error) throw new Error(`Error listing assets by IDs: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async create(dto: CreateAssetDTO): Promise<Asset> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .insert({
        workspace_id: dto.workspaceId,
        delivery_id: dto.deliveryId ?? null,
        title: dto.title,
        type: dto.type ?? "video",
        sort_order: dto.sortOrder ?? 0,
        is_archived: dto.isArchived ?? false,
        is_approved: dto.isApproved ?? false,
        aspect_ratio: dto.aspectRatio ?? "16:9",
        category: dto.category ?? "film",
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating asset: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async assignToDelivery(assetId: string, deliveryId: string | null): Promise<Asset> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .update({ delivery_id: deliveryId, updated_at: new Date().toISOString() })
      .eq("id", assetId)
      .select()
      .single();

    if (error) throw new Error(`Error assigning asset to delivery: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async toggleApproval(assetId: string, isApproved: boolean): Promise<Asset> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .update({ is_approved: isApproved, updated_at: new Date().toISOString() })
      .eq("id", assetId)
      .select()
      .single();

    if (error) throw new Error(`Error toggling asset approval: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<Asset>): Promise<Asset> {
    const payload: any = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) payload.title = data.title;
    if (data.type !== undefined) payload.type = data.type;
    if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
    if (data.isArchived !== undefined) payload.is_archived = data.isArchived;
    if (data.isApproved !== undefined) payload.is_approved = data.isApproved;
    if (data.aspectRatio !== undefined) payload.aspect_ratio = data.aspectRatio;
    if (data.category !== undefined) payload.category = data.category;
    if (data.viewsCount !== undefined) payload.views_count = data.viewsCount;
    if (data.deliveryId !== undefined) payload.delivery_id = data.deliveryId;

    const { data: updated, error } = await (this.supabase as any)
      .from("assets")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error updating asset: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("assets")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Error deleting asset: ${error.message}`);
  }
}

export class SupabaseAssetVersionRepository implements IAssetVersionRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): AssetVersion {
    return {
      id: row.id,
      assetId: row.asset_id,
      versionNumber: row.version_number,
      label: row.label || "V" + row.version_number,
      rawFileUrl: row.raw_file_url,
      hlsManifestUrl: row.hls_manifest_url,
      thumbnailUrl: row.thumbnail_url,
      fileSizeBytes: Number(row.file_size_bytes ?? 0),
      durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : null,
      transcodingStatus: row.transcoding_status as TranscodingStatus,
      isActiveVersion: Boolean(row.is_active_version),
      createdAt: row.created_at,
    };
  }

  async findById(id: string): Promise<AssetVersion | null> {
    const { data, error } = await (this.supabase as any)
      .from("asset_versions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching asset version: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByAssetId(assetId: string): Promise<AssetVersion[]> {
    const { data, error } = await (this.supabase as any)
      .from("asset_versions")
      .select("*")
      .eq("asset_id", assetId)
      .order("version_number", { ascending: false });

    if (error) throw new Error(`Error listing asset versions: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async findActiveVersion(assetId: string): Promise<AssetVersion | null> {
    const { data, error } = await (this.supabase as any)
      .from("asset_versions")
      .select("*")
      .eq("asset_id", assetId)
      .eq("is_active_version", true)
      .maybeSingle();

    if (error) throw new Error(`Error fetching active asset version: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async create(dto: CreateAssetVersionDTO): Promise<AssetVersion> {
    const { data, error } = await (this.supabase as any)
      .from("asset_versions")
      .insert({
        asset_id: dto.assetId,
        version_number: dto.versionNumber,
        label: dto.label ?? `V${dto.versionNumber}`,
        raw_file_url: dto.rawFileUrl,
        hls_manifest_url: dto.hlsManifestUrl ?? null,
        thumbnail_url: dto.thumbnailUrl ?? null,
        file_size_bytes: dto.fileSizeBytes ?? 0,
        duration_seconds: dto.durationSeconds ?? null,
        transcoding_status: dto.transcodingStatus ?? "pending",
        is_active_version: dto.isActiveVersion ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating asset version: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<AssetVersion>): Promise<AssetVersion> {
    const payload: any = {};
    if (data.rawFileUrl !== undefined) payload.raw_file_url = data.rawFileUrl;
    if (data.hlsManifestUrl !== undefined) payload.hls_manifest_url = data.hlsManifestUrl;
    if (data.thumbnailUrl !== undefined) payload.thumbnail_url = data.thumbnailUrl;
    if (data.fileSizeBytes !== undefined) payload.file_size_bytes = data.fileSizeBytes;
    if (data.durationSeconds !== undefined) payload.duration_seconds = data.durationSeconds;
    if (data.transcodingStatus !== undefined) payload.transcoding_status = data.transcodingStatus;
    if (data.isActiveVersion !== undefined) payload.is_active_version = data.isActiveVersion;
    if (data.label !== undefined) payload.label = data.label;

    const { data: updated, error } = await (this.supabase as any)
      .from("asset_versions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error updating asset version: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async updateLabel(versionId: string, label: string): Promise<AssetVersion> {
    return this.update(versionId, { label });
  }

  async setActiveVersion(assetId: string, versionId: string): Promise<void> {
    await (this.supabase as any)
      .from("asset_versions")
      .update({ is_active_version: false })
      .eq("asset_id", assetId);

    const { error } = await (this.supabase as any)
      .from("asset_versions")
      .update({ is_active_version: true })
      .eq("id", versionId);

    if (error) throw new Error(`Error setting active version: ${error.message}`);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("asset_versions")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Error deleting asset version: ${error.message}`);
  }
}

import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Asset, AssetVersion, AssetType, TranscodingStatus } from "@/core/entities/asset";
import {
  IAssetRepository,
  IAssetVersionRepository,
  CreateAssetDTO,
  CreateAssetVersionDTO,
  ListDeliveryAssetsOptions,
  PaginatedAssetsResult,
  WorkspaceStorageBreakdown,
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
      isPortfolio: Boolean(row.is_portfolio),
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

  async listByWorkspaceId(workspaceId: string, includeArchived?: boolean): Promise<Asset[]> {
    let query = (this.supabase as any)
      .from("assets")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

    const { data, error } = await query.order("sort_order", { ascending: true });

    if (error) throw new Error(`Error listing assets for workspace: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async getWorkspaceStorageBreakdown(workspaceId: string): Promise<WorkspaceStorageBreakdown> {
    // 1. Try querying the optimized PostgreSQL View first
    try {
      const { data: viewData, error: viewError } = await (this.supabase as any)
        .from("view_workspace_storage_breakdown")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!viewError && viewData) {
        return {
          totalAssets: Number(viewData.total_assets || 0),
          totalStillBytes: Number(viewData.total_still_bytes || 0),
          totalVideoBytes: Number(viewData.total_video_bytes || 0),
          totalStreamBytes: Number(viewData.total_stream_bytes || 0),
          totalUsedBytes: Number(viewData.total_used_bytes || 0),
        };
      }
    } catch {
      // Fall through to single-request relational query
    }

    // 2. High-performance fallback: Single relational query across all active versions (1 HTTP request)
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .select("id, type, versions:asset_versions(file_size_bytes, hls_manifest_url, is_active_version)")
      .eq("workspace_id", workspaceId)
      .eq("is_archived", false);

    if (error) throw new Error(`Error calculating workspace storage: ${error.message}`);

    let totalStillBytes = 0;
    let totalVideoBytes = 0;
    let totalStreamBytes = 0;

    for (const a of data || []) {
      const activeVer = (a.versions || []).find((v: any) => v.is_active_version) || (a.versions || [])[0];
      if (activeVer) {
        const bytes = Number(activeVer.file_size_bytes || 0);
        if (a.type === "photo_gallery") {
          totalStillBytes += bytes;
        } else {
          totalVideoBytes += bytes;
          if (activeVer.hls_manifest_url) {
            totalStreamBytes += Math.round(bytes * 0.35);
          }
        }
      }
    }

    return {
      totalAssets: (data || []).length,
      totalStillBytes,
      totalVideoBytes,
      totalStreamBytes,
      totalUsedBytes: totalStillBytes + totalVideoBytes + totalStreamBytes,
    };
  }

  /**
   * The file whose stored media (streaming manifest, thumbnail or raw URL) points at this
   * Cloudflare Stream video. Those columns are written by the server only, so this is the
   * mapping from a Stream UID to its workspace.
   */
  async findByStreamUid(uid: string): Promise<Asset | null> {
    if (!/^[a-f0-9]{32}$/i.test(uid)) return null;
    const pattern = `*${uid.toLowerCase()}*`;
    const { data, error } = await (this.supabase as any)
      .from("asset_versions")
      .select("asset_id")
      .or(`hls_manifest_url.ilike.${pattern},thumbnail_url.ilike.${pattern},raw_file_url.ilike.${pattern}`)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Error looking up a Stream video: ${error.message}`);
    return data?.asset_id ? this.findById(data.asset_id) : null;
  }

  async listPortfolioAssets(workspaceId: string): Promise<Asset[]> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_portfolio", true)
      .is("delivery_id", null)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`Error listing portfolio assets: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async listUnassignedByWorkspaceId(workspaceId: string): Promise<Asset[]> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("delivery_id", null)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`Error listing unassigned assets: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async listByDeliveryId(deliveryId: string, options?: ListDeliveryAssetsOptions): Promise<Asset[]> {
    let query = (this.supabase as any)
      .from("assets")
      .select("*")
      .eq("delivery_id", deliveryId)
      .eq("is_archived", false);

    if (options?.workspaceId) {
      query = query.eq("workspace_id", options.workspaceId);
    }

    if (options?.type) {
      query = query.eq("type", options.type);
    }

    if (options?.isApproved !== undefined) {
      query = query.eq("is_approved", options.isApproved);
    }

    query = query.order("sort_order", { ascending: true });

    if (options?.limit !== undefined && options?.offset !== undefined) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Error listing assets for delivery: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async listByDeliveryIdPaginated(
    deliveryId: string,
    options?: ListDeliveryAssetsOptions
  ): Promise<PaginatedAssetsResult> {
    let query = (this.supabase as any)
      .from("assets")
      .select("*", { count: "exact" })
      .eq("delivery_id", deliveryId)
      .eq("is_archived", false);

    if (options?.workspaceId) {
      query = query.eq("workspace_id", options.workspaceId);
    }

    if (options?.type) {
      query = query.eq("type", options.type);
    }

    if (options?.isApproved !== undefined) {
      query = query.eq("is_approved", options.isApproved);
    }

    query = query.order("sort_order", { ascending: true });

    if (options?.limit !== undefined && options?.offset !== undefined) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`Error listing paginated assets for delivery: ${error.message}`);
    return {
      assets: (data || []).map(this.mapRowToEntity),
      totalCount: count ?? (data?.length || 0),
    };
  }

  async countByDeliveryId(
    deliveryId: string,
    options?: { type?: string; isApproved?: boolean; workspaceId?: string }
  ): Promise<number> {
    let query = (this.supabase as any)
      .from("assets")
      .select("*", { count: "exact", head: true })
      .eq("delivery_id", deliveryId)
      .eq("is_archived", false);

    if (options?.workspaceId) {
      query = query.eq("workspace_id", options.workspaceId);
    }

    if (options?.type) {
      query = query.eq("type", options.type);
    }

    if (options?.isApproved !== undefined) {
      query = query.eq("is_approved", options.isApproved);
    }

    const { count, error } = await query;

    if (error) throw new Error(`Error counting assets for delivery: ${error.message}`);
    return count ?? 0;
  }

  async listArchivedByWorkspaceId(workspaceId: string): Promise<Asset[]> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_archived", true)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(`Error listing trash assets: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async archive(id: string): Promise<Asset> {
    return this.update(id, { isArchived: true });
  }

  async restore(id: string): Promise<Asset> {
    return this.update(id, { isArchived: false });
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
        is_portfolio: dto.deliveryId ? false : Boolean(dto.isPortfolio),
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating asset: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async assignToDelivery(assetId: string, deliveryId: string | null): Promise<Asset> {
    const { data, error } = await (this.supabase as any)
      .from("assets")
      .update({
        delivery_id: deliveryId,
        // A file in a delivery is never a standalone portfolio piece (DB constraint).
        ...(deliveryId ? { is_portfolio: false } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId)
      .select()
      .single();

    if (error) throw new Error(`Error assigning asset to delivery: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  /**
   * Detaches every file from a delivery that's being deleted. They go to Trash, never to
   * the portfolio: a detached file isn't a portfolio piece (is_portfolio stays false).
   */
  async detachAllFromDelivery(deliveryId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("assets")
      .update({ delivery_id: null, is_archived: true, is_portfolio: false, updated_at: new Date().toISOString() })
      .eq("delivery_id", deliveryId);

    if (error) throw new Error(`Error detaching assets from delivery: ${error.message}`);
    // Every file must have moved: the delivery is deleted right after, and its files would go with it.
    const { count, error: countError } = await (this.supabase as any)
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("delivery_id", deliveryId);
    if (countError) throw new Error(`Error checking detached assets: ${countError.message}`);
    if ((count ?? 0) > 0) throw new Error(`Couldn't move ${count} file(s) to Trash, so the delivery was kept.`);
  }

  async toggleApproval(
    assetId: string,
    isApproved: boolean,
    scope?: { deliveryId: string; workspaceId: string }
  ): Promise<Asset> {
    let query = (this.supabase as any)
      .from("assets")
      .update({ is_approved: isApproved, updated_at: new Date().toISOString() })
      .eq("id", assetId);
    if (scope) {
      query = query.eq("delivery_id", scope.deliveryId).eq("workspace_id", scope.workspaceId).eq("is_archived", false);
    }
    const { data, error } = await query.select().maybeSingle();

    if (error) throw new Error(`Error toggling asset approval: ${error.message}`);
    if (!data) throw new Error("That file isn't part of this delivery.");
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
    try {
      await (this.supabase as any)
        .from("project_assets")
        .delete()
        .eq("asset_id", id);
    } catch {
      // Junction cleanup failure shouldn't abort deletion if table is missing/cascade
    }

    const { data, error } = await (this.supabase as any)
      .from("assets")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw new Error(`Error deleting asset: ${error.message}`);
    if (!data || data.length === 0) throw new Error("File not found, or you can't delete it (admins only).");
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
      siloArchiveKey: row.silo_archive_key || null,
      siloStorageClass: row.silo_storage_class || null,
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
        // A new version is pending until its upload is confirmed; it doesn't replace the active one.
        is_active_version: dto.isActiveVersion ?? false,
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
    if (data.siloArchiveKey !== undefined) payload.silo_archive_key = data.siloArchiveKey;
    if (data.siloStorageClass !== undefined) payload.silo_storage_class = data.siloStorageClass;

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

  /**
   * Makes `versionId` the only active version of `assetId`. Throws, changing nothing, when
   * the version isn't one of that file's versions (or the caller may not change it).
   */
  async setActiveVersion(assetId: string, versionId: string): Promise<void> {
    const { data: target, error: findError } = await (this.supabase as any)
      .from("asset_versions")
      .select("id")
      .eq("id", versionId)
      .eq("asset_id", assetId)
      .maybeSingle();

    if (findError) throw new Error(`Error setting active version: ${findError.message}`);
    if (!target) throw new Error("That version doesn't belong to this file.");

    // Deactivate the others first: at most one version per file is active at any time.
    const { error: clearError } = await (this.supabase as any)
      .from("asset_versions")
      .update({ is_active_version: false })
      .eq("asset_id", assetId)
      .eq("is_active_version", true)
      .neq("id", versionId);

    if (clearError) throw new Error(`Error setting active version: ${clearError.message}`);

    const { data: activated, error } = await (this.supabase as any)
      .from("asset_versions")
      .update({ is_active_version: true })
      .eq("id", versionId)
      .eq("asset_id", assetId)
      .select("id");

    if (error) throw new Error(`Error setting active version: ${error.message}`);
    if (!activated || activated.length !== 1) {
      throw new Error("The version couldn't be made active.");
    }
  }

  /**
   * Versions whose server-written media columns mention this Stream UID. Callers re-check the
   * exact UID with `streamUidOf`; the UID is validated here, so it is safe in the filter.
   */
  async listByStreamUid(uid: string): Promise<AssetVersion[]> {
    if (!/^[a-f0-9]{32}$/i.test(uid)) return [];
    const pattern = `*${uid.toLowerCase()}*`;
    const { data, error } = await (this.supabase as any)
      .from("asset_versions")
      .select("*")
      .or(`raw_file_url.ilike.${pattern},hls_manifest_url.ilike.${pattern}`)
      .limit(20);

    if (error) throw new Error(`Error looking up versions by Stream video: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("asset_versions")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Error deleting asset version: ${error.message}`);
  }
}

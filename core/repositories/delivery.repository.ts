import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Delivery, DeliveryStatus, CreateDeliveryDTO, UpdateDeliveryDTO, DeliverySummaryItem } from "@/core/entities/delivery";
import { IDeliveryRepository } from "./i-delivery-repository";

export class SupabaseDeliveryRepository implements IDeliveryRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Delivery {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      clientId: row.client_id,
      title: row.title,
      description: row.description,
      shareToken: row.share_token,
      passcodeHash: row.passcode_hash,
      status: row.status as DeliveryStatus,
      isDownloadAllowed: row.is_download_allowed ?? false,
      isCommentAllowed: row.is_comment_allowed ?? true,
      notifyOnDownload: row.notify_on_download ?? false,
      isWatermarked: row.is_watermarked ?? false,
      appearance: row.appearance ?? null,
      approvedAt: row.approved_at,
      approvedByName: row.approved_by_name,
      expiresAt: row.expires_at,
      location: row.location,
      deliveryDate: row.delivery_date,
      siloStatus: row.silo_status ?? null,
      siloArchivedAt: row.silo_archived_at ?? null,
      siloRestoreRequestedAt: row.silo_restore_requested_at ?? null,
      siloRestoreTier: row.silo_restore_tier ?? null,
      siloRestoredAt: row.silo_restored_at ?? null,
      siloMetadata: row.silo_metadata ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Delivery | null> {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!isUuid) return null;

    const { data, error } = await (this.supabase as any)
      .from("deliveries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching delivery by id: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findByShareToken(shareToken: string): Promise<Delivery | null> {
    const { data, error } = await (this.supabase as any)
      .from("deliveries")
      .select("*")
      .eq("share_token", shareToken)
      .maybeSingle();

    if (error) throw new Error(`Error fetching delivery by shareToken: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByWorkspaceId(workspaceId: string): Promise<Delivery[]> {
    const { data, error } = await (this.supabase as any)
      .from("deliveries")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Error listing deliveries for workspace: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async listDeliveriesSummary(workspaceId: string): Promise<DeliverySummaryItem[]> {
    // 1. Try querying the optimized PostgreSQL View first
    try {
      const { data: viewData, error: viewError } = await (this.supabase as any)
        .from("view_workspace_deliveries_summary")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (!viewError && Array.isArray(viewData)) {
        return viewData.map((row: any) => ({
          id: row.id,
          workspaceId: row.workspace_id,
          clientId: row.client_id,
          title: row.title,
          description: row.description,
          shareToken: row.share_token,
          status: row.status as DeliveryStatus,
          isDownloadAllowed: Boolean(row.is_download_allowed),
          isCommentAllowed: Boolean(row.is_comment_allowed),
          passcodeProtected: Boolean(row.passcode_protected),
          clientName: row.client_name || "Private Client",
          assetsCount: Number(row.assets_count || 0),
          commentsCount: Number(row.comments_count || 0),
          activeVersionNumber: row.active_version_number ? Number(row.active_version_number) : null,
          activeDurationSeconds: row.active_duration_seconds ? Number(row.active_duration_seconds) : null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }
    } catch {
      // Fall through to PostgREST relational query if view is pending creation
    }

    // 2. High-performance single PostgREST relational query (1 HTTP roundtrip)
    const { data, error } = await (this.supabase as any)
      .from("deliveries")
      .select(`
        id,
        workspace_id,
        client_id,
        title,
        description,
        share_token,
        passcode_hash,
        status,
        is_download_allowed,
        is_comment_allowed,
        created_at,
        updated_at,
        client:clients(name),
        assets(
          id,
          title,
          type,
          sort_order,
          is_archived,
          versions:asset_versions(
            id,
            version_number,
            duration_seconds,
            is_active_version,
            feedback(id)
          )
        )
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Error listing delivery summaries: ${error.message}`);

    return (data || []).map((row: any) => {
      const rawAssets = (row.assets || []).filter((a: any) => !a.is_archived);
      rawAssets.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const primaryAsset = rawAssets[0];
      const primaryActiveVersion =
        primaryAsset?.versions?.find((v: any) => v.is_active_version) ||
        primaryAsset?.versions?.[0];

      let commentsCount = 0;
      for (const a of rawAssets) {
        for (const v of a.versions || []) {
          commentsCount += (v.feedback || []).length;
        }
      }

      return {
        id: row.id,
        workspaceId: row.workspace_id,
        clientId: row.client_id,
        title: row.title,
        description: row.description,
        shareToken: row.share_token,
        status: row.status as DeliveryStatus,
        isDownloadAllowed: Boolean(row.is_download_allowed),
        isCommentAllowed: Boolean(row.is_comment_allowed ?? true),
        passcodeProtected: Boolean(row.passcode_hash),
        clientName: row.client?.name || "Private Client",
        assetsCount: rawAssets.length,
        commentsCount,
        activeVersionNumber: primaryActiveVersion?.version_number ? Number(primaryActiveVersion.version_number) : null,
        activeDurationSeconds: primaryActiveVersion?.duration_seconds ? Number(primaryActiveVersion.duration_seconds) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  }

  async listByClientId(clientId: string): Promise<Delivery[]> {
    const { data, error } = await (this.supabase as any)
      .from("deliveries")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Error listing deliveries for client: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async create(dto: CreateDeliveryDTO): Promise<Delivery> {
    const payload: any = {
      workspace_id: dto.workspaceId,
      client_id: dto.clientId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      passcode_hash: dto.passcodeHash ?? null,
      is_download_allowed: dto.isDownloadAllowed ?? false,
      is_comment_allowed: dto.isCommentAllowed ?? true,
      notify_on_download: dto.notifyOnDownload ?? false,
      is_watermarked: dto.isWatermarked ?? false,
      appearance: dto.appearance ?? null,
      status: dto.status ?? "in_review",
      expires_at: dto.expiresAt ?? null,
      location: dto.location ?? null,
      delivery_date: dto.deliveryDate ?? null,
    };

    if (dto.shareToken) {
      payload.share_token = dto.shareToken;
    }

    const { data, error } = await (this.supabase as any)
      .from("deliveries")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Error creating delivery: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: UpdateDeliveryDTO): Promise<Delivery> {
    const payload: any = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.clientId !== undefined) payload.client_id = data.clientId;
    if (data.passcodeHash !== undefined) payload.passcode_hash = data.passcodeHash;
    if (data.isDownloadAllowed !== undefined) payload.is_download_allowed = data.isDownloadAllowed;
    if (data.isCommentAllowed !== undefined) payload.is_comment_allowed = data.isCommentAllowed;
    if (data.notifyOnDownload !== undefined) payload.notify_on_download = data.notifyOnDownload;
    if (data.isWatermarked !== undefined) payload.is_watermarked = data.isWatermarked;
    if (data.appearance !== undefined) payload.appearance = data.appearance;
    if (data.status !== undefined) payload.status = data.status;
    if (data.shareToken !== undefined) payload.share_token = data.shareToken;
    if (data.expiresAt !== undefined) payload.expires_at = data.expiresAt;
    if (data.location !== undefined) payload.location = data.location;
    if (data.deliveryDate !== undefined) payload.delivery_date = data.deliveryDate;
    if (data.approvedAt !== undefined) payload.approved_at = data.approvedAt;
    if (data.approvedByName !== undefined) payload.approved_by_name = data.approvedByName;
    if (data.siloStatus !== undefined) payload.silo_status = data.siloStatus;
    if (data.siloArchivedAt !== undefined) payload.silo_archived_at = data.siloArchivedAt;
    if (data.siloRestoreRequestedAt !== undefined) payload.silo_restore_requested_at = data.siloRestoreRequestedAt;
    if (data.siloRestoreTier !== undefined) payload.silo_restore_tier = data.siloRestoreTier;
    if (data.siloRestoredAt !== undefined) payload.silo_restored_at = data.siloRestoredAt;
    if (data.siloMetadata !== undefined) payload.silo_metadata = data.siloMetadata;

    const { data: updated, error } = await (this.supabase as any)
      .from("deliveries")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error updating delivery: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async updateStatus(id: string, status: DeliveryStatus, approvedByName?: string): Promise<Delivery> {
    const payload: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "approved") {
      payload.approved_at = new Date().toISOString();
      payload.approved_by_name = approvedByName || "Client";
    } else {
      payload.approved_at = null;
      payload.approved_by_name = null;
    }

    const { data, error } = await (this.supabase as any)
      .from("deliveries")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error updating delivery status: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from("deliveries")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Error deleting delivery: ${error.message}`);
  }
}

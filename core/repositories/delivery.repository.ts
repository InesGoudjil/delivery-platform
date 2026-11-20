import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Delivery, DeliveryStatus, CreateDeliveryDTO, UpdateDeliveryDTO, DeliverySummaryItem } from "@/core/entities/delivery";
import { IDeliveryRepository } from "./i-delivery-repository";

/** A deliveries row as a Delivery. Also used for deliveries embedded in other queries (share links). */
export function mapDeliveryRow(row: any): Delivery {
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

/** The latest of some ISO timestamps, ignoring missing or unreadable ones. null when none is left. */
export function latestOf(...values: (string | null | undefined)[]): string | null {
  let latest: string | null = null;
  let latestTime = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const time = Date.parse(value);
    if (Number.isFinite(time) && time > latestTime) {
      latest = value;
      latestTime = time;
    }
  }
  return latest;
}

/** A view_workspace_deliveries_summary row as a DeliverySummaryItem. */
function mapSummaryViewRow(row: any): DeliverySummaryItem {
  return {
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
    approvedAt: row.approved_at ?? null,
    approvedByName: row.approved_by_name ?? null,
    openNotesCount: Number(row.open_notes_count || 0),
    lastNoteAt: row.last_note_at ?? null,
    lastOpenedAt: row.last_opened_at ?? null,
    lastDownloadedAt: row.last_downloaded_at ?? null,
    lastActivityAt: row.last_activity_at ?? row.updated_at ?? row.created_at,
  };
}

export class SupabaseDeliveryRepository implements IDeliveryRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Delivery {
    return mapDeliveryRow(row);
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

      // The view from before 20261120120000_deliveries_summary_activity.sql has no activity
      // columns. Then the query below works them out, so "Needs reply" and the activity sort
      // stay right until the migration is applied.
      if (!viewError && Array.isArray(viewData) && (viewData.length === 0 || "last_activity_at" in viewData[0])) {
        return viewData.map(mapSummaryViewRow);
      }
    } catch {
      // Fall through to PostgREST relational query if view is pending creation
    }

    // 2. High-performance single PostgREST relational query (1 HTTP roundtrip), next to the
    //    links' visit times.
    const [{ data, error }, linkActivity] = await Promise.all([
      (this.supabase as any)
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
          approved_at,
          approved_by_name,
          created_at,
          updated_at,
          client:clients(name),
          assets(
            id,
            title,
            type,
            sort_order,
            is_archived,
            created_at,
            versions:asset_versions(
              id,
              version_number,
              duration_seconds,
              is_active_version,
              created_at,
              feedback(id, author_user_id, is_resolved, created_at, replies:feedback_replies(created_at))
            )
          )
        `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      this.listLinkActivity(workspaceId),
    ]);

    if (error) throw new Error(`Error listing delivery summaries: ${error.message}`);

    return (data || []).map((row: any) => {
      const rawAssets = (row.assets || []).filter((a: any) => !a.is_archived);
      rawAssets.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const primaryAsset = rawAssets[0];
      const primaryActiveVersion =
        primaryAsset?.versions?.find((v: any) => v.is_active_version) ||
        primaryAsset?.versions?.[0];

      // Same rules as the view: open notes are unresolved guest notes; a new version becomes
      // the active one, so active versions give the newest upload.
      let commentsCount = 0;
      let openNotesCount = 0;
      let lastNoteAt: string | null = null;
      let lastUploadAt: string | null = null;
      for (const a of rawAssets) {
        lastUploadAt = latestOf(lastUploadAt, a.created_at);
        for (const v of a.versions || []) {
          if (v.is_active_version) lastUploadAt = latestOf(lastUploadAt, v.created_at);
          for (const f of v.feedback || []) {
            commentsCount += 1;
            if (f.author_user_id == null && f.is_resolved !== true) openNotesCount += 1;
            lastNoteAt = latestOf(lastNoteAt, f.created_at, ...(f.replies || []).map((r: any) => r.created_at));
          }
        }
      }

      // Unknown (not "never") when the links couldn't be read.
      const links = linkActivity
        ? linkActivity.get(row.id) ?? { lastOpenedAt: null, lastDownloadedAt: null }
        : undefined;

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
        approvedAt: row.approved_at ?? null,
        approvedByName: row.approved_by_name ?? null,
        openNotesCount,
        lastNoteAt,
        lastOpenedAt: links?.lastOpenedAt,
        lastDownloadedAt: links?.lastDownloadedAt,
        lastActivityAt:
          latestOf(
            row.updated_at,
            row.approved_at,
            lastUploadAt,
            lastNoteAt,
            links?.lastOpenedAt,
            links?.lastDownloadedAt
          ) ?? row.created_at,
      };
    });
  }

  /**
   * The last client visit and download of each delivery, from its share links (deleted ones
   * too: their visits happened). null when the links can't be read, for example before the
   * share_links migration.
   */
  private async listLinkActivity(
    workspaceId: string
  ): Promise<Map<string, { lastOpenedAt: string | null; lastDownloadedAt: string | null }> | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from("share_links")
        .select("delivery_id, last_opened_at, last_downloaded_at")
        .eq("workspace_id", workspaceId);
      if (error || !Array.isArray(data)) return null;

      const byDelivery = new Map<string, { lastOpenedAt: string | null; lastDownloadedAt: string | null }>();
      for (const row of data) {
        const current = byDelivery.get(row.delivery_id) ?? { lastOpenedAt: null, lastDownloadedAt: null };
        byDelivery.set(row.delivery_id, {
          lastOpenedAt: latestOf(current.lastOpenedAt, row.last_opened_at),
          lastDownloadedAt: latestOf(current.lastDownloadedAt, row.last_downloaded_at),
        });
      }
      return byDelivery;
    } catch {
      return null;
    }
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
    const { data, error } = await (this.supabase as any)
      .from("deliveries")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw new Error(`Error deleting delivery: ${error.message}`);
    // Row-level security refuses silently (0 rows): don't report success.
    if (!data || data.length === 0) throw new Error("Delivery not found, or you can't delete it (admins only).");
  }
}

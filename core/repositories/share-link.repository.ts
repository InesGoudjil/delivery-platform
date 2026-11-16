import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import type { Delivery } from "@/core/entities/delivery";
import type {
  CreateShareLinkDTO,
  ShareLink,
  ShareLinkEvent,
  ShareLinkEventKind,
  UpdateShareLinkDTO,
  WorkspaceShareLink,
} from "@/core/entities/share-link";
import { mapDeliveryRow } from "./delivery.repository";

/** The delivery a link opens, embedded in the same query (one round trip for the client room). */
const WITH_DELIVERY = "*, delivery:deliveries!share_links_delivery_id_fkey(*)";

export function mapShareLinkRow(row: any): ShareLink {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    deliveryId: row.delivery_id,
    token: row.token,
    label: row.label,
    recipientName: row.recipient_name ?? null,
    recipientEmail: row.recipient_email ?? null,
    isPrimary: Boolean(row.is_primary),
    passcodeHash: row.passcode_hash ?? null,
    passcodeSealed: row.passcode_sealed ?? null,
    expiresAt: row.expires_at ?? null,
    revokedAt: row.revoked_at ?? null,
    canComment: row.can_comment !== false,
    canApprove: row.can_approve !== false,
    canDownload: row.can_download === true,
    notifyOnOpen: row.notify_on_open === true,
    notifyOnDownload: row.notify_on_download === true,
    notifyOnComment: row.notify_on_comment !== false,
    openCount: Number(row.open_count ?? 0),
    downloadCount: Number(row.download_count ?? 0),
    firstOpenedAt: row.first_opened_at ?? null,
    lastOpenedAt: row.last_opened_at ?? null,
    lastDownloadedAt: row.last_downloaded_at ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(dto: Partial<CreateShareLinkDTO & UpdateShareLinkDTO>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const set = (column: string, value: unknown) => {
    if (value !== undefined) row[column] = value;
  };
  set("workspace_id", dto.workspaceId);
  set("delivery_id", dto.deliveryId);
  set("token", dto.token);
  set("label", dto.label);
  set("recipient_name", dto.recipientName);
  set("recipient_email", dto.recipientEmail);
  set("passcode_hash", dto.passcodeHash);
  set("passcode_sealed", dto.passcodeSealed);
  set("expires_at", dto.expiresAt);
  set("revoked_at", dto.revokedAt);
  set("can_comment", dto.canComment);
  set("can_approve", dto.canApprove);
  set("can_download", dto.canDownload);
  set("notify_on_open", dto.notifyOnOpen);
  set("notify_on_download", dto.notifyOnDownload);
  set("notify_on_comment", dto.notifyOnComment);
  set("created_by", dto.createdBy);
  return row;
}

export class SupabaseShareLinkRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private get db(): any {
    return this.supabase as any;
  }

  /** The link with this token and its delivery, or null. Throws when share_links can't be read. */
  async findByTokenWithDelivery(token: string): Promise<{ link: ShareLink; delivery: Delivery } | null> {
    const { data, error } = await this.db.from("share_links").select(WITH_DELIVERY).eq("token", token).maybeSingle();
    if (error) throw new Error(`Error fetching share link by token: ${error.message}`);
    if (!data?.delivery) return null;
    const { delivery, ...link } = data;
    return { link: mapShareLinkRow(link), delivery: mapDeliveryRow(delivery) };
  }

  async findByIdWithDelivery(id: string): Promise<{ link: ShareLink; delivery: Delivery } | null> {
    const { data, error } = await this.db.from("share_links").select(WITH_DELIVERY).eq("id", id).maybeSingle();
    if (error) throw new Error(`Error fetching share link: ${error.message}`);
    if (!data?.delivery) return null;
    const { delivery, ...link } = data;
    return { link: mapShareLinkRow(link), delivery: mapDeliveryRow(delivery) };
  }

  async findById(id: string): Promise<ShareLink | null> {
    const { data, error } = await this.db.from("share_links").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Error fetching share link: ${error.message}`);
    return data ? mapShareLinkRow(data) : null;
  }

  /** A delivery's links: the primary link first, then oldest first. */
  async listByDelivery(deliveryId: string): Promise<ShareLink[]> {
    const { data, error } = await this.db
      .from("share_links")
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Error listing share links: ${error.message}`);
    return (data ?? []).map(mapShareLinkRow);
  }

  /** The workspace's links with their deliveries, newest first. */
  async listByWorkspace(workspaceId: string, limit = 500): Promise<WorkspaceShareLink[]> {
    const { data, error } = await this.db
      .from("share_links")
      .select("*, delivery:deliveries!share_links_delivery_id_fkey(title, status)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Error listing workspace share links: ${error.message}`);
    return (data ?? []).map((row: any) => {
      const { delivery, ...link } = row;
      return {
        ...mapShareLinkRow(link),
        deliveryTitle: delivery?.title ?? "Untitled delivery",
        deliveryStatus: delivery?.status ?? "in_review",
      };
    });
  }

  /** How many of the delivery's links aren't revoked (expired ones count until revoked or deleted). */
  async countUnrevokedByDelivery(deliveryId: string): Promise<number> {
    const { count, error } = await this.db
      .from("share_links")
      .select("id", { count: "exact", head: true })
      .eq("delivery_id", deliveryId)
      .is("revoked_at", null);
    if (error) throw new Error(`Error counting share links: ${error.message}`);
    return count ?? 0;
  }

  async create(dto: CreateShareLinkDTO): Promise<ShareLink> {
    const { data, error } = await this.db.from("share_links").insert(toRow(dto)).select("*").single();
    if (error) throw new Error(`Error creating share link: ${error.message}`);
    return mapShareLinkRow(data);
  }

  async update(id: string, patch: UpdateShareLinkDTO): Promise<ShareLink> {
    const { data, error } = await this.db
      .from("share_links")
      .update({ ...toRow(patch), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(`Error updating share link: ${error.message}`);
    return mapShareLinkRow(data);
  }

  /** Several links at once, all of one workspace. Returns how many changed. */
  async updateMany(workspaceId: string, ids: string[], patch: UpdateShareLinkDTO): Promise<number> {
    if (ids.length === 0) return 0;
    const { data, error } = await this.db
      .from("share_links")
      .update({ ...toRow(patch), updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .in("id", ids)
      .select("id");
    if (error) throw new Error(`Error updating share links: ${error.message}`);
    return (data ?? []).length;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("share_links").delete().eq("id", id);
    if (error) throw new Error(`Error deleting share link: ${error.message}`);
  }

  /** Makes the link its delivery's primary link, in one transaction (set_primary_share_link). */
  async setPrimary(linkId: string): Promise<void> {
    const { error } = await this.db.rpc("set_primary_share_link", { p_link_id: linkId });
    if (error) throw new Error(`Error making the link primary: ${error.message}`);
  }

  /** Saves one event and moves the counters (record_share_link_event). */
  async recordEvent(
    linkId: string,
    kind: ShareLinkEventKind,
    details: { assetId?: string | null; visitor?: string | null; country?: string | null } = {}
  ): Promise<{ recorded: boolean; firstOpen: boolean }> {
    const { data, error } = await this.db.rpc("record_share_link_event", {
      p_link_id: linkId,
      p_kind: kind,
      p_asset_id: details.assetId ?? null,
      p_visitor: details.visitor ?? null,
      p_country: details.country ?? null,
    });
    if (error) throw new Error(`Error recording share link activity: ${error.message}`);
    return { recorded: Boolean(data?.recorded), firstOpen: Boolean(data?.first_open) };
  }

  async listEvents(linkId: string, limit = 50): Promise<ShareLinkEvent[]> {
    const { data, error } = await this.db
      .from("share_link_events")
      .select("id, link_id, kind, asset_id, country, created_at")
      .eq("link_id", linkId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Error listing share link activity: ${error.message}`);
    return (data ?? []).map((row: any) => ({
      id: Number(row.id),
      linkId: row.link_id,
      kind: row.kind,
      assetId: row.asset_id ?? null,
      country: row.country ?? null,
      createdAt: row.created_at,
    }));
  }

  /** True when share_links exists (the migration is applied). */
  async probe(): Promise<boolean> {
    const { error } = await this.db.from("share_links").select("id", { head: true }).limit(1);
    return !error;
  }
}

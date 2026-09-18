import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { Delivery, DeliveryStatus, CreateDeliveryDTO, UpdateDeliveryDTO } from "@/core/entities/delivery";
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
      notifyOnDownload: row.notify_on_download ?? false,
      isWatermarked: row.is_watermarked ?? false,
      approvedAt: row.approved_at,
      approvedByName: row.approved_by_name,
      expiresAt: row.expires_at,
      location: row.location,
      deliveryDate: row.delivery_date,
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
      notify_on_download: dto.notifyOnDownload ?? false,
      is_watermarked: dto.isWatermarked ?? false,
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
    if (data.notifyOnDownload !== undefined) payload.notify_on_download = data.notifyOnDownload;
    if (data.isWatermarked !== undefined) payload.is_watermarked = data.isWatermarked;
    if (data.status !== undefined) payload.status = data.status;
    if (data.expiresAt !== undefined) payload.expires_at = data.expiresAt;
    if (data.location !== undefined) payload.location = data.location;
    if (data.deliveryDate !== undefined) payload.delivery_date = data.deliveryDate;
    if (data.approvedAt !== undefined) payload.approved_at = data.approvedAt;
    if (data.approvedByName !== undefined) payload.approved_by_name = data.approvedByName;

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

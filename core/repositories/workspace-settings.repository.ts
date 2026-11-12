import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import {
  WorkspaceSettings,
  UpdateWorkspaceSettingsDTO,
  WhatsAppNumberState,
  DEFAULT_WORKSPACE_SETTINGS,
} from "@/core/entities/workspace-settings";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ repository: "WorkspaceSettingsRepository" });

export interface IWorkspaceSettingsRepository {
  findByWorkspaceId(workspaceId: string): Promise<WorkspaceSettings | null>;
  getOrCreate(workspaceId: string): Promise<WorkspaceSettings>;
  upsert(workspaceId: string, dto: UpdateWorkspaceSettingsDTO): Promise<WorkspaceSettings>;
  /** The WhatsApp number and its verification. Needs the service role (API users can't write these). */
  updateWhatsAppNumberState(workspaceId: string, state: WhatsAppNumberState): Promise<WorkspaceSettings>;
}

export class SupabaseWorkspaceSettingsRepository implements IWorkspaceSettingsRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): WorkspaceSettings {
    return {
      workspaceId: row.workspace_id,
      notifyApprovals: row.notify_approvals ?? DEFAULT_WORKSPACE_SETTINGS.notifyApprovals,
      notifyComments: row.notify_comments ?? DEFAULT_WORKSPACE_SETTINGS.notifyComments,
      notifyDownloads: row.notify_downloads ?? DEFAULT_WORKSPACE_SETTINGS.notifyDownloads,
      weeklyDigest: row.weekly_digest ?? DEFAULT_WORKSPACE_SETTINGS.weeklyDigest,
      whatsappNumber: row.whatsapp_number ?? null,
      whatsappEnabled: row.whatsapp_enabled ?? DEFAULT_WORKSPACE_SETTINGS.whatsappEnabled,
      whatsappVerifiedAt: row.whatsapp_verified_at ?? null,
      whatsappPendingNumber: row.whatsapp_pending_number ?? null,
      whatsappCodeHash: row.whatsapp_code_hash ?? null,
      whatsappCodeExpiresAt: row.whatsapp_code_expires_at ?? null,
      whatsappCodeAttempts: row.whatsapp_code_attempts ?? 0,
      whatsappNotifyApprovals: row.whatsapp_notify_approvals ?? true,
      whatsappNotifyComments: row.whatsapp_notify_comments ?? true,
      whatsappNotifyDownloads: row.whatsapp_notify_downloads ?? true,
      defaultLinkExpirationDays:
        row.default_link_expiration_days !== undefined
          ? row.default_link_expiration_days
          : DEFAULT_WORKSPACE_SETTINGS.defaultLinkExpirationDays,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  async findByWorkspaceId(workspaceId: string): Promise<WorkspaceSettings | null> {
    const { data, error } = await (this.supabase as any)
      .from("workspace_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) {
      log.warn({ err: error, workspaceId }, "Error finding workspace settings");
      return null;
    }

    return data ? this.mapRowToEntity(data) : null;
  }

  async getOrCreate(workspaceId: string): Promise<WorkspaceSettings> {
    const existing = await this.findByWorkspaceId(workspaceId);
    if (existing) return existing;

    // Create default settings row
    const now = new Date().toISOString();
    const { data, error } = await (this.supabase as any)
      .from("workspace_settings")
      .upsert(
        {
          workspace_id: workspaceId,
          notify_approvals: DEFAULT_WORKSPACE_SETTINGS.notifyApprovals,
          notify_comments: DEFAULT_WORKSPACE_SETTINGS.notifyComments,
          notify_downloads: DEFAULT_WORKSPACE_SETTINGS.notifyDownloads,
          weekly_digest: DEFAULT_WORKSPACE_SETTINGS.weeklyDigest,
          whatsapp_enabled: DEFAULT_WORKSPACE_SETTINGS.whatsappEnabled,
          default_link_expiration_days: DEFAULT_WORKSPACE_SETTINGS.defaultLinkExpirationDays,
          updated_at: now,
        },
        { onConflict: "workspace_id" }
      )
      .select()
      .single();

    if (error) {
      log.warn({ err: error, workspaceId }, "Error creating default workspace settings");
      return {
        workspaceId,
        ...DEFAULT_WORKSPACE_SETTINGS,
        createdAt: now,
        updatedAt: now,
      };
    }

    return this.mapRowToEntity(data);
  }

  async upsert(workspaceId: string, dto: UpdateWorkspaceSettingsDTO): Promise<WorkspaceSettings> {
    const payload: Record<string, any> = {
      workspace_id: workspaceId,
      updated_at: new Date().toISOString(),
    };

    if (dto.notifyApprovals !== undefined) payload.notify_approvals = dto.notifyApprovals;
    if (dto.notifyComments !== undefined) payload.notify_comments = dto.notifyComments;
    if (dto.notifyDownloads !== undefined) payload.notify_downloads = dto.notifyDownloads;
    if (dto.weeklyDigest !== undefined) payload.weekly_digest = dto.weeklyDigest;
    if (dto.whatsappEnabled !== undefined) payload.whatsapp_enabled = dto.whatsappEnabled;
    if (dto.whatsappNotifyApprovals !== undefined) payload.whatsapp_notify_approvals = dto.whatsappNotifyApprovals;
    if (dto.whatsappNotifyComments !== undefined) payload.whatsapp_notify_comments = dto.whatsappNotifyComments;
    if (dto.whatsappNotifyDownloads !== undefined) payload.whatsapp_notify_downloads = dto.whatsappNotifyDownloads;
    if (dto.defaultLinkExpirationDays !== undefined) {
      payload.default_link_expiration_days = dto.defaultLinkExpirationDays;
    }

    const { data, error } = await (this.supabase as any)
      .from("workspace_settings")
      .upsert(payload, { onConflict: "workspace_id" })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update workspace settings: ${error.message}`);
    }

    return this.mapRowToEntity(data);
  }

  async updateWhatsAppNumberState(workspaceId: string, state: WhatsAppNumberState): Promise<WorkspaceSettings> {
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (state.whatsappNumber !== undefined) payload.whatsapp_number = state.whatsappNumber;
    if (state.whatsappVerifiedAt !== undefined) payload.whatsapp_verified_at = state.whatsappVerifiedAt;
    if (state.whatsappPendingNumber !== undefined) payload.whatsapp_pending_number = state.whatsappPendingNumber;
    if (state.whatsappCodeHash !== undefined) payload.whatsapp_code_hash = state.whatsappCodeHash;
    if (state.whatsappCodeExpiresAt !== undefined) payload.whatsapp_code_expires_at = state.whatsappCodeExpiresAt;
    if (state.whatsappCodeAttempts !== undefined) payload.whatsapp_code_attempts = state.whatsappCodeAttempts;

    await this.getOrCreate(workspaceId);
    const { data, error } = await (this.supabase as any)
      .from("workspace_settings")
      .update(payload)
      .eq("workspace_id", workspaceId)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Failed to update the WhatsApp number: ${error.message}`);
    if (!data) throw new Error("Workspace settings not found.");
    return this.mapRowToEntity(data);
  }
}

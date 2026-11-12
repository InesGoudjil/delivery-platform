"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import { hasMinRole, requireWorkspaceMember } from "@/core/security/guards";
import { toWorkspaceSettingsView, type WorkspaceSettingsView } from "@/core/entities/workspace-settings";
import { NotificationLog } from "@/core/entities/notification";

export interface SettingsActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Retrieves the workspace settings (notification preferences and default link expiration).
 * If no settings row exists yet, it creates one with platform defaults.
 */
export async function getWorkspaceSettingsAction(
  workspaceSlug: string
): Promise<SettingsActionResult<WorkspaceSettingsView>> {
  try {
    const services = await getServerServices();
    const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    const { role } = await requireWorkspaceMember(workspace.id, "viewer");
    const settings = await services.settings.getOrCreate(workspace.id);

    return {
      success: true,
      data: toWorkspaceSettingsView(settings, {
        whatsappAvailable: services.whatsapp.isConfigured(),
        canManage: hasMinRole(role, "admin"),
      }),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load workspace settings." };
  }
}

/**
 * Updates notification preferences: which studio alerts go by email (notify*) and by
 * WhatsApp (whatsappNotify*, whatsappEnabled). Requires admin or owner role.
 * The WhatsApp number itself is set through verification (app/actions/whatsapp.ts).
 */
export async function updateWorkspaceNotificationSettingsAction(
  workspaceSlug: string,
  dto: {
    notifyApprovals?: boolean;
    notifyComments?: boolean;
    notifyDownloads?: boolean;
    weeklyDigest?: boolean;
    whatsappEnabled?: boolean;
    whatsappNotifyApprovals?: boolean;
    whatsappNotifyComments?: boolean;
    whatsappNotifyDownloads?: boolean;
  }
): Promise<SettingsActionResult<WorkspaceSettingsView>> {
  try {
    const services = await getServerServices();
    const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    await requireWorkspaceMember(workspace.id, "admin");

    if (dto.notifyDownloads === true) {
      const canDownloadNotif = await services.subscription.isDownloadNotificationAllowed(workspace.id);
      if (!canDownloadNotif) {
        return {
          success: false,
          error: "File download notifications are available on Pro and Studio plans. Please upgrade your plan.",
        };
      }
    }

    const turnsOnWhatsApp =
      dto.whatsappEnabled === true ||
      dto.whatsappNotifyApprovals === true ||
      dto.whatsappNotifyComments === true ||
      dto.whatsappNotifyDownloads === true;
    if (turnsOnWhatsApp) {
      const canWhatsApp = await services.subscription.canDeliverWhatsApp(workspace.id);
      if (!canWhatsApp) {
        return {
          success: false,
          error: "WhatsApp notifications and delivery alerts are available on Basic, Pro, and Studio plans. Please upgrade your plan.",
        };
      }
    }

    const updated = await services.settings.upsert(workspace.id, {
      notifyApprovals: dto.notifyApprovals,
      notifyComments: dto.notifyComments,
      notifyDownloads: dto.notifyDownloads,
      weeklyDigest: dto.weeklyDigest,
      whatsappEnabled: dto.whatsappEnabled,
      whatsappNotifyApprovals: dto.whatsappNotifyApprovals,
      whatsappNotifyComments: dto.whatsappNotifyComments,
      whatsappNotifyDownloads: dto.whatsappNotifyDownloads,
    });

    revalidatePath(`/${workspaceSlug}/notifications`);
    return {
      success: true,
      data: toWorkspaceSettingsView(updated, { whatsappAvailable: services.whatsapp.isConfigured(), canManage: true }),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update notification settings." };
  }
}

/**
 * Updates studio link governance settings (default link lifespan).
 * Requires admin or owner role.
 */
export async function updateWorkspaceSecuritySettingsAction(
  workspaceSlug: string,
  dto: {
    defaultLinkExpirationDays?: number | null;
  }
): Promise<SettingsActionResult<WorkspaceSettingsView>> {
  try {
    const services = await getServerServices();
    const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    await requireWorkspaceMember(workspace.id, "admin");

    const updated = await services.settings.upsert(workspace.id, {
      defaultLinkExpirationDays: dto.defaultLinkExpirationDays,
    });

    revalidatePath(`/${workspaceSlug}/security`);
    return {
      success: true,
      data: toWorkspaceSettingsView(updated, { whatsappAvailable: services.whatsapp.isConfigured(), canManage: true }),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update security settings." };
  }
}

/**
 * Retrieves the recent notification audit logs for the workspace.
 */
export async function getWorkspaceNotificationLogsAction(
  workspaceSlug: string
): Promise<SettingsActionResult<NotificationLog[]>> {
  try {
    const services = await getServerServices();
    const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    await requireWorkspaceMember(workspace.id, "viewer");
    const logs = await services.notification.listWorkspaceLogs(workspace.id);

    return { success: true, data: logs };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load notification logs." };
  }
}

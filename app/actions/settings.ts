"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import { requireWorkspaceMember } from "@/core/security/guards";
import {
  WorkspaceSettings,
  UpdateWorkspaceSettingsDTO,
  DEFAULT_WORKSPACE_SETTINGS,
} from "@/core/entities/workspace-settings";
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
): Promise<SettingsActionResult<WorkspaceSettings>> {
  try {
    const services = await getServerServices();
    const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    await requireWorkspaceMember(workspace.id, "viewer");
    const settings = await services.settings.getOrCreate(workspace.id);

    return { success: true, data: settings };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load workspace settings." };
  }
}

/**
 * Updates notification preferences (approvals, comments, downloads, digest, whatsapp).
 * Requires admin or owner role.
 */
export async function updateWorkspaceNotificationSettingsAction(
  workspaceSlug: string,
  dto: {
    notifyApprovals?: boolean;
    notifyComments?: boolean;
    notifyDownloads?: boolean;
    weeklyDigest?: boolean;
    whatsappNumber?: string | null;
    whatsappEnabled?: boolean;
  }
): Promise<SettingsActionResult<WorkspaceSettings>> {
  try {
    const services = await getServerServices();
    const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    await requireWorkspaceMember(workspace.id, "admin");

    const updated = await services.settings.upsert(workspace.id, {
      notifyApprovals: dto.notifyApprovals,
      notifyComments: dto.notifyComments,
      notifyDownloads: dto.notifyDownloads,
      weeklyDigest: dto.weeklyDigest,
      whatsappNumber: dto.whatsappNumber,
      whatsappEnabled: dto.whatsappEnabled,
    });

    revalidatePath(`/${workspaceSlug}/notifications`);
    return { success: true, data: updated };
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
): Promise<SettingsActionResult<WorkspaceSettings>> {
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
    return { success: true, data: updated };
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

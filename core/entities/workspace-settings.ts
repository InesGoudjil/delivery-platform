export interface WorkspaceSettings {
  workspaceId: string;
  notifyApprovals: boolean;
  notifyComments: boolean;
  notifyDownloads: boolean;
  weeklyDigest: boolean;
  whatsappNumber?: string | null;
  whatsappEnabled: boolean;
  defaultLinkExpirationDays?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateWorkspaceSettingsDTO {
  notifyApprovals?: boolean;
  notifyComments?: boolean;
  notifyDownloads?: boolean;
  weeklyDigest?: boolean;
  whatsappNumber?: string | null;
  whatsappEnabled?: boolean;
  defaultLinkExpirationDays?: number | null;
}

export const DEFAULT_WORKSPACE_SETTINGS: Omit<WorkspaceSettings, "workspaceId" | "createdAt" | "updatedAt"> = {
  notifyApprovals: true,
  notifyComments: true,
  notifyDownloads: true,
  weeklyDigest: false,
  whatsappNumber: null,
  whatsappEnabled: true,
  defaultLinkExpirationDays: 30,
};

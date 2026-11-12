import { maskPhone } from "@/lib/phone";

export interface WorkspaceSettings {
  workspaceId: string;
  notifyApprovals: boolean;
  notifyComments: boolean;
  notifyDownloads: boolean;
  weeklyDigest: boolean;
  /** The studio's WhatsApp number (digits, international). Alerts go to it only once verified. */
  whatsappNumber?: string | null;
  whatsappEnabled: boolean;
  /** When whatsappNumber was verified with a one-time code; null = not verified. */
  whatsappVerifiedAt?: string | null;
  /** A number waiting for its verification code (server-side only). */
  whatsappPendingNumber?: string | null;
  whatsappCodeHash?: string | null;
  whatsappCodeExpiresAt?: string | null;
  whatsappCodeAttempts?: number;
  /** Which studio alerts also go to WhatsApp (the notify* switches above are for email). */
  whatsappNotifyApprovals: boolean;
  whatsappNotifyComments: boolean;
  whatsappNotifyDownloads: boolean;
  defaultLinkExpirationDays?: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Server-only WhatsApp number and verification state (written with the service role). */
export interface WhatsAppNumberState {
  whatsappNumber?: string | null;
  whatsappVerifiedAt?: string | null;
  whatsappPendingNumber?: string | null;
  whatsappCodeHash?: string | null;
  whatsappCodeExpiresAt?: string | null;
  whatsappCodeAttempts?: number;
}

export interface UpdateWorkspaceSettingsDTO {
  notifyApprovals?: boolean;
  notifyComments?: boolean;
  notifyDownloads?: boolean;
  weeklyDigest?: boolean;
  whatsappEnabled?: boolean;
  whatsappNotifyApprovals?: boolean;
  whatsappNotifyComments?: boolean;
  whatsappNotifyDownloads?: boolean;
  defaultLinkExpirationDays?: number | null;
}

export const DEFAULT_WORKSPACE_SETTINGS: Omit<WorkspaceSettings, "workspaceId" | "createdAt" | "updatedAt"> = {
  notifyApprovals: true,
  notifyComments: true,
  notifyDownloads: true,
  weeklyDigest: false,
  whatsappNumber: null,
  whatsappEnabled: true,
  whatsappVerifiedAt: null,
  whatsappNotifyApprovals: true,
  whatsappNotifyComments: true,
  whatsappNotifyDownloads: true,
  defaultLinkExpirationDays: 30,
};

/** The studio's WhatsApp number as the browser sees it: masked, without verification secrets. */
export interface WhatsAppNumberView {
  /** CineSpace's WhatsApp sender is set up; without it nothing goes out on WhatsApp. */
  available: boolean;
  /** The caller may change the number and the alert switches (admins and owners). */
  canManage: boolean;
  /** The verified number, masked ("+971 ••• ••4567"); null until one is verified. */
  verifiedNumber: string | null;
  verifiedAt: string | null;
  /** A number saved before verification existed, masked. It gets nothing until verified. */
  unverifiedNumber: string | null;
  /** Where the current code was sent (masked), while the code is still valid. */
  pendingNumber: string | null;
  pendingExpiresAt: string | null;
}

export type WorkspaceSettingsView = Omit<
  WorkspaceSettings,
  | "whatsappNumber"
  | "whatsappVerifiedAt"
  | "whatsappPendingNumber"
  | "whatsappCodeHash"
  | "whatsappCodeExpiresAt"
  | "whatsappCodeAttempts"
> & { whatsapp: WhatsAppNumberView };

export function toWorkspaceSettingsView(
  settings: WorkspaceSettings,
  options: { whatsappAvailable: boolean; canManage: boolean; now?: number }
): WorkspaceSettingsView {
  const {
    whatsappNumber,
    whatsappVerifiedAt,
    whatsappPendingNumber,
    whatsappCodeHash: _hash,
    whatsappCodeExpiresAt,
    whatsappCodeAttempts: _attempts,
    ...rest
  } = settings;
  const now = options.now ?? Date.now();
  const codeLive =
    Boolean(whatsappPendingNumber) && Boolean(whatsappCodeExpiresAt) && new Date(whatsappCodeExpiresAt!).getTime() > now;
  const verified = Boolean(whatsappNumber && whatsappVerifiedAt);
  return {
    ...rest,
    whatsapp: {
      available: options.whatsappAvailable,
      canManage: options.canManage,
      verifiedNumber: verified ? maskPhone(whatsappNumber) : null,
      verifiedAt: verified ? whatsappVerifiedAt ?? null : null,
      unverifiedNumber: !verified && whatsappNumber ? maskPhone(whatsappNumber) : null,
      pendingNumber: codeLive ? maskPhone(whatsappPendingNumber) : null,
      pendingExpiresAt: codeLive ? whatsappCodeExpiresAt ?? null : null,
    },
  };
}

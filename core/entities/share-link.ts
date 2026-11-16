import type { Delivery } from "./delivery";

/**
 * A way into a delivery room, with its own token and rules (supabase/migrations/20261116120000_share_links.sql).
 * A delivery has one or more; exactly one is primary.
 */
export interface ShareLink {
  id: string;
  workspaceId: string;
  deliveryId: string;
  /** The URL key: /deliver/<token>. Only ever sent to the browser of someone who may use it. */
  token: string;
  label: string;
  recipientName: string | null;
  recipientEmail: string | null;
  /** The delivery's main link: emails, WhatsApp and the copy buttons use it. Mirrored on the delivery's columns. */
  isPrimary: boolean;
  passcodeHash: string | null;
  /** Encrypted copy of a generated passcode (lib/security/passcode-seal.ts). Server-side only. */
  passcodeSealed: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  canComment: boolean;
  canApprove: boolean;
  canDownload: boolean;
  notifyOnOpen: boolean;
  notifyOnDownload: boolean;
  notifyOnComment: boolean;
  openCount: number;
  downloadCount: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  lastDownloadedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Where the client room found a link: share_links, or the delivery's own columns (before the migration). */
export type ShareLinkSource = "table" | "delivery";

export interface CreateShareLinkDTO {
  workspaceId: string;
  deliveryId: string;
  label: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  passcodeHash?: string | null;
  passcodeSealed?: string | null;
  expiresAt?: string | null;
  canComment?: boolean;
  canApprove?: boolean;
  canDownload?: boolean;
  notifyOnOpen?: boolean;
  notifyOnDownload?: boolean;
  notifyOnComment?: boolean;
  createdBy?: string | null;
}

export type UpdateShareLinkDTO = Partial<Omit<CreateShareLinkDTO, "workspaceId" | "deliveryId" | "createdBy">> & {
  token?: string;
  revokedAt?: string | null;
};

export type ShareLinkEventKind = "open" | "unlock" | "unlock_failed" | "download" | "comment" | "approve";

export interface ShareLinkEvent {
  id: number;
  linkId: string;
  kind: ShareLinkEventKind;
  assetId: string | null;
  country: string | null;
  createdAt: string;
}

/** A link with the delivery it opens, for the workspace's list of links. */
export interface WorkspaceShareLink extends ShareLink {
  deliveryTitle: string;
  deliveryStatus: string;
}

export type ShareLinkStatus = "active" | "expired" | "revoked";

export function shareLinkStatus(
  link: Pick<ShareLink, "revokedAt" | "expiresAt">,
  now: number = Date.now()
): ShareLinkStatus {
  if (link.revokedAt) return "revoked";
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= now) return "expired";
  return "active";
}

/**
 * The delivery's primary link, read from the delivery's own columns, which mirror it. The client
 * room uses this when share_links can't be read (before the migration is applied, or when the
 * read fails): only primary links open then. Its id isn't a row id, so it's never written anywhere.
 */
export function primaryLinkFromDelivery(delivery: Delivery): ShareLink {
  return {
    id: `delivery:${delivery.id}`,
    workspaceId: delivery.workspaceId,
    deliveryId: delivery.id,
    token: delivery.shareToken,
    label: "Client link",
    recipientName: null,
    recipientEmail: null,
    isPrimary: true,
    passcodeHash: delivery.passcodeHash ?? null,
    passcodeSealed: null,
    expiresAt: delivery.expiresAt ?? null,
    revokedAt: null,
    canComment: delivery.isCommentAllowed !== false,
    canApprove: true,
    canDownload: delivery.isDownloadAllowed === true,
    notifyOnOpen: false,
    notifyOnDownload: delivery.notifyOnDownload === true,
    notifyOnComment: true,
    openCount: 0,
    downloadCount: 0,
    firstOpenedAt: null,
    lastOpenedAt: null,
    lastDownloadedAt: null,
    createdBy: null,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
  };
}

/** True when the link is a share_links row, so its id may be stored (comments, approvals, events). */
export function isStoredShareLink(link: Pick<ShareLink, "id">): boolean {
  return !link.id.startsWith("delivery:");
}

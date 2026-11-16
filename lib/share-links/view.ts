import { shareLinkStatus, type ShareLink, type ShareLinkStatus, type WorkspaceShareLink } from "@/core/entities/share-link";

/** A share link as the studio's browser sees it: never its passcode hash or sealed copy. */
export interface ShareLinkView {
  id: string;
  deliveryId: string;
  token: string;
  label: string;
  recipientName: string | null;
  recipientEmail: string | null;
  isPrimary: boolean;
  status: ShareLinkStatus;
  hasPasscode: boolean;
  /** The passcode was generated, so it can be shown again. */
  canShowPasscode: boolean;
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
  createdAt: string;
}

export interface WorkspaceShareLinkView extends ShareLinkView {
  deliveryTitle: string;
}

export function toShareLinkView(link: ShareLink): ShareLinkView {
  return {
    id: link.id,
    deliveryId: link.deliveryId,
    token: link.token,
    label: link.label,
    recipientName: link.recipientName,
    recipientEmail: link.recipientEmail,
    isPrimary: link.isPrimary,
    status: shareLinkStatus(link),
    hasPasscode: Boolean(link.passcodeHash),
    canShowPasscode: Boolean(link.passcodeHash && link.passcodeSealed),
    expiresAt: link.expiresAt,
    revokedAt: link.revokedAt,
    canComment: link.canComment,
    canApprove: link.canApprove,
    canDownload: link.canDownload,
    notifyOnOpen: link.notifyOnOpen,
    notifyOnDownload: link.notifyOnDownload,
    notifyOnComment: link.notifyOnComment,
    openCount: link.openCount,
    downloadCount: link.downloadCount,
    firstOpenedAt: link.firstOpenedAt,
    lastOpenedAt: link.lastOpenedAt,
    lastDownloadedAt: link.lastDownloadedAt,
    createdAt: link.createdAt,
  };
}

export function toWorkspaceShareLinkView(link: WorkspaceShareLink): WorkspaceShareLinkView {
  return { ...toShareLinkView(link), deliveryTitle: link.deliveryTitle };
}

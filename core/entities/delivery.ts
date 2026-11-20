export type DeliveryStatus = "draft" | "in_review" | "approved" | "archived";
export type SiloStatus = "archived" | "restoring" | "restored";

export interface DeliveryAppearanceSettings {
  cardSize: "S" | "M" | "L";
  aspectRatioSetting: "masonry" | "16:9" | "1:1" | "9:16";
  thumbnailScale: "Fit" | "Fill";
  showCardInfo: boolean;
  watermarkMedia: boolean;
  coverThumbnailUrl?: string | null;
}

export interface Delivery {
  id: string;
  workspaceId: string;
  clientId?: string | null;
  title: string;
  description?: string | null;
  shareToken: string;
  passcodeHash?: string | null;
  status: DeliveryStatus;
  isDownloadAllowed: boolean;
  isCommentAllowed: boolean;
  notifyOnDownload: boolean;
  isWatermarked: boolean;
  appearance?: DeliveryAppearanceSettings | null;
  approvedAt?: string | null;
  approvedByName?: string | null;
  expiresAt?: string | null;
  location?: string | null;
  deliveryDate?: string | null;
  siloStatus?: SiloStatus | null;
  siloArchivedAt?: string | null;
  siloRestoreRequestedAt?: string | null;
  siloRestoreTier?: "Bulk" | "Standard" | null;
  siloRestoredAt?: string | null;
  siloMetadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryDTO {
  workspaceId: string;
  clientId?: string | null;
  title: string;
  description?: string | null;
  shareToken?: string;
  passcodeHash?: string | null;
  status?: DeliveryStatus;
  isDownloadAllowed?: boolean;
  isCommentAllowed?: boolean;
  notifyOnDownload?: boolean;
  isWatermarked?: boolean;
  appearance?: DeliveryAppearanceSettings | null;
  expiresAt?: string | null;
  location?: string | null;
  deliveryDate?: string | null;
  siloStatus?: SiloStatus | null;
  siloArchivedAt?: string | null;
  siloRestoreRequestedAt?: string | null;
  siloRestoreTier?: "Bulk" | "Standard" | null;
  siloRestoredAt?: string | null;
  siloMetadata?: Record<string, any> | null;
}

export interface UpdateDeliveryDTO extends Partial<CreateDeliveryDTO> {
  approvedAt?: string | null;
  approvedByName?: string | null;
}

export interface DeliverySummaryItem {
  id: string;
  workspaceId: string;
  clientId?: string | null;
  title: string;
  description?: string | null;
  shareToken: string;
  status: DeliveryStatus;
  isDownloadAllowed: boolean;
  isCommentAllowed: boolean;
  passcodeProtected: boolean;
  clientName: string;
  assetsCount: number;
  commentsCount: number;
  activeVersionNumber?: number | null;
  activeDurationSeconds?: number | null;
  createdAt: string;
  updatedAt: string;
  /** When the room was approved, and by whom. */
  approvedAt?: string | null;
  approvedByName?: string | null;
  /** Unresolved notes written by clients (guests). The studio's own notes don't count. */
  openNotesCount?: number;
  /** The newest note or reply, from anyone. */
  lastNoteAt?: string | null;
  /**
   * The last time a client opened, or downloaded from, any of the room's links. null: never.
   * Left out when the links couldn't be read, so "never" isn't claimed by mistake.
   */
  lastOpenedAt?: string | null;
  lastDownloadedAt?: string | null;
  /** The latest of: notes, replies, client visits and downloads, new files, approval, room edits. */
  lastActivityAt?: string | null;
}


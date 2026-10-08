export type DeliveryStatus = "draft" | "in_review" | "approved" | "archived";
export type SiloStatus = "archived" | "restoring" | "restored";

export interface DeliveryAppearanceSettings {
  cardSize: "S" | "M" | "L";
  aspectRatioSetting: "masonry" | "16:9" | "1:1" | "9:16";
  thumbnailScale: "Fit" | "Fill";
  showCardInfo: boolean;
  watermarkMedia: boolean;
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

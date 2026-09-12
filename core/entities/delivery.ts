export type DeliveryStatus = "draft" | "in_review" | "approved" | "archived";

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
  approvedAt?: string | null;
  approvedByName?: string | null;
  expiresAt?: string | null;
  location?: string | null;
  deliveryDate?: string | null;
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
  expiresAt?: string | null;
  location?: string | null;
  deliveryDate?: string | null;
}

export interface UpdateDeliveryDTO extends Partial<CreateDeliveryDTO> {
  approvedAt?: string | null;
  approvedByName?: string | null;
}

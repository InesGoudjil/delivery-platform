export type AssetType = "video" | "photo_gallery";
export type TranscodingStatus = "pending" | "processing" | "ready" | "failed";

export interface Asset {
  id: string;
  workspaceId: string;
  deliveryId?: string | null;
  title: string;
  type: AssetType;
  sortOrder: number;
  isArchived: boolean;
  isApproved: boolean;
  aspectRatio: string;
  category: string;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetVersion {
  id: string;
  assetId: string;
  versionNumber: number;
  label: string;
  rawFileUrl: string;
  hlsManifestUrl?: string | null;
  thumbnailUrl?: string | null;
  fileSizeBytes: number;
  durationSeconds?: number | null;
  transcodingStatus: TranscodingStatus;
  isActiveVersion: boolean;
  createdAt: string;
}

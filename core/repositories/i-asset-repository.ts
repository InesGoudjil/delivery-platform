import { Asset, AssetVersion, AssetType, TranscodingStatus } from "../entities/asset";

export interface CreateAssetDTO {
  workspaceId: string;
  deliveryId?: string | null;
  title: string;
  type?: AssetType;
  sortOrder?: number;
  isArchived?: boolean;
  isApproved?: boolean;
  aspectRatio?: string;
  category?: string;
}

export interface CreateAssetVersionDTO {
  assetId: string;
  versionNumber: number;
  label?: string;
  rawFileUrl: string;
  hlsManifestUrl?: string | null;
  thumbnailUrl?: string | null;
  fileSizeBytes?: number;
  durationSeconds?: number | null;
  transcodingStatus?: TranscodingStatus;
  isActiveVersion?: boolean;
}

export interface IAssetRepository {
  findById(id: string): Promise<Asset | null>;
  listByWorkspaceId(workspaceId: string): Promise<Asset[]>;
  listUnassignedByWorkspaceId(workspaceId: string): Promise<Asset[]>;
  listByDeliveryId(deliveryId: string): Promise<Asset[]>;
  listByIds(ids: string[]): Promise<Asset[]>;
  create(dto: CreateAssetDTO): Promise<Asset>;
  assignToDelivery(assetId: string, deliveryId: string | null): Promise<Asset>;
  toggleApproval(assetId: string, isApproved: boolean): Promise<Asset>;
  update(id: string, data: Partial<Asset>): Promise<Asset>;
  delete(id: string): Promise<void>;
}

export interface IAssetVersionRepository {
  findById(id: string): Promise<AssetVersion | null>;
  listByAssetId(assetId: string): Promise<AssetVersion[]>;
  findActiveVersion(assetId: string): Promise<AssetVersion | null>;
  create(dto: CreateAssetVersionDTO): Promise<AssetVersion>;
  update(id: string, data: Partial<AssetVersion>): Promise<AssetVersion>;
  updateLabel(versionId: string, label: string): Promise<AssetVersion>;
  setActiveVersion(assetId: string, versionId: string): Promise<void>;
  delete(id: string): Promise<void>;
}

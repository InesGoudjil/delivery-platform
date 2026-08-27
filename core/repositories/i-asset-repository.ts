import { Asset, AssetVersion } from '../entities/asset';

export interface CreateAssetDTO {
  workspaceId: string;
  projectId?: string | null;
  title: string;
  type?: 'video' | 'photo_gallery';
  sortOrder?: number;
  isArchived?: boolean;
}

export interface CreateAssetVersionDTO {
  assetId: string;
  versionNumber: number;
  rawFileUrl: string;
  hlsManifestUrl?: string;
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
}

export interface IAssetRepository {
  createAsset(data: CreateAssetDTO): Promise<Asset>;
  findById(id: string): Promise<Asset | null>;
  listByWorkspaceId(workspaceId: string): Promise<Asset[]>;
  listUnassignedByWorkspaceId(workspaceId: string): Promise<Asset[]>;
  listByProjectId(projectId: string): Promise<Asset[]>;
  assignToProject(assetId: string, projectId: string | null): Promise<Asset>;
  createVersion(data: CreateAssetVersionDTO): Promise<AssetVersion>;
  listVersionsByAssetId(assetId: string): Promise<AssetVersion[]>;
}

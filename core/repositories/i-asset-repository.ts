import { Asset, AssetVersion } from '../entities/asset';

export interface CreateAssetDTO {
  projectId: string;
  title: string;
  type?: 'video' | 'photo_gallery';
  sortOrder?: number;
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
  listByProjectId(projectId: string): Promise<Asset[]>;
  createVersion(data: CreateAssetVersionDTO): Promise<AssetVersion>;
  listVersionsByAssetId(assetId: string): Promise<AssetVersion[]>;
}

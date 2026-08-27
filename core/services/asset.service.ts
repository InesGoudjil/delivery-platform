import { Asset, AssetVersion, AssetType, TranscodingStatus } from '@/core/entities/asset';
import { IAssetRepository, IAssetVersionRepository } from '@/core/repositories/asset.repository';

export class AssetService {
  constructor(
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository
  ) {}

  async createAsset(params: {
    projectId: string;
    title: string;
    type?: AssetType;
    sortOrder?: number;
  }): Promise<Asset> {
    return this.assetRepo.create(params);
  }

  async getAssetById(id: string): Promise<Asset | null> {
    return this.assetRepo.findById(id);
  }

  async listAssets(projectId: string): Promise<Asset[]> {
    return this.assetRepo.listByProjectId(projectId);
  }

  async getListAssets(projectId: string): Promise<Asset[]> {
    return this.assetRepo.listByProjectId(projectId);
  }

  async listProjectAssets(projectId: string): Promise<Asset[]> {
    return this.assetRepo.listByProjectId(projectId);
  }

  async getActiveVersion(assetId: string): Promise<AssetVersion | null> {
    return this.assetVersionRepo.findActiveVersion(assetId);
  }

  async listVersions(assetId: string): Promise<AssetVersion[]> {
    return this.assetVersionRepo.listByAssetId(assetId);
  }

  async addVersion(params: {
    assetId: string;
    rawFileUrl: string;
    hlsManifestUrl?: string | null;
    thumbnailUrl?: string | null;
    fileSizeBytes?: number;
    durationSeconds?: number | null;
    transcodingStatus?: TranscodingStatus;
  }): Promise<AssetVersion> {
    const existingVersions = await this.assetVersionRepo.listByAssetId(params.assetId);
    const nextVersionNumber = existingVersions.length > 0 ? existingVersions[0].versionNumber + 1 : 1;

    return this.assetVersionRepo.create({
      assetId: params.assetId,
      versionNumber: nextVersionNumber,
      rawFileUrl: params.rawFileUrl,
      hlsManifestUrl: params.hlsManifestUrl,
      thumbnailUrl: params.thumbnailUrl,
      fileSizeBytes: params.fileSizeBytes,
      durationSeconds: params.durationSeconds,
      transcodingStatus: params.transcodingStatus || 'pending',
      isActiveVersion: true,
    });
  }

  async setActiveVersion(assetId: string, versionId: string): Promise<void> {
    return this.assetVersionRepo.setActiveVersion(assetId, versionId);
  }

  async updateTranscodingStatus(
    versionId: string,
    status: TranscodingStatus,
    hlsManifestUrl?: string | null,
    thumbnailUrl?: string | null
  ): Promise<AssetVersion> {
    const updates: Partial<AssetVersion> = {
      transcodingStatus: status,
    };
    if (hlsManifestUrl !== undefined) updates.hlsManifestUrl = hlsManifestUrl;
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;

    return this.assetVersionRepo.update(versionId, updates);
  }

  async deleteAsset(id: string): Promise<void> {
    return this.assetRepo.delete(id);
  }
}

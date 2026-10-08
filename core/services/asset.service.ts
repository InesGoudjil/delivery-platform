import { Asset, AssetVersion, AssetType, TranscodingStatus } from "@/core/entities/asset";
import {
  IAssetRepository,
  IAssetVersionRepository,
  CreateAssetDTO,
  CreateAssetVersionDTO,
  ListDeliveryAssetsOptions,
  PaginatedAssetsResult,
} from "@/core/repositories/i-asset-repository";

export class AssetService {
  constructor(
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository
  ) {}

  async createAsset(params: CreateAssetDTO): Promise<Asset> {
    return this.assetRepo.create(params);
  }

  async getAssetById(id: string): Promise<Asset | null> {
    return this.assetRepo.findById(id);
  }

  async listDeliveryAssets(deliveryId: string, options?: ListDeliveryAssetsOptions): Promise<Asset[]> {
    return this.assetRepo.listByDeliveryId(deliveryId, options);
  }

  async listDeliveryAssetsPaginated(
    deliveryId: string,
    options?: ListDeliveryAssetsOptions
  ): Promise<PaginatedAssetsResult> {
    return this.assetRepo.listByDeliveryIdPaginated(deliveryId, options);
  }

  async countDeliveryAssets(
    deliveryId: string,
    options?: { type?: string; isApproved?: boolean }
  ): Promise<number> {
    return this.assetRepo.countByDeliveryId(deliveryId, options);
  }

  // Alias for backward-compatibility
  async listAssets(deliveryId: string, options?: ListDeliveryAssetsOptions): Promise<Asset[]> {
    return this.listDeliveryAssets(deliveryId, options);
  }

  async listProjectAssets(deliveryId: string, options?: ListDeliveryAssetsOptions): Promise<Asset[]> {
    return this.listDeliveryAssets(deliveryId, options);
  }

  async listWorkspaceAssets(workspaceId: string): Promise<Asset[]> {
    return this.assetRepo.listByWorkspaceId(workspaceId);
  }

  async listUnassignedAssets(workspaceId: string): Promise<Asset[]> {
    return this.assetRepo.listUnassignedByWorkspaceId(workspaceId);
  }

  async assignAssetToDelivery(assetId: string, deliveryId: string | null): Promise<Asset> {
    return this.assetRepo.assignToDelivery(assetId, deliveryId);
  }

  async toggleApproval(assetId: string, isApproved: boolean): Promise<Asset> {
    return this.assetRepo.toggleApproval(assetId, isApproved);
  }

  async getActiveVersion(assetId: string): Promise<AssetVersion | null> {
    return this.assetVersionRepo.findActiveVersion(assetId);
  }

  async listVersions(assetId: string): Promise<AssetVersion[]> {
    return this.assetVersionRepo.listByAssetId(assetId);
  }

  async addVersion(params: CreateAssetVersionDTO): Promise<AssetVersion> {
    return this.assetVersionRepo.create(params);
  }

  async renameVersion(versionId: string, label: string): Promise<AssetVersion> {
    return this.assetVersionRepo.updateLabel(versionId, label);
  }

  async deleteVersion(versionId: string): Promise<void> {
    return this.assetVersionRepo.delete(versionId);
  }

  async setActiveVersion(assetId: string, versionId: string): Promise<void> {
    return this.assetVersionRepo.setActiveVersion(assetId, versionId);
  }

  async updateTranscodingStatus(
    versionId: string,
    status: TranscodingStatus,
    hlsManifestUrl?: string,
    thumbnailUrl?: string,
    durationSeconds?: number
  ): Promise<AssetVersion> {
    return this.assetVersionRepo.update(versionId, {
      transcodingStatus: status,
      ...(hlsManifestUrl && { hlsManifestUrl }),
      ...(thumbnailUrl && { thumbnailUrl }),
      ...(durationSeconds && { durationSeconds }),
    });
  }

  async updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    return this.assetRepo.update(id, data);
  }

  async updateThumbnail(versionId: string, thumbnailUrl: string): Promise<AssetVersion> {
    return this.assetVersionRepo.update(versionId, { thumbnailUrl });
  }

  async archiveAsset(id: string): Promise<Asset> {
    return this.assetRepo.archive(id);
  }

  async restoreAsset(id: string): Promise<Asset> {
    return this.assetRepo.restore(id);
  }

  async listTrashAssets(workspaceId: string): Promise<Asset[]> {
    return this.assetRepo.listArchivedByWorkspaceId(workspaceId);
  }

  async deleteAsset(id: string): Promise<void> {
    return this.assetRepo.delete(id);
  }
}

import { IStorageProvider, DirectUploadResult, StorageAssetType } from "@/core/providers/storage";
import { IWorkspaceRepository } from "@/core/repositories/workspace.repository";
import { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import {
  IAssetRepository,
  IAssetVersionRepository,
} from "@/core/repositories/i-asset-repository";
import { ISubscriptionRepository } from "@/core/repositories/subscription.repository";
import { IPlanRepository } from "@/core/repositories/plan.repository";
import { Asset, AssetVersion, AssetType, TranscodingStatus } from "@/core/entities/asset";

export interface RequestAssetUploadDTO {
  workspaceId: string;
  projectId?: string | null;
  deliveryId?: string | null;
  title: string;
  filename: string;
  fileSizeBytes: number;
  assetType?: AssetType;
  maxDurationSeconds?: number;
  metadata?: Record<string, string>;
}

export interface RequestVideoUploadDTO extends RequestAssetUploadDTO {}

export interface RequestUploadResult {
  asset: Asset;
  assetVersion: AssetVersion;
  directUpload: DirectUploadResult;
}

export type RequestVideoUploadResult = RequestUploadResult;

export interface ConfirmUploadDTO {
  assetVersionId: string;
  providerUid: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
}

function mapStorageStatusToTranscodingStatus(status?: string): TranscodingStatus {
  if (status === "ready") return "ready";
  if (status === "processing") return "processing";
  if (status === "error" || status === "failed") return "failed";
  return "pending";
}

export class AssetUploadService {
  constructor(
    private readonly storageProvider: IStorageProvider,
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly deliveryRepo: IDeliveryRepository,
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository
  ) {}

  /**
   * Validates storage limits and generates a direct client upload URL for video or photo assets.
   */
  async requestAssetUpload(
    dto: RequestAssetUploadDTO
  ): Promise<RequestUploadResult> {
    const assetType: AssetType = dto.assetType || "video";

    // 1. Resolve Workspace (by ID or slug)
    let workspace = await this.workspaceRepo.findById(dto.workspaceId);
    if (!workspace) {
      workspace = await this.workspaceRepo.findBySlug(dto.workspaceId);
    }
    if (!workspace) {
      throw new Error("Workspace not found.");
    }
    const resolvedWorkspaceId = workspace.id;

    // 2. Resolve Delivery (if provided, by ID or share token)
    let resolvedDeliveryId: string | null = null;
    const targetDeliveryId = dto.deliveryId || dto.projectId;
    if (targetDeliveryId && targetDeliveryId.trim() !== "" && targetDeliveryId !== "new") {
      let delivery = await this.deliveryRepo.findById(targetDeliveryId);
      if (!delivery) {
        delivery = await this.deliveryRepo.findByShareToken(targetDeliveryId);
      }
      if (delivery) {
        if (delivery.workspaceId !== resolvedWorkspaceId) {
          throw new Error("Delivery not found in the specified workspace.");
        }
        resolvedDeliveryId = delivery.id;
      }
    }

    // 3. Validate Storage Quota against Active Plan
    const subscription = await this.subscriptionRepo.findByWorkspaceId(
      resolvedWorkspaceId
    );
    let storageLimitGB = 50; // Default fallback 50 GB

    if (subscription) {
      const plan = await this.planRepo.findById(subscription.planId);
      if (plan && plan.features && plan.features.storage_gb) {
        storageLimitGB = plan.features.storage_gb;
      }
    }

    const storageLimitBytes = storageLimitGB * 1024 * 1024 * 1024;
    const currentUsageBytes = workspace.storageUsedBytes || 0;
    const projectedUsageBytes = currentUsageBytes + dto.fileSizeBytes;

    if (projectedUsageBytes > storageLimitBytes) {
      const availableGB = Math.max(
        0,
        ((storageLimitBytes - currentUsageBytes) / (1024 * 1024 * 1024)).toFixed(1) as any
      );
      throw new Error(
        `Storage quota exceeded. Your plan allows ${storageLimitGB} GB (Available: ${availableGB} GB). Please upgrade your subscription or delete old assets.`
      );
    }

    // 4. Create Asset Domain Record
    let existingAssets: Asset[] = [];
    if (resolvedDeliveryId) {
      existingAssets = await this.assetRepo.listByDeliveryId(resolvedDeliveryId);
    } else {
      existingAssets = await this.assetRepo.listUnassignedByWorkspaceId(resolvedWorkspaceId);
    }

    const asset = await this.assetRepo.create({
      workspaceId: resolvedWorkspaceId,
      deliveryId: resolvedDeliveryId,
      title: dto.title,
      type: assetType,
      sortOrder: existingAssets.length,
    });

    // 5. Determine Version Number
    const existingVersions = await this.assetVersionRepo.listByAssetId(asset.id);
    const nextVersionNumber =
      existingVersions.length > 0
        ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
        : 1;

    const storageAssetType: StorageAssetType = assetType === "photo_gallery" ? "image" : "video";

    // 6. Request Direct Upload URL from Storage Provider (Cloudflare Stream / R2 / Mock)
    const directUpload = await this.storageProvider.createDirectUploadUrl({
      workspaceId: resolvedWorkspaceId,
      projectId: resolvedDeliveryId || "standalone",
      deliveryId: resolvedDeliveryId || "standalone",
      assetTitle: dto.title,
      assetType: storageAssetType,
      fileSizeBytes: dto.fileSizeBytes,
      filename: dto.filename,
      maxDurationSeconds: dto.maxDurationSeconds,
      metadata: {
        assetId: asset.id,
        ...(dto.metadata || {}),
      },
    });

    // 7. Create Pending AssetVersion Record
    let cleanInitialUrl = directUpload.uploadUrl.split("?")[0];
    if (directUpload.providerUid) {
      cleanInitialUrl = `/api/media/${directUpload.providerUid}`;
    }

    const assetVersion = await this.assetVersionRepo.create({
      assetId: asset.id,
      versionNumber: nextVersionNumber,
      rawFileUrl: cleanInitialUrl,
      fileSizeBytes: dto.fileSizeBytes,
      transcodingStatus: assetType === "photo_gallery" ? "ready" : "pending",
      isActiveVersion: true,
    });

    return {
      asset,
      assetVersion,
      directUpload,
    };
  }

  /**
   * Alias for requestAssetUpload for backward compatibility.
   */
  async requestVideoUpload(dto: RequestVideoUploadDTO): Promise<RequestVideoUploadResult> {
    return this.requestAssetUpload({ ...dto, assetType: "video" });
  }

  /**
   * Confirms upload completion from the browser, retrieves playback info, and increments storage bytes.
   */
  async confirmUploadCompleted(dto: ConfirmUploadDTO): Promise<AssetVersion> {
    const version = await this.assetVersionRepo.findById(dto.assetVersionId);
    if (!version) {
      throw new Error("Asset version not found.");
    }

    const asset = await this.assetRepo.findById(version.assetId);
    if (!asset) {
      throw new Error("Asset not found.");
    }

    let workspaceId = asset.workspaceId;
    if (!workspaceId && asset.deliveryId) {
      const delivery = await this.deliveryRepo.findById(asset.deliveryId);
      if (delivery) workspaceId = delivery.workspaceId;
    }

    // 1. Get initial playback and details from Storage Provider
    const playbackInfo = await this.storageProvider.getPlaybackInfo(dto.providerUid);

    // 2. Update AssetVersion record
    let cleanRawUrl = (playbackInfo as any)?.rawDownloadUrl || version.rawFileUrl.split("?")[0];
    if (cleanRawUrl.includes("workspaces/")) {
      const parts = cleanRawUrl.split("workspaces/");
      cleanRawUrl = `/api/media/workspaces/${parts[1].split("?")[0]}`;
    }

    const updatedVersion = await this.assetVersionRepo.update(version.id, {
      rawFileUrl: cleanRawUrl,
      hlsManifestUrl: playbackInfo?.hlsManifestUrl || version.hlsManifestUrl,
      thumbnailUrl: playbackInfo?.thumbnailUrl || version.thumbnailUrl,
      durationSeconds: dto.durationSeconds ?? playbackInfo?.durationSeconds ?? version.durationSeconds,
      fileSizeBytes: dto.fileSizeBytes ?? version.fileSizeBytes,
      transcodingStatus: mapStorageStatusToTranscodingStatus(playbackInfo?.status),
      isActiveVersion: true,
    });

    // 3. Increment Workspace Storage Used
    if (dto.fileSizeBytes && workspaceId) {
      if (typeof (this.workspaceRepo as any).incrementStorageUsed === 'function') {
        await (this.workspaceRepo as any).incrementStorageUsed(
          workspaceId,
          dto.fileSizeBytes
        );
      }
    }

    return updatedVersion;
  }

  /**
   * Cloudflare Stream Webhook handler: called asynchronously when 4K transcoding is complete.
   */
  async handleTranscodeWebhook(event: any): Promise<void> {
    const providerUid = event?.data?.uid || event?.uid || event?.providerUid;
    if (!providerUid) return;

    const playbackInfo = await this.storageProvider.getPlaybackInfo(providerUid);
    if (!playbackInfo) return;

    const assetVersionId = event?.data?.meta?.assetVersionId || event?.meta?.assetVersionId;

    if (assetVersionId) {
      await this.assetVersionRepo.update(assetVersionId, {
        hlsManifestUrl: playbackInfo.hlsManifestUrl,
        thumbnailUrl: playbackInfo.thumbnailUrl,
        durationSeconds: playbackInfo.durationSeconds,
        transcodingStatus: mapStorageStatusToTranscodingStatus(playbackInfo.status),
      });
    }
  }
}

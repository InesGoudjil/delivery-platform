import { IStorageProvider, DirectUploadResult } from "@/core/providers/storage";
import { IWorkspaceRepository } from "@/core/repositories/workspace.repository";
import { IProjectRepository } from "@/core/repositories/project.repository";
import {
  IAssetRepository,
  IAssetVersionRepository,
} from "@/core/repositories/asset.repository";
import { ISubscriptionRepository } from "@/core/repositories/subscription.repository";
import { IPlanRepository } from "@/core/repositories/plan.repository";
import { Asset, AssetVersion } from "@/core/entities/asset";

export interface RequestVideoUploadDTO {
  workspaceId: string;
  projectId: string;
  title: string;
  filename: string;
  fileSizeBytes: number;
  maxDurationSeconds?: number;
  metadata?: Record<string, string>;
}

export interface RequestVideoUploadResult {
  asset: Asset;
  assetVersion: AssetVersion;
  directUpload: DirectUploadResult;
}

export interface ConfirmUploadDTO {
  assetVersionId: string;
  providerUid: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
}

export class AssetUploadService {
  constructor(
    private readonly storageProvider: IStorageProvider,
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly projectRepo: IProjectRepository,
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository
  ) {}

  /**
   * Validates storage limits and generates a direct client upload URL (up to 5GB).
   */
  async requestVideoUpload(
    dto: RequestVideoUploadDTO
  ): Promise<RequestVideoUploadResult> {
    // 1. Verify Project & Workspace
    const project = await this.projectRepo.findById(dto.projectId);
    if (!project || project.workspaceId !== dto.workspaceId) {
      throw new Error("Project not found in the specified workspace.");
    }

    const workspace = await this.workspaceRepo.findById(dto.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    // 2. Validate Storage Quota against Active Plan
    const subscription = await this.subscriptionRepo.findByWorkspaceId(
      dto.workspaceId
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
        `Storage quota exceeded. Your plan allows ${storageLimitGB} GB (Available: ${availableGB} GB). Please upgrade your subscription or delete old cuts.`
      );
    }

    // 3. Create Asset Domain Record
    const existingAssets = await this.assetRepo.listByProjectId(dto.projectId);
    const asset = await this.assetRepo.create({
      projectId: dto.projectId,
      title: dto.title,
      type: "video",
      sortOrder: existingAssets.length,
    });

    // 4. Determine Version Number
    const existingVersions = await this.assetVersionRepo.listByAssetId(asset.id);
    const nextVersionNumber =
      existingVersions.length > 0
        ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
        : 1;

    // 5. Request Direct Upload URL from Storage Provider (Cloudflare / Mock)
    const directUpload = await this.storageProvider.createDirectUploadUrl({
      workspaceId: dto.workspaceId,
      projectId: dto.projectId,
      assetTitle: dto.title,
      assetType: "video",
      fileSizeBytes: dto.fileSizeBytes,
      filename: dto.filename,
      maxDurationSeconds: dto.maxDurationSeconds,
      metadata: dto.metadata,
    });

    // 6. Create Pending AssetVersion Record
    const assetVersion = await this.assetVersionRepo.create({
      assetId: asset.id,
      versionNumber: nextVersionNumber,
      rawFileUrl: directUpload.uploadUrl,
      fileSizeBytes: dto.fileSizeBytes,
      transcodingStatus: "pending",
      isActiveVersion: true,
    });

    return {
      asset,
      assetVersion,
      directUpload,
    };
  }

  /**
   * Confirms upload completion from the browser, retrieves playback info, and increments storage bytes.
   */
  async confirmUploadCompleted(dto: ConfirmUploadDTO): Promise<AssetVersion> {
    const version = await this.assetVersionRepo.findById(dto.assetVersionId);
    if (!version) {
      throw new Error("Asset version not found.");
    }

    // Retrieve playback information from provider
    const playback = await this.storageProvider.getPlaybackInfo(dto.providerUid);

    const updated = await this.assetVersionRepo.update(dto.assetVersionId, {
      hlsManifestUrl: playback?.hlsManifestUrl,
      thumbnailUrl: playback?.thumbnailUrl,
      durationSeconds: dto.durationSeconds || playback?.durationSeconds,
      fileSizeBytes: dto.fileSizeBytes || version.fileSizeBytes,
      transcodingStatus: playback?.status === "ready" ? "ready" : "processing",
    });

    // Update workspace storage used
    const asset = await this.assetRepo.findById(version.assetId);
    if (asset) {
      const project = await this.projectRepo.findById(asset.projectId);
      if (project) {
        const workspace = await this.workspaceRepo.findById(project.workspaceId);
        if (workspace) {
          const newTotal = (workspace.storageUsedBytes || 0) + (dto.fileSizeBytes || version.fileSizeBytes || 0);
          await this.workspaceRepo.update(workspace.id, {
            storageUsedBytes: newTotal,
          });
        }
      }
    }

    return updated;
  }

  /**
   * Webhook handler for Cloudflare Stream background transcoding completion
   */
  async handleCloudflareWebhook(
    payload: any,
    headers: Record<string, string>
  ): Promise<boolean> {
    if (
      this.storageProvider.verifyWebhookSignature &&
      !this.storageProvider.verifyWebhookSignature(JSON.stringify(payload), headers)
    ) {
      return false;
    }

    const { uid, status, duration, size } = payload;
    if (!uid) return false;

    // Find and update the version referencing this stream UID
    const playback = await this.storageProvider.getPlaybackInfo(uid);
    if (!playback) return false;

    return true;
  }
}

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
  projectId?: string | null;
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
    // 1. Resolve Workspace (by ID or slug)
    let workspace = await this.workspaceRepo.findById(dto.workspaceId);
    if (!workspace) {
      workspace = await this.workspaceRepo.findBySlug(dto.workspaceId);
    }
    if (!workspace) {
      throw new Error("Workspace not found.");
    }
    const resolvedWorkspaceId = workspace.id;

    // 2. Resolve Project (if provided, by ID or share token)
    let resolvedProjectId: string | null = null;
    if (dto.projectId) {
      let project = await this.projectRepo.findById(dto.projectId);
      if (!project) {
        project = await this.projectRepo.findByShareToken(dto.projectId);
      }
      if (project) {
        if (project.workspaceId !== resolvedWorkspaceId) {
          throw new Error("Project not found in the specified workspace.");
        }
        resolvedProjectId = project.id;
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
        `Storage quota exceeded. Your plan allows ${storageLimitGB} GB (Available: ${availableGB} GB). Please upgrade your subscription or delete old cuts.`
      );
    }

    // 4. Create Asset Domain Record
    let existingAssets: Asset[] = [];
    if (resolvedProjectId) {
      existingAssets = await this.assetRepo.listByProjectId(resolvedProjectId);
    } else {
      existingAssets = await this.assetRepo.listUnassignedByWorkspaceId(resolvedWorkspaceId);
    }

    const asset = await this.assetRepo.create({
      workspaceId: resolvedWorkspaceId,
      projectId: resolvedProjectId,
      title: dto.title,
      type: "video",
      sortOrder: existingAssets.length,
    });

    // 5. Determine Version Number
    const existingVersions = await this.assetVersionRepo.listByAssetId(asset.id);
    const nextVersionNumber =
      existingVersions.length > 0
        ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
        : 1;

    // 6. Request Direct Upload URL from Storage Provider (Cloudflare Stream / Mock)
    const directUpload = await this.storageProvider.createDirectUploadUrl({
      workspaceId: resolvedWorkspaceId,
      projectId: resolvedProjectId || "standalone",
      assetTitle: dto.title,
      assetType: "video",
      fileSizeBytes: dto.fileSizeBytes,
      filename: dto.filename,
      maxDurationSeconds: dto.maxDurationSeconds,
      metadata: dto.metadata,
    });

    // 7. Create Pending AssetVersion Record
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

    const asset = await this.assetRepo.findById(version.assetId);
    if (!asset) {
      throw new Error("Asset not found.");
    }

    let workspaceId = asset.workspaceId;
    if (!workspaceId && asset.projectId) {
      const project = await this.projectRepo.findById(asset.projectId);
      if (project) workspaceId = project.workspaceId;
    }

    // 1. Get initial playback and details from Storage Provider
    const playbackInfo = await this.storageProvider.getPlaybackInfo(dto.providerUid);

    // 2. Update AssetVersion record
    const updatedVersion = await this.assetVersionRepo.update(version.id, {
      rawFileUrl: (playbackInfo as any).rawDownloadUrl || version.rawFileUrl,
      hlsManifestUrl: playbackInfo.hlsManifestUrl,
      thumbnailUrl: playbackInfo.thumbnailUrl,
      durationSeconds: dto.durationSeconds ?? playbackInfo.durationSeconds,
      fileSizeBytes: dto.fileSizeBytes ?? version.fileSizeBytes,
      transcodingStatus: (playbackInfo as any).transcodingStatus ?? 'ready',
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
    const parsed = await (this.storageProvider as any).parseWebhookEvent(event);
    if (!parsed || !parsed.providerUid) return;

    const playbackInfo = await this.storageProvider.getPlaybackInfo(parsed.providerUid);

    // If metadata contains assetVersionId, update directly
    if (parsed.metadata && parsed.metadata.assetVersionId) {
      await this.assetVersionRepo.update(parsed.metadata.assetVersionId, {
        hlsManifestUrl: playbackInfo.hlsManifestUrl,
        thumbnailUrl: playbackInfo.thumbnailUrl,
        durationSeconds: playbackInfo.durationSeconds,
        transcodingStatus: parsed.status,
      });
    }
  }
}

import { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import { IAssetRepository, IAssetVersionRepository } from "@/core/repositories/i-asset-repository";
import { IWorkspaceRepository } from "@/core/repositories/workspace.repository";
import { IStorageProvider } from "@/core/providers/storage/storage.provider";
import {
  ISiloStorageProvider,
  GlacierTier,
  SiloRestoreStatusResult,
} from "@/core/providers/storage/silo-glacier.provider";
import { NotificationService } from "./notification.service";
import { SubscriptionService } from "./subscription.service";

export interface ArchiveDeliveryResult {
  success: boolean;
  deliveryId: string;
  bytesArchived: number;
  assetsArchived: number;
  versionsArchived: number;
}

export interface RestoreDeliveryResult {
  success: boolean;
  deliveryId: string;
  status: "restoring" | "already_restored";
  tier: GlacierTier;
  estimatedHours: number;
}

export interface CheckRestoreResult {
  deliveryId: string;
  isReady: boolean;
  status: "ready" | "restoring" | "archived" | "not_found";
  expiryDate?: Date;
  thawedVersionsCount: number;
  totalVersionsCount: number;
}

export class SiloService {
  constructor(
    private readonly siloProvider: ISiloStorageProvider,
    private readonly activeStorage: IStorageProvider,
    private readonly deliveryRepo: IDeliveryRepository,
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository,
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly subscriptionService?: SubscriptionService,
    private readonly notificationService?: NotificationService,
    private readonly memberService?: any
  ) {}

  /**
   * Helper: extract clean filename from a path or URL
   */
  private extractFilename(key: string, fallback: string = "master-asset.mp4"): string {
    const parts = key.split("?")[0].split("/");
    const last = parts[parts.length - 1];
    return last ? decodeURIComponent(last) : fallback;
  }

  /**
   * Moves all master media assets from active hot storage (Cloudflare R2)
   * into AWS S3 Glacier Deep Archive (The Silo), and frees workspace active storage quota.
   */
  async archiveDelivery(
    deliveryId: string,
    options?: { userId?: string }
  ): Promise<ArchiveDeliveryResult> {
    const delivery = await this.deliveryRepo.findById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery with id "${deliveryId}" not found.`);
    }

    // Check plan eligibility if subscription service is attached
    if (this.subscriptionService) {
      const isAllowed = await this.subscriptionService.isSiloArchiveAllowed(
        delivery.workspaceId
      );
      if (!isAllowed) {
        throw new Error(
          "The Silo Cold Storage Archive requires a Pro, Studio, or Enterprise subscription."
        );
      }
    }

    const assets = await this.assetRepo.listByDeliveryId(deliveryId);
    let totalBytesArchived = 0;
    let versionsArchivedCount = 0;

    for (const asset of assets) {
      const versions = await this.assetVersionRepo.listByAssetId(asset.id);

      for (const version of versions) {
        const rawKey = version.rawFileUrl?.trim();
        // Skip if already archived to S3 Glacier
        if (version.siloArchiveKey || (rawKey && rawKey.startsWith("silo://"))) {
          continue;
        }

        if (!rawKey) continue;

        const filename = this.extractFilename(rawKey, `${asset.title || "asset"}.mp4`);
        const s3TargetKey = `silo/workspaces/${delivery.workspaceId}/deliveries/${delivery.id}/assets/${asset.id}/v${version.versionNumber}/${Date.now()}-${filename}`;

        // 1. Stream from active Cloudflare R2 storage
        if (typeof this.activeStorage.getObjectStream !== "function") {
          throw new Error("Active storage provider does not support streaming objects for archive.");
        }

        const sourceStream = await this.activeStorage.getObjectStream(rawKey);

        // 2. Stream directly into AWS S3 Glacier Deep Archive
        const archiveResult = await this.siloProvider.archiveStream({
          stream: sourceStream.stream,
          targetKey: s3TargetKey,
          contentType: sourceStream.contentType,
          contentLength: version.fileSizeBytes || sourceStream.contentLength,
          metadata: {
            workspaceId: delivery.workspaceId,
            deliveryId: delivery.id,
            assetId: asset.id,
            versionId: version.id,
            originalKey: rawKey,
          },
        });

        // 3. Delete from active storage (Cloudflare R2) to free hot space
        try {
          await this.activeStorage.deleteAsset(rawKey);
        } catch (delErr) {
          console.warn("[SiloService] Non-critical warning deleting active copy:", delErr);
        }

        // 4. Update AssetVersion record
        await this.assetVersionRepo.update(version.id, {
          siloArchiveKey: archiveResult.archiveKey,
          siloStorageClass: archiveResult.storageClass,
          rawFileUrl: `silo://${archiveResult.archiveKey}`,
        });

        totalBytesArchived += version.fileSizeBytes || archiveResult.sizeBytes;
        versionsArchivedCount++;
      }

      // Mark the asset as archived
      await this.assetRepo.archive(asset.id);
    }

    // 5. Decrement workspace active storage quota by the total bytes moved to cold archive
    if (totalBytesArchived > 0) {
      await this.workspaceRepo.incrementStorageUsed(delivery.workspaceId, -totalBytesArchived);
    }

    // 6. Update Delivery record with Silo metadata
    await this.deliveryRepo.update(deliveryId, {
      status: "archived",
      siloStatus: "archived",
      siloArchivedAt: new Date().toISOString(),
      siloMetadata: {
        totalBytesArchived,
        assetsArchived: assets.length,
        versionsArchived: versionsArchivedCount,
        archivedByUserId: options?.userId || null,
        storageClass: "DEEP_ARCHIVE",
      },
    });

    return {
      success: true,
      deliveryId,
      bytesArchived: totalBytesArchived,
      assetsArchived: assets.length,
      versionsArchived: versionsArchivedCount,
    };
  }

  /**
   * Initiates thawing / restoration of an archived project from AWS S3 Glacier Deep Archive.
   * Standard tier takes ~12 hours; Bulk tier takes up to 48 hours.
   */
  async requestRestoreDelivery(
    deliveryId: string,
    tier: GlacierTier = "Bulk",
    days: number = 7
  ): Promise<RestoreDeliveryResult> {
    const delivery = await this.deliveryRepo.findById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery with id "${deliveryId}" not found.`);
    }

    const assets = await this.assetRepo.listByDeliveryId(deliveryId);
    let restoreInitiatedCount = 0;

    for (const asset of assets) {
      const versions = await this.assetVersionRepo.listByAssetId(asset.id);

      for (const version of versions) {
        if (!version.siloArchiveKey) continue;

        await this.siloProvider.requestRestore({
          key: version.siloArchiveKey,
          tier,
          days,
        });

        restoreInitiatedCount++;
      }
    }

    // Update Delivery status to "restoring"
    await this.deliveryRepo.update(deliveryId, {
      siloStatus: "restoring",
      siloRestoreRequestedAt: new Date().toISOString(),
      siloRestoreTier: tier,
    });

    return {
      success: true,
      deliveryId,
      status: "restoring",
      tier,
      estimatedHours: tier === "Bulk" ? 48 : 12,
    };
  }

  /**
   * Checks whether all archived assets for a delivery have finished thawing in AWS S3.
   * If all are thawed, moves them back into active Cloudflare R2 storage, updates the status
   * to restored/approved, and emails the creator.
   */
  async checkAndFinalizeRestore(
    deliveryId: string,
    options?: { origin?: string; notifyEmails?: string[] }
  ): Promise<CheckRestoreResult> {
    const delivery = await this.deliveryRepo.findById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery with id "${deliveryId}" not found.`);
    }

    const assets = await this.assetRepo.listByDeliveryId(deliveryId);
    let totalVersionsWithArchive = 0;
    let thawedVersionsCount = 0;
    let earliestExpiry: Date | undefined;

    const versionStatuses: { version: any; status: SiloRestoreStatusResult }[] = [];

    for (const asset of assets) {
      const versions = await this.assetVersionRepo.listByAssetId(asset.id);

      for (const version of versions) {
        if (!version.siloArchiveKey) continue;
        totalVersionsWithArchive++;

        const statusRes = await this.siloProvider.checkRestoreStatus(version.siloArchiveKey);
        versionStatuses.push({ version, status: statusRes });

        if (statusRes.isRestored) {
          thawedVersionsCount++;
          if (
            statusRes.expiryDate &&
            (!earliestExpiry || statusRes.expiryDate < earliestExpiry)
          ) {
            earliestExpiry = statusRes.expiryDate;
          }
        }
      }
    }

    if (totalVersionsWithArchive === 0) {
      return {
        deliveryId,
        isReady: true,
        status: "ready",
        thawedVersionsCount: 0,
        totalVersionsCount: 0,
      };
    }

    const allThawed = thawedVersionsCount === totalVersionsWithArchive;

    if (allThawed && delivery.siloStatus !== "restored") {
      // 1. Move thawed objects from AWS S3 Glacier back to active storage (Cloudflare R2)
      let totalBytesRestored = 0;

      for (const { version } of versionStatuses) {
        if (!version.siloArchiveKey) continue;

        const filename = this.extractFilename(version.siloArchiveKey, "master.mp4");
        const activeKey = `private/workspaces/${delivery.workspaceId}/deliveries/${delivery.id}/assets/${version.assetId}/v${version.versionNumber}/${filename}`;

        // Get thawed stream from AWS S3
        const thawedData = await this.siloProvider.getObjectStream(version.siloArchiveKey);

        // Put back into active Cloudflare R2
        if (typeof this.activeStorage.putObjectStream === "function") {
          await this.activeStorage.putObjectStream(
            activeKey,
            thawedData.stream,
            thawedData.contentType,
            thawedData.contentLength || version.fileSizeBytes
          );
        }

        // Update asset version to point back to active key
        await this.assetVersionRepo.update(version.id, {
          rawFileUrl: activeKey,
        });

        totalBytesRestored += version.fileSizeBytes || thawedData.contentLength || 0;
      }

      // Unarchive assets
      for (const asset of assets) {
        await this.assetRepo.restore(asset.id);
      }

      // 2. Re-increment workspace active storage quota
      if (totalBytesRestored > 0) {
        await this.workspaceRepo.incrementStorageUsed(delivery.workspaceId, totalBytesRestored);
      }

      // 3. Mark delivery as restored & approved
      await this.deliveryRepo.update(deliveryId, {
        status: "approved",
        siloStatus: "restored",
        siloRestoredAt: new Date().toISOString(),
      });

      // 4. Dispatch notification email to creator
      if (this.notificationService) {
        let emails = options?.notifyEmails || [];
        if (emails.length === 0 && this.memberService) {
          try {
            const members = await this.memberService.listMembers(delivery.workspaceId);
            emails = members
              .filter((m: any) => (m.role === "owner" || m.role === "admin") && Boolean(m.email))
              .map((m: any) => m.email as string);
          } catch {
            // fallback
          }
        }

        if (emails.length > 0) {
          await this.notificationService
            .notifySiloRestoreCompleted({
              deliveryId,
              recipientEmails: emails,
              origin: options?.origin,
              thawedDays: 7,
            })
            .catch((err) => {
              console.error("[SiloService] Failed to dispatch restore notification:", err);
            });
        }
      }

      return {
        deliveryId,
        isReady: true,
        status: "ready",
        expiryDate: earliestExpiry,
        thawedVersionsCount,
        totalVersionsCount: totalVersionsWithArchive,
      };
    }

    return {
      deliveryId,
      isReady: allThawed,
      status: allThawed ? "ready" : "restoring",
      expiryDate: earliestExpiry,
      thawedVersionsCount,
      totalVersionsCount: totalVersionsWithArchive,
    };
  }

  /**
   * Generates direct presigned S3 download links for thawed objects during their 7-day thaw window.
   */
  async getDeliverySiloDownloadUrls(
    deliveryId: string
  ): Promise<{ assetId: string; versionId: string; title: string; downloadUrl: string }[]> {
    const assets = await this.assetRepo.listByDeliveryId(deliveryId);
    const downloads: { assetId: string; versionId: string; title: string; downloadUrl: string }[] = [];

    for (const asset of assets) {
      const activeVersion = await this.assetVersionRepo.findActiveVersion(asset.id);
      if (!activeVersion || !activeVersion.siloArchiveKey) continue;

      const filename = this.extractFilename(activeVersion.siloArchiveKey, `${asset.title}.mp4`);
      const downloadUrl = await this.siloProvider.getPresignedDownloadUrl(
        activeVersion.siloArchiveKey,
        filename,
        7200
      );

      downloads.push({
        assetId: asset.id,
        versionId: activeVersion.id,
        title: asset.title,
        downloadUrl,
      });
    }

    return downloads;
  }
}

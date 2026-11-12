import { IStorageProvider, DirectUploadResult, StorageAssetType } from "@/core/providers/storage";
import { IWorkspaceRepository } from "@/core/repositories/workspace.repository";
import { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import {
  IAssetRepository,
  IAssetVersionRepository,
} from "@/core/repositories/i-asset-repository";
import { ISubscriptionRepository } from "@/core/repositories/subscription.repository";
import { IPlanRepository } from "@/core/repositories/plan.repository";
import { IWorkspaceFeaturesRepository } from "@/core/repositories/workspace.repository";
import { Asset, AssetVersion, AssetType, TranscodingStatus } from "@/core/entities/asset";
import { isPlaceholderUrl } from "@/lib/media";
import { env } from "@/lib/env";
import { createScopedLogger } from "@/lib/logger";
import { isR2KeyInWorkspace, isStreamUid, isUuid, parseStoredMedia, streamUidOf } from "@/lib/storage/keys";
import {
  MAX_UPLOAD_BYTES,
  SNIFF_BYTES,
  bytesMatchAssetType,
  checkUploadFile,
  contentTypeForUpload,
  isStandalonePortfolioUpload,
  sniffMediaKind,
  type UploadPlacement,
} from "@/lib/validations/upload";
import type { SubscriptionService } from "./subscription.service";

const log = createScopedLogger({ service: "AssetUploadService" });

/**
 * File uploads, end to end.
 *
 *   1. requestAssetUpload: the server resolves the workspace, delivery and file, checks the
 *      file type and size against the allowlist, decides the visibility (private for anything
 *      in a delivery, public only for portfolio and branding uploads) and the object key, and
 *      records all of it in a new version row: inactive, status "pending".
 *   2. The browser uploads to the presigned URL, which only accepts that key, content type and size.
 *   3. confirmUploadCompleted takes just the version id. It reads the stored location from
 *      the row written in step 1, checks the uploaded object (exists, size, content type,
 *      real video/image bytes), and only then makes the version the file's active one.
 *
 * File-location columns are written only by the service role (see
 * 20261111120300_protect_file_locations.sql), so callers run this service with
 * getServerAdminServices() after their own role checks. The storage counter is maintained by
 * database triggers; nothing here writes it.
 */

export interface RequestAssetUploadDTO {
  workspaceId: string;
  /** The delivery the file goes into. Empty, "new" or "standalone" for a portfolio or branding upload. */
  projectId?: string | null;
  deliveryId?: string | null;
  /** Upload a new version of this file. */
  assetId?: string | null;
  title: string;
  filename: string;
  fileSizeBytes: number;
  /** File.type as the browser reports it. Must match the extension; the stored type comes from the allowlist. */
  contentType?: string | null;
  assetType?: AssetType;
  aspectRatio?: string;
  maxDurationSeconds?: number;
  /**
   * For uploads outside a delivery: which flow it comes from. Decides the key prefix, and only
   * "portfolio" makes the new file a standalone portfolio piece. Ignored for deliveries.
   */
  placement?: UploadPlacement;
}

export interface RequestVideoUploadDTO extends RequestAssetUploadDTO {}

export interface RequestUploadResult {
  asset: Asset;
  assetVersion: AssetVersion;
  directUpload: DirectUploadResult;
}

export type RequestVideoUploadResult = RequestUploadResult;

/** Confirming takes only the version: where the file lives was decided when the upload was requested. */
export interface ConfirmUploadDTO {
  assetVersionId: string;
}

/** The uploaded file was refused: its object is deleted and the version marked failed. */
export class UploadRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadRejectedError";
  }
}

const NO_DELIVERY = new Set(["", "new", "standalone"]);

/** Cloudflare Stream may queue a copy for a while before it fetches the source. */
const STREAM_INGEST_URL_TTL_SECONDS = 24 * 60 * 60;

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const THUMBNAIL_ERROR = "The thumbnail must be an image uploaded to this workspace.";

function normalizeAssetType(type: string | null | undefined): AssetType {
  return type === "photo_gallery" || type === "photo" || type === "still" || type === "image"
    ? "photo_gallery"
    : "video";
}

function streamDomain(): string {
  return (env.CLOUDFLARE_STREAM_SUBDOMAIN || "videodelivery.net")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

function streamManifestUrl(uid: string): string {
  return `https://${streamDomain()}/${uid}/manifest/video.m3u8`;
}

function streamThumbnailUrl(uid: string): string {
  return `https://${streamDomain()}/${uid}/thumbnails/thumbnail.jpg?time=1s&height=720`;
}

function r2PublicDomain(): string | null {
  const domain = (
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_DOMAIN ||
    process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN ||
    ""
  ).replace(/\/+$/, "");
  const isReal = Boolean(domain) && !domain.includes("pub-xxxx") && !domain.includes("r2.cloudflarestorage.com");
  return isReal ? domain : null;
}

/** What a version row stores for an R2 key: the CDN URL for public objects when there is one, else the key. */
function storedValueForKey(key: string): string {
  const parsed = parseStoredMedia(key);
  const domain = r2PublicDomain();
  if (parsed?.kind === "r2" && parsed.visibility === "public" && domain) return `${domain}/${parsed.key}`;
  return key;
}

function isMockLocation(value: string | null | undefined): boolean {
  return typeof value === "string" && /^\/api\/mock-upload\/[A-Za-z0-9_-]+$/.test(value.trim());
}

/** App-relative image paths ("/images/hero.jpg"): what the UI shows when a file has no thumbnail. */
function isAppPlaceholder(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/api/");
}

function normalizedContentType(value: string | null | undefined): string {
  return (value ?? "").split(";")[0].trim().toLowerCase();
}

function mapStreamStatus(status: string | undefined): TranscodingStatus {
  if (status === "ready") return "ready";
  if (status === "error") return "failed";
  return "processing";
}

interface VerifiedUpload {
  sizeBytes: number;
  durationSeconds: number | null;
  hlsManifestUrl: string | null;
  thumbnailUrl: string | null;
  status: TranscodingStatus;
}

export class AssetUploadService {
  constructor(
    private readonly storageProvider: IStorageProvider,
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly deliveryRepo: IDeliveryRepository,
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
    private readonly featuresRepo?: IWorkspaceFeaturesRepository,
    private readonly subscriptionService?: SubscriptionService
  ) {}

  /**
   * Validates the file and storage limits, decides where the file will be stored, records
   * that in a pending (inactive) version, and returns a direct upload URL for exactly that object.
   */
  async requestAssetUpload(dto: RequestAssetUploadDTO): Promise<RequestUploadResult> {
    // 1. Workspace, by id: the caller checked the role on this id.
    const workspace = isUuid(dto.workspaceId) ? await this.workspaceRepo.findById(dto.workspaceId) : null;
    if (!workspace) {
      throw new Error("Workspace not found.");
    }
    const workspaceId = workspace.id;

    // 2. Delivery: must exist in this workspace. An unknown id is an error, never a public upload.
    const deliveryRef = (dto.deliveryId ?? dto.projectId ?? "").trim();
    const namesDelivery = !NO_DELIVERY.has(deliveryRef.toLowerCase());
    let deliveryId: string | null = null;
    if (namesDelivery) {
      deliveryId = await this.requireDeliveryInWorkspace(deliveryRef, workspaceId);
    }

    // 3. A new version of an existing file: the file must be in this workspace (and delivery).
    let existingAsset: Asset | null = null;
    if (dto.assetId) {
      existingAsset = isUuid(dto.assetId) ? await this.assetRepo.findById(dto.assetId) : null;
      if (!existingAsset || existingAsset.workspaceId !== workspaceId) {
        throw new Error("File not found in this workspace.");
      }
      if (existingAsset.isArchived) {
        throw new Error("This file is in Trash. Restore it before uploading a new version.");
      }
      const assetDeliveryId = existingAsset.deliveryId ?? null;
      if (namesDelivery && assetDeliveryId !== deliveryId) {
        throw new Error("That file belongs to a different delivery.");
      }
      if (!namesDelivery && assetDeliveryId) {
        deliveryId = await this.requireDeliveryInWorkspace(assetDeliveryId, workspaceId);
      }
    }

    // 4. File type and size, against the allowlist (a new version keeps its file's type).
    const assetType: AssetType = existingAsset ? normalizeAssetType(existingAsset.type) : dto.assetType || "video";
    const fileCheck = checkUploadFile({
      assetType,
      filename: dto.filename,
      declaredType: dto.contentType,
      sizeBytes: dto.fileSizeBytes,
    });
    if (!fileCheck.ok) {
      throw new Error(fileCheck.error);
    }

    // 5. Storage quota against the active plan and workspace features
    await this.assertWithinQuota(workspaceId, workspace.storageUsedBytes || 0, dto.fileSizeBytes);

    // 6. Visibility and placement are the server's decision: private for anything in a
    //    delivery, public only for uploads outside one. Only the portfolio "upload film/still"
    //    flow (stored under portfolio/standalone/) creates a standalone portfolio piece; a new
    //    version keeps its file's flag (and prefix).
    const isPublic = !deliveryId;
    const isPortfolio = existingAsset
      ? isPublic && Boolean(existingAsset.isPortfolio)
      : isStandalonePortfolioUpload(dto.placement, deliveryId);
    const placement: UploadPlacement | undefined = !isPublic
      ? undefined
      : isPortfolio
        ? "portfolio"
        : dto.placement === "portfolio"
          ? undefined
          : dto.placement;
    const storageAssetType: StorageAssetType = assetType === "photo_gallery" ? "image" : "video";

    // 7. The file record
    let asset: Asset;
    if (existingAsset) {
      asset = existingAsset;
    } else {
      const siblings = deliveryId
        ? await this.assetRepo.listByDeliveryId(deliveryId)
        : await this.assetRepo.listUnassignedByWorkspaceId(workspaceId);
      asset = await this.assetRepo.create({
        workspaceId,
        deliveryId,
        title: dto.title,
        type: assetType,
        aspectRatio: dto.aspectRatio,
        sortOrder: siblings.length,
        isPortfolio,
      });
    }

    try {
      // 8. Version number
      const existingVersions = await this.assetVersionRepo.listByAssetId(asset.id);
      const nextVersionNumber =
        existingVersions.length > 0 ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1 : 1;

      const directUpload = await this.storageProvider.createDirectUploadUrl({
        workspaceId,
        deliveryId: deliveryId ?? undefined,
        assetId: asset.id,
        versionNumber: nextVersionNumber,
        assetTitle: dto.title,
        assetType: storageAssetType,
        fileSizeBytes: dto.fileSizeBytes,
        filename: dto.filename,
        contentType: fileCheck.contentType,
        maxDurationSeconds: dto.maxDurationSeconds,
        isPublic,
        placement,
      });

      // 9. Where the file will be, recorded now. Confirm uses only this.
      const location = this.locationForNewUpload(directUpload, {
        workspaceId,
        isPublic,
        assetType,
        isPortfolio,
      });

      const assetVersion = await this.assetVersionRepo.create({
        assetId: asset.id,
        versionNumber: nextVersionNumber,
        rawFileUrl: location.rawFileUrl,
        hlsManifestUrl: location.hlsManifestUrl,
        thumbnailUrl: location.thumbnailUrl,
        // Declared size. Confirm checks the stored object against it and records the real size.
        fileSizeBytes: dto.fileSizeBytes,
        transcodingStatus: "pending",
        // Becomes the active version only when the upload is confirmed.
        isActiveVersion: false,
      });

      return {
        asset,
        assetVersion,
        directUpload,
      };
    } catch (err) {
      // Don't leave behind an empty file created for this upload.
      if (!existingAsset) {
        await this.assetRepo.delete(asset.id).catch((cleanupErr) => {
          log.warn({ err: cleanupErr, assetId: asset.id }, "Couldn't remove the file of a failed upload request");
        });
      }
      throw err;
    }
  }

  /**
   * Alias for requestAssetUpload for backward compatibility.
   */
  async requestVideoUpload(dto: RequestVideoUploadDTO): Promise<RequestVideoUploadResult> {
    return this.requestAssetUpload({ ...dto, assetType: "video" });
  }

  /**
   * Checks the uploaded object behind a pending version and, if it is what was announced,
   * records its real size and streaming copy and makes it the file's active version.
   */
  async confirmUploadCompleted(dto: ConfirmUploadDTO): Promise<AssetVersion> {
    const version = isUuid(dto.assetVersionId) ? await this.assetVersionRepo.findById(dto.assetVersionId) : null;
    if (!version) {
      throw new Error("Asset version not found.");
    }

    const asset = await this.assetRepo.findById(version.assetId);
    if (!asset) {
      throw new Error("Asset not found.");
    }

    if (version.transcodingStatus === "failed") {
      throw new UploadRejectedError("This upload was rejected. Upload the file again.");
    }
    if (version.transcodingStatus !== "pending") {
      // Already confirmed.
      return version;
    }

    const assetType = normalizeAssetType(asset.type);
    const location = parseStoredMedia(version.rawFileUrl);

    let verified: VerifiedUpload;
    if (location?.kind === "r2") {
      verified = await this.verifyR2Upload(asset, version, location.key, location.visibility === "public", assetType);
    } else if (location?.kind === "stream") {
      verified = await this.verifyStreamUpload(asset, version, location.uid);
    } else if (isMockLocation(version.rawFileUrl) && process.env.NODE_ENV !== "production") {
      // Local development without Cloudflare: nothing to inspect.
      verified = {
        sizeBytes: version.fileSizeBytes,
        durationSeconds: version.durationSeconds ?? null,
        hlsManifestUrl: version.hlsManifestUrl ?? null,
        thumbnailUrl: version.thumbnailUrl ?? null,
        status: "ready",
      };
    } else {
      throw await this.rejectUpload(version, null, "This upload can't be verified. Upload the file again.");
    }

    const updatedVersion = await this.assetVersionRepo.update(version.id, {
      hlsManifestUrl: verified.hlsManifestUrl,
      thumbnailUrl: verified.thumbnailUrl,
      fileSizeBytes: verified.sizeBytes,
      durationSeconds: verified.durationSeconds ?? version.durationSeconds ?? null,
      transcodingStatus: verified.status,
    });

    // Exactly one active version per file: this one.
    await this.assetVersionRepo.setActiveVersion(asset.id, version.id);

    return { ...updatedVersion, isActiveVersion: true };
  }

  /**
   * Cloudflare Stream webhook (signature already verified): a video finished or failed
   * processing. The version is found by the Stream UID the server stored in it, never by
   * the metadata in the payload; versions still waiting for their upload to be confirmed are
   * left to the confirm step.
   */
  async handleTranscodeWebhook(event: any): Promise<{ updated: number }> {
    const rawUid = event?.uid ?? event?.data?.uid;
    const uid = typeof rawUid === "string" && isStreamUid(rawUid.trim()) ? rawUid.trim().toLowerCase() : null;
    if (!uid || typeof this.storageProvider.getStreamVideo !== "function") {
      return { updated: 0 };
    }

    const versions = (await this.assetVersionRepo.listByStreamUid(uid)).filter((v) =>
      [v.rawFileUrl, v.hlsManifestUrl].some((value) => streamUidOf(value) === uid)
    );
    if (versions.length === 0) {
      return { updated: 0 };
    }

    const video = await this.storageProvider.getStreamVideo(uid);
    if (!video) {
      return { updated: 0 };
    }
    const owner = video.creator ?? video.workspaceId;

    let updated = 0;
    for (const version of versions) {
      if (version.transcodingStatus === "pending" || version.transcodingStatus === "failed") continue;

      const asset = await this.assetRepo.findById(version.assetId);
      if (!asset) continue;
      if (owner && owner !== asset.workspaceId) {
        log.warn({ versionId: version.id }, "Stream video belongs to another workspace; webhook ignored");
        continue;
      }

      // Keep a thumbnail someone picked; replace only empty, placeholder or Stream ones.
      const currentThumb = version.thumbnailUrl;
      const keepThumbnail =
        Boolean(currentThumb) && !isPlaceholderUrl(currentThumb) && streamUidOf(currentThumb) === null;

      await this.assetVersionRepo.update(version.id, {
        hlsManifestUrl: streamManifestUrl(uid),
        ...(keepThumbnail ? {} : { thumbnailUrl: streamThumbnailUrl(uid) }),
        durationSeconds: video.durationSeconds ?? version.durationSeconds ?? null,
        transcodingStatus: mapStreamStatus(video.status),
      });
      updated++;
    }
    return { updated };
  }

  /**
   * Deletes the stored files of a file that was just deleted from the database: the R2
   * objects of its versions under its own workspace's prefix, and the Stream videos its
   * versions point at when Stream says they were created for that workspace. A thumbnail is
   * deleted only when it is one of those or lives under the file's own key prefix (it may be
   * another file's image).
   */
  async deleteStoredFiles(asset: Asset, versions: AssetVersion[]): Promise<{ deleted: number; skipped: number }> {
    const own = versions.filter((v) => v.assetId === asset.id);
    const keys = new Set<string>();
    const uids = new Set<string>();
    let skipped = 0;

    for (const version of own) {
      for (const value of [version.rawFileUrl, version.hlsManifestUrl]) {
        const parsed = parseStoredMedia(value);
        if (parsed?.kind === "r2") {
          if (isR2KeyInWorkspace(parsed.key, asset.workspaceId)) keys.add(parsed.key);
          else skipped++;
        } else if (parsed?.kind === "stream") {
          uids.add(parsed.uid);
        }
      }
    }

    const assetSegment = asset.id.toLowerCase();
    for (const version of own) {
      const parsed = parseStoredMedia(version.thumbnailUrl);
      if (parsed?.kind !== "r2" || keys.has(parsed.key)) continue;
      const isOwnObject =
        isR2KeyInWorkspace(parsed.key, asset.workspaceId) &&
        parsed.key.toLowerCase().split("/").includes(assetSegment);
      if (isOwnObject) keys.add(parsed.key);
      else skipped++;
    }

    if (skipped > 0) {
      log.warn({ assetId: asset.id, skipped }, "Kept stored files that don't belong to this file");
    }

    let deleted = 0;
    for (const key of keys) {
      try {
        await this.storageProvider.deleteAsset(key);
        deleted++;
      } catch (err) {
        log.warn({ err, assetId: asset.id }, "Storage deletion failed");
      }
    }

    for (const uid of uids) {
      try {
        if (typeof this.storageProvider.getStreamVideo === "function") {
          const video = await this.storageProvider.getStreamVideo(uid);
          if (!video) continue; // already gone
          if ((video.creator ?? video.workspaceId) !== asset.workspaceId) {
            skipped++;
            log.warn({ assetId: asset.id, streamUid: uid }, "Kept a Stream video created for another workspace");
            continue;
          }
        }
        await this.storageProvider.deleteAsset(uid);
        deleted++;
      } catch (err) {
        log.warn({ err, assetId: asset.id, streamUid: uid }, "Stream deletion failed");
      }
    }

    return { deleted, skipped };
  }

  /**
   * Sets the thumbnail of a file's version. Accepted: an image in this workspace's storage
   * (public images only for portfolio files), a Stream thumbnail of one of this file's own
   * videos, or a cropped image as a data URL, which is stored under the file's own prefix.
   * Unchanged values and the UI's placeholder images are ignored. Anything else is refused.
   */
  async setVersionThumbnail(
    asset: Asset,
    version: AssetVersion,
    requested: string,
    siblings: AssetVersion[]
  ): Promise<{ thumbnailUrl: string | null; changed: boolean }> {
    if (version.assetId !== asset.id) {
      throw new Error("Version not found for this file.");
    }

    const unchanged = { thumbnailUrl: version.thumbnailUrl ?? null, changed: false };
    const value = (requested ?? "").trim();
    if (!value || value === (version.thumbnailUrl ?? "").trim()) return unchanged;

    const current = parseStoredMedia(version.thumbnailUrl);
    const parsed = parseStoredMedia(value);
    let stored: string;

    if (parsed?.kind === "r2") {
      if (!isR2KeyInWorkspace(parsed.key, asset.workspaceId)) throw new Error(THUMBNAIL_ERROR);
      if (current?.kind === "r2" && current.key === parsed.key) return unchanged;
      if (!contentTypeForUpload("photo_gallery", parsed.key)) throw new Error("The thumbnail must be an image.");
      if (!asset.deliveryId && parsed.visibility !== "public") {
        throw new Error("A portfolio file's thumbnail must be a public image.");
      }
      stored = storedValueForKey(parsed.key);
    } else if (parsed?.kind === "stream") {
      if (current?.kind === "stream" && current.uid === parsed.uid) return unchanged;
      const ownUids = new Set(
        siblings
          .filter((v) => v.assetId === asset.id)
          .flatMap((v) => [streamUidOf(v.rawFileUrl), streamUidOf(v.hlsManifestUrl)])
          .filter((uid): uid is string => Boolean(uid))
      );
      if (!ownUids.has(parsed.uid)) throw new Error(THUMBNAIL_ERROR);
      stored = streamThumbnailUrl(parsed.uid);
    } else if (/^data:image\//i.test(value)) {
      stored = await this.storeThumbnailImage(asset, value);
    } else if (isAppPlaceholder(value) || isPlaceholderUrl(value)) {
      return unchanged;
    } else {
      throw new Error(THUMBNAIL_ERROR);
    }

    const updated = await this.assetVersionRepo.update(version.id, { thumbnailUrl: stored });

    // A thumbnail stored for this file earlier is no longer used.
    const storedLocation = parseStoredMedia(stored);
    const storedKey = storedLocation?.kind === "r2" ? storedLocation.key : null;
    if (
      current?.kind === "r2" &&
      current.key !== storedKey &&
      current.key.includes("/thumbnails/") &&
      isR2KeyInWorkspace(current.key, asset.workspaceId) &&
      current.key.toLowerCase().split("/").includes(asset.id.toLowerCase())
    ) {
      try {
        await this.storageProvider.deleteAsset(current.key);
      } catch (err) {
        log.warn({ err, assetId: asset.id }, "Old thumbnail deletion failed");
      }
    }

    return { thumbnailUrl: updated.thumbnailUrl ?? stored, changed: true };
  }

  // ---------------------------------------------------------------------------

  private async requireDeliveryInWorkspace(deliveryId: string, workspaceId: string): Promise<string> {
    const delivery = isUuid(deliveryId) ? await this.deliveryRepo.findById(deliveryId) : null;
    if (!delivery || delivery.workspaceId !== workspaceId) {
      throw new Error("Delivery not found in this workspace.");
    }
    return delivery.id;
  }

  private async assertWithinQuota(workspaceId: string, currentUsageBytes: number, addedBytes: number): Promise<void> {
    let storageLimitGB = 2; // Default baseline for Starter plan
    let storageLimitBytes: number;
    if (this.subscriptionService) {
      const entitlements = await this.subscriptionService.getEntitlements(workspaceId);
      storageLimitBytes = entitlements.limits.storageBytesMax;
      storageLimitGB = entitlements.limits.storageGbMax;
    } else {
      const subscription = await this.subscriptionRepo.findByWorkspaceId(workspaceId);
      let plan: any = null;
      if (subscription && (subscription.status === "active" || subscription.status === "trialing")) {
        if (subscription.status === "trialing" && subscription.trialEndsAt && new Date(subscription.trialEndsAt) < new Date()) {
          plan = await this.planRepo.findBySlug("starter");
        } else {
          plan = await this.planRepo.findById(subscription.planId);
        }
      } else {
        plan = await this.planRepo.findBySlug("starter");
      }

      if (plan?.features?.storage_gb) {
        storageLimitGB = Number(plan.features.storage_gb);
      }

      // Check optional custom workspace overrides
      if (this.featuresRepo) {
        const featuresRecord = await this.featuresRepo.findByWorkspaceId(workspaceId);
        if (featuresRecord?.features?.storage_gb) {
          storageLimitGB = Number(featuresRecord.features.storage_gb);
        }
      }

      storageLimitBytes = storageLimitGB * 1024 * 1024 * 1024;
    }

    if (currentUsageBytes + addedBytes > storageLimitBytes) {
      const availableGB = Math.max(0, (storageLimitBytes - currentUsageBytes) / (1024 * 1024 * 1024)).toFixed(1);
      throw new Error(
        `Storage quota exceeded. Your plan allows ${storageLimitGB} GB (Available: ${availableGB} GB). Please upgrade your subscription or delete old assets.`
      );
    }
  }

  /** The stored location of a new upload, from what the storage provider handed out. */
  private locationForNewUpload(
    directUpload: DirectUploadResult,
    context: {
      workspaceId: string;
      isPublic: boolean;
      assetType: AssetType;
      /** Whether the file is a standalone portfolio piece; its R2 key must say so. */
      isPortfolio: boolean;
    }
  ): { rawFileUrl: string; hlsManifestUrl: string | null; thumbnailUrl: string | null } {
    const providerUid = (directUpload.providerUid || "").trim();
    const isPhoto = context.assetType === "photo_gallery";

    if (directUpload.uploadUrl.startsWith("/api/mock-upload/")) {
      const rawFileUrl = `/api/mock-upload/${providerUid}`;
      if (!isMockLocation(rawFileUrl)) throw new Error("Storage returned an unexpected upload location.");
      return {
        rawFileUrl,
        hlsManifestUrl: null,
        thumbnailUrl: isPhoto ? rawFileUrl : "https://files.vidstack.io/sprite-fight/poster.webp",
      };
    }

    if (isStreamUid(providerUid)) {
      // Cloudflare Stream direct upload: the video was created for this upload just now.
      const uid = providerUid.toLowerCase();
      return {
        rawFileUrl: streamManifestUrl(uid),
        hlsManifestUrl: streamManifestUrl(uid),
        thumbnailUrl: streamThumbnailUrl(uid),
      };
    }

    const parsed = parseStoredMedia(providerUid);
    if (
      parsed?.kind !== "r2" ||
      !isR2KeyInWorkspace(parsed.key, context.workspaceId) ||
      (parsed.visibility === "public") !== context.isPublic ||
      parsed.key.includes("/portfolio/standalone/") !== context.isPortfolio
    ) {
      throw new Error("Storage returned an unexpected upload location.");
    }
    const rawFileUrl = storedValueForKey(parsed.key);
    return {
      rawFileUrl,
      hlsManifestUrl: null,
      thumbnailUrl: isPhoto ? rawFileUrl : null,
    };
  }

  private async verifyR2Upload(
    asset: Asset,
    version: AssetVersion,
    key: string,
    isPublicKey: boolean,
    assetType: AssetType
  ): Promise<VerifiedUpload> {
    if (!isR2KeyInWorkspace(key, asset.workspaceId)) {
      // Never touch an object outside the file's own workspace, not even to delete it.
      throw await this.rejectUpload(version, null, "This upload can't be verified. Upload the file again.");
    }

    const expectedType = contentTypeForUpload(assetType, key);
    if (!expectedType) {
      throw await this.rejectUpload(version, key, "This file type isn't allowed.");
    }

    if (typeof this.storageProvider.headObject !== "function" || typeof this.storageProvider.readObjectStart !== "function") {
      throw new Error("Uploads can't be checked right now. Please try again later.");
    }

    const head = await this.storageProvider.headObject(key);
    if (!head) {
      throw new Error("The uploaded file wasn't found. Please upload it again.");
    }
    if (head.sizeBytes !== version.fileSizeBytes || head.sizeBytes <= 0 || head.sizeBytes > MAX_UPLOAD_BYTES) {
      throw await this.rejectUpload(version, key, "The uploaded file isn't the size that was announced. Please upload it again.");
    }
    if (normalizedContentType(head.contentType) !== expectedType) {
      throw await this.rejectUpload(version, key, "The uploaded file has the wrong content type. Please upload it again.");
    }

    const firstBytes = await this.storageProvider.readObjectStart(key, SNIFF_BYTES);
    if (!bytesMatchAssetType(firstBytes, assetType)) {
      throw await this.rejectUpload(
        version,
        key,
        assetType === "photo_gallery" ? "This file isn't a valid image." : "This file isn't a valid video."
      );
    }

    const verified: VerifiedUpload = {
      sizeBytes: head.sizeBytes,
      durationSeconds: null,
      hlsManifestUrl: null,
      thumbnailUrl: assetType === "photo_gallery" ? version.rawFileUrl : version.thumbnailUrl ?? null,
      status: "ready",
    };

    // A video master in R2 gets a streaming copy: Cloudflare Stream pulls it via copyFromUrl.
    if (
      assetType === "video" &&
      typeof this.storageProvider.copyFromUrl === "function" &&
      typeof this.storageProvider.getSecurePlaybackUrl === "function"
    ) {
      try {
        const sourceUrl = await this.storageProvider.getSecurePlaybackUrl(key, isPublicKey, STREAM_INGEST_URL_TTL_SECONDS);
        const copy = await this.storageProvider.copyFromUrl(sourceUrl, {
          name: asset.title || "Video Cut",
          creator: asset.workspaceId,
          meta: {
            workspaceId: asset.workspaceId,
            assetId: asset.id,
            assetVersionId: version.id,
            r2Key: key,
          },
        });
        const uid = typeof copy?.uid === "string" && isStreamUid(copy.uid) ? copy.uid.toLowerCase() : null;
        if (uid) {
          verified.hlsManifestUrl = streamManifestUrl(uid);
          verified.thumbnailUrl = streamThumbnailUrl(uid);
          verified.status = copy.status === "ready" ? "ready" : "processing";
        }
      } catch (err) {
        log.warn({ err, assetVersionId: version.id }, "Cloudflare Stream copy ingestion failed");
      }
    }

    return verified;
  }

  private async verifyStreamUpload(asset: Asset, version: AssetVersion, uid: string): Promise<VerifiedUpload> {
    if (typeof this.storageProvider.getStreamVideo !== "function") {
      throw new Error("Uploads can't be checked right now. Please try again later.");
    }

    const video = await this.storageProvider.getStreamVideo(uid);
    if (!video || video.status === "pending") {
      throw new Error("The uploaded video hasn't arrived yet. Please try again in a moment.");
    }

    const owner = video.creator ?? video.workspaceId;
    if (owner && owner !== asset.workspaceId) {
      // Not created for this workspace: refuse, and leave the video alone.
      throw await this.rejectUpload(version, null, "This upload can't be verified. Upload the file again.");
    }
    if (video.sizeBytes !== null && video.sizeBytes > MAX_UPLOAD_BYTES) {
      throw await this.rejectUpload(version, uid, "Files can be at most 5 GB.");
    }
    if (video.status === "error") {
      throw await this.rejectUpload(version, uid, "This file couldn't be processed as a video.");
    }

    return {
      sizeBytes: video.sizeBytes ?? version.fileSizeBytes,
      durationSeconds: video.durationSeconds,
      hlsManifestUrl: streamManifestUrl(uid),
      thumbnailUrl: streamThumbnailUrl(uid),
      status: video.status === "ready" ? "ready" : "processing",
    };
  }

  /**
   * Refuses an uploaded file: deletes its object (only a location this version owns), marks
   * the version failed (it never became active) and returns the error to throw.
   */
  private async rejectUpload(version: AssetVersion, location: string | null, message: string): Promise<UploadRejectedError> {
    if (location) {
      try {
        await this.storageProvider.deleteAsset(location);
      } catch (err) {
        log.warn({ err, assetVersionId: version.id }, "Couldn't delete a rejected upload");
      }
    }
    try {
      await this.assetVersionRepo.update(version.id, { transcodingStatus: "failed" });
    } catch (err) {
      log.warn({ err, assetVersionId: version.id }, "Couldn't mark a rejected upload as failed");
    }
    log.warn({ assetVersionId: version.id, reason: message }, "Upload rejected");
    return new UploadRejectedError(message);
  }

  /** Stores a cropped thumbnail (data URL) under the file's own prefix and returns the stored value. */
  private async storeThumbnailImage(asset: Asset, dataUrl: string): Promise<string> {
    const match = /^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
    if (!match) throw new Error("Thumbnails must be JPG, PNG or WebP images.");

    const bytes = Buffer.from(match[1].replace(/\s+/g, ""), "base64");
    if (bytes.length === 0) throw new Error("The thumbnail image is empty.");
    if (bytes.length > MAX_THUMBNAIL_BYTES) throw new Error("Thumbnails can be at most 5 MB.");

    const kind = sniffMediaKind(bytes);
    const extension = kind === "jpeg" ? "jpg" : kind === "png" ? "png" : kind === "webp" ? "webp" : null;
    if (!extension) throw new Error("Thumbnails must be JPG, PNG or WebP images.");
    if (!isUuid(asset.workspaceId) || !isUuid(asset.id) || (asset.deliveryId && !isUuid(asset.deliveryId))) {
      throw new Error(THUMBNAIL_ERROR);
    }
    if (typeof this.storageProvider.putObjectStream !== "function") {
      throw new Error("The thumbnail couldn't be saved: file storage isn't configured.");
    }

    const workspaceId = asset.workspaceId.toLowerCase();
    const assetId = asset.id.toLowerCase();
    const name = `${Date.now()}-thumbnail.${extension}`;
    const key = asset.deliveryId
      ? `private/workspaces/${workspaceId}/deliveries/${asset.deliveryId.toLowerCase()}/assets/${assetId}/thumbnails/${name}`
      : `public/workspaces/${workspaceId}/portfolio/thumbnails/${assetId}/${name}`;

    try {
      await this.storageProvider.putObjectStream(key, bytes, contentTypeForUpload("photo_gallery", name) ?? "image/jpeg", bytes.length);
    } catch (err) {
      log.warn({ err, assetId: asset.id }, "Thumbnail upload failed");
      throw new Error("The thumbnail couldn't be saved. Please try again.");
    }
    return storedValueForKey(key);
  }
}

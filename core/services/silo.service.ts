import { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import { IAssetRepository, IAssetVersionRepository } from "@/core/repositories/i-asset-repository";
import { IWorkspaceRepository } from "@/core/repositories/workspace.repository";
import { IStorageProvider } from "@/core/providers/storage/storage.provider";
import {
  ISiloStorageProvider,
  GlacierTier,
  SiloUnavailableError,
} from "@/core/providers/storage/silo-glacier.provider";
import type { Asset, AssetVersion } from "@/core/entities/asset";
import type { Delivery } from "@/core/entities/delivery";
import { NotificationService } from "./notification.service";
import { SubscriptionService } from "./subscription.service";
import { env } from "@/lib/env";
import { isR2KeyInWorkspace, isUuid, parseStoredMedia, streamUidOf } from "@/lib/storage/keys";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ service: "SiloService" });

/** raw_file_url of a version whose master is in The Silo: "silo://<archive key>". */
const SILO_SCHEME = "silo://";

export interface ArchiveDeliveryResult {
  success: boolean;
  deliveryId: string;
  bytesArchived: number;
  /** Files moved to Trash because every one of their versions is now in The Silo. */
  assetsArchived: number;
  versionsArchived: number;
  /** Versions left untouched in active storage: not an R2 object of this workspace (e.g. Stream-only). */
  versionsSkipped: number;
  /** Cloudflare Stream copies that could not be deleted; each is logged with its UID. */
  streamDeletesFailed: number;
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

export interface SiloArchiveKeyParts {
  key: string;
  workspaceId: string;
  deliveryId: string;
}

/**
 * Parses a Silo archive key, "silo/workspaces/<workspaceId>/deliveries/<deliveryId>/...",
 * with or without the "silo://" prefix used in raw_file_url. Returns null for anything
 * else, including keys with "." or ".." segments, backslashes or doubled slashes.
 */
export function parseSiloArchiveKey(value: string | null | undefined): SiloArchiveKeyParts | null {
  if (typeof value !== "string") return null;
  let key = value.trim();
  if (key.startsWith(SILO_SCHEME)) key = key.slice(SILO_SCHEME.length);
  key = key.replace(/^\/+/, "");
  if (!key || key.length > 1024 || key.includes("\\") || key.includes("//")) return null;
  if (key.split("/").some((segment) => segment === "." || segment === "..")) return null;

  const match = key.match(/^silo\/workspaces\/([^/]+)\/deliveries\/([^/]+)\/.+$/);
  if (!match || !isUuid(match[1]) || !isUuid(match[2])) return null;
  return { key, workspaceId: match[1].toLowerCase(), deliveryId: match[2].toLowerCase() };
}

/**
 * True when an archive key sits under the workspace's Silo prefix. silo_archive_key is an
 * ordinary column, so this prefix is the only proof that a Glacier object belongs to the
 * workspace asking to restore it.
 */
export function isSiloKeyInWorkspace(
  value: string | null | undefined,
  workspaceId: string | null | undefined
): boolean {
  if (!workspaceId) return false;
  const parsed = parseSiloArchiveKey(value);
  return parsed !== null && parsed.workspaceId === workspaceId.toLowerCase();
}

/** Base URL for links in Silo emails: the configured app URL, never a request's Host header. */
export function siloEmailOrigin(): string {
  try {
    return new URL(env.NEXT_PUBLIC_APP_URL).origin;
  } catch {
    return "https://cut.app";
  }
}

/** Last path segment of a key, made safe to reuse as the file name inside a new object key. */
function safeFilename(key: string, fallback: string): string {
  const last = key.split(/[?#]/)[0].split("/").pop() || "";
  let name = last;
  try {
    name = decodeURIComponent(last);
  } catch {
    // keep the raw segment
  }
  const clean = (value: string) =>
    value
      .replace(/[\u0000-\u001f\u007f/\\?%*:|"<>#\s]+/g, "_")
      .replace(/^\.+/, "")
      .slice(0, 200);
  return clean(name) || clean(fallback) || "master";
}

function destroyStream(stream: unknown): void {
  const maybe = stream as { destroy?: () => void } | null;
  if (maybe && typeof maybe.destroy === "function") {
    try {
      maybe.destroy();
    } catch {
      // ignore
    }
  }
}

type VersionArchiveOutcome =
  | { kind: "archived"; bytes: number; storageClass: string; streamDeletesFailed: number }
  | { kind: "already" }
  | { kind: "empty" }
  | { kind: "skipped" };

interface ArchivedVersionEntry {
  asset: Asset;
  version: AssetVersion;
  archiveKey: string;
}

/**
 * The Silo: moves a delivery's masters from Cloudflare R2 to AWS S3 Glacier Deep Archive
 * and back.
 *
 * Every public method refuses to run unless The Silo is switched on (env.isSiloEnabled)
 * and the archive provider is a real one. Callers still check access and plan first.
 *
 * Archiving (per file version):
 *   - only R2 objects stored under the delivery's own workspace are moved; anything else
 *     (a Stream-only video, an external URL, another workspace's key) is left in place;
 *   - the R2 original is deleted only after the Glacier copy has been read back with the
 *     expected size, and after the version row points at Glacier;
 *   - the Cloudflare Stream copy is deleted, so the video can no longer be played or
 *     downloaded by its UID.
 * workspaces.storage_used_bytes is maintained by database triggers (it follows the Trash
 * flag), so this service never adjusts it.
 */
export class SiloService {
  constructor(
    private readonly siloProvider: ISiloStorageProvider,
    private readonly activeStorage: IStorageProvider,
    private readonly deliveryRepo: IDeliveryRepository,
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository,
    // Unused since the database keeps storage_used_bytes; kept for the container's call.
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly subscriptionService?: SubscriptionService,
    private readonly notificationService?: NotificationService,
    private readonly memberService?: any
  ) {}

  /** True when The Silo is switched on and backed by a real archive bucket. */
  isAvailable(): boolean {
    return env.isSiloEnabled && this.siloProvider.isConfigured();
  }

  private assertAvailable(): void {
    if (!this.isAvailable()) {
      throw new SiloUnavailableError();
    }
  }

  /**
   * Moves the delivery's master files from active storage (Cloudflare R2) into AWS S3
   * Glacier Deep Archive. Files whose versions are all archived go to Trash, which takes
   * them out of the workspace's storage quota.
   */
  async archiveDelivery(
    deliveryId: string,
    options?: { userId?: string }
  ): Promise<ArchiveDeliveryResult> {
    this.assertAvailable();

    const delivery = await this.deliveryRepo.findById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery with id "${deliveryId}" not found.`);
    }
    if (delivery.siloStatus === "archived" || delivery.siloStatus === "restoring") {
      throw new Error("This delivery is already in The Silo.");
    }

    // Check plan eligibility if subscription service is attached
    if (this.subscriptionService) {
      const isAllowed = await this.subscriptionService.isSiloArchiveAllowed(delivery.workspaceId);
      if (!isAllowed) {
        throw new Error(
          "The Silo Cold Storage Archive requires a Pro, Studio, or Enterprise subscription."
        );
      }
    }

    if (typeof this.activeStorage.getObjectStream !== "function") {
      throw new Error("Active storage provider does not support streaming objects for archive.");
    }

    const assets = await this.assetRepo.listByDeliveryId(deliveryId);
    let bytesArchived = 0;
    let versionsArchived = 0;
    let versionsAlreadyArchived = 0;
    let versionsSkipped = 0;
    let assetsArchived = 0;
    let streamDeletesFailed = 0;
    let storageClass: string = env.AWS_SILO_STORAGE_CLASS || "DEEP_ARCHIVE";

    for (const asset of assets) {
      const versions = await this.assetVersionRepo.listByAssetId(asset.id);
      let inSilo = 0;
      let leftActive = 0;

      for (const version of versions) {
        const outcome =
          asset.workspaceId === delivery.workspaceId
            ? await this.archiveVersion(delivery, asset, version)
            : ({ kind: "skipped" } as const);

        switch (outcome.kind) {
          case "archived":
            bytesArchived += outcome.bytes;
            versionsArchived++;
            streamDeletesFailed += outcome.streamDeletesFailed;
            storageClass = outcome.storageClass;
            inSilo++;
            break;
          case "already":
            versionsAlreadyArchived++;
            inSilo++;
            break;
          case "skipped":
            versionsSkipped++;
            leftActive++;
            break;
          case "empty":
            break;
        }
      }

      // Into Trash (as before) only once every file of the asset is in The Silo, so
      // nothing that is still in active storage disappears from the delivery.
      if (inSilo > 0 && leftActive === 0) {
        await this.assetRepo.archive(asset.id);
        assetsArchived++;
      }
    }

    if (versionsArchived === 0 && versionsAlreadyArchived === 0 && versionsSkipped > 0) {
      throw new Error(
        "None of this delivery's files are stored in a way The Silo can archive; nothing was changed."
      );
    }

    await this.deliveryRepo.update(deliveryId, {
      status: "archived",
      siloStatus: "archived",
      siloArchivedAt: new Date().toISOString(),
      siloMetadata: {
        totalBytesArchived: bytesArchived,
        assetsArchived,
        versionsArchived,
        versionsSkipped,
        streamDeletesFailed,
        archivedByUserId: options?.userId || null,
        storageClass,
      },
    });

    return {
      success: true,
      deliveryId,
      bytesArchived,
      assetsArchived,
      versionsArchived,
      versionsSkipped,
      streamDeletesFailed,
    };
  }

  private async archiveVersion(
    delivery: Delivery,
    asset: Asset,
    version: AssetVersion
  ): Promise<VersionArchiveOutcome> {
    const rawKey = version.rawFileUrl?.trim();
    if (version.siloArchiveKey || rawKey?.startsWith(SILO_SCHEME)) {
      return { kind: "already" };
    }
    if (!rawKey) {
      return { kind: "empty" };
    }

    // raw_file_url is not proof of ownership; only this workspace's R2 objects are copied
    // and deleted.
    const media = parseStoredMedia(rawKey);
    if (!isR2KeyInWorkspace(rawKey, delivery.workspaceId) || media?.kind !== "r2") {
      log.warn(
        { deliveryId: delivery.id, assetId: asset.id, versionId: version.id },
        "Silo archive skipped a file that is not an R2 object of this workspace"
      );
      return { kind: "skipped" };
    }
    const sourceKey = media.key;

    const source = await this.activeStorage.getObjectStream!(sourceKey);
    const expectedBytes =
      typeof source.contentLength === "number"
        ? source.contentLength
        : version.fileSizeBytes > 0
          ? version.fileSizeBytes
          : null;
    if (expectedBytes === null) {
      destroyStream(source.stream);
      throw new Error(
        `The size of "${asset.title}" (v${version.versionNumber}) is unknown, so its archive could not be verified. Nothing was deleted.`
      );
    }

    const filename = safeFilename(sourceKey, `${asset.title || "asset"}.mp4`);
    const targetKey = `silo/workspaces/${delivery.workspaceId}/deliveries/${delivery.id}/assets/${asset.id}/v${version.versionNumber}/${Date.now()}-${filename}`;

    const archived = await this.siloProvider.archiveStream({
      stream: source.stream,
      targetKey,
      contentType: source.contentType,
      contentLength: expectedBytes,
      metadata: {
        workspaceId: delivery.workspaceId,
        deliveryId: delivery.id,
        assetId: asset.id,
        versionId: version.id,
        // S3 metadata travels as HTTP headers, which must be ASCII.
        originalKey: encodeURIComponent(sourceKey),
      },
    });

    // The original is deleted below, so read the copy back from the archive bucket first.
    const stored = await this.siloProvider.getArchiveObjectInfo(archived.archiveKey);
    const confirmed =
      archived.archiveKey === targetKey &&
      archived.sizeBytes === expectedBytes &&
      stored !== null &&
      stored.sizeBytes === expectedBytes;
    if (!confirmed) {
      log.error(
        {
          deliveryId: delivery.id,
          versionId: version.id,
          archiveKey: archived.archiveKey,
          expectedBytes,
          uploadedBytes: archived.sizeBytes,
          storedBytes: stored?.sizeBytes ?? null,
        },
        "Silo upload could not be confirmed; the R2 original was kept"
      );
      await this.siloProvider.deleteArchiveObject(archived.archiveKey).catch((err) => {
        log.warn({ err, archiveKey: archived.archiveKey }, "Could not remove an unconfirmed Silo upload");
      });
      throw new Error(
        `The Glacier copy of "${asset.title}" (v${version.versionNumber}) could not be confirmed, so the archive stopped. The original file was kept.`
      );
    }

    // Record where the master lives now, before anything is deleted.
    await this.assetVersionRepo.update(version.id, {
      siloArchiveKey: archived.archiveKey,
      siloStorageClass: archived.storageClass,
      rawFileUrl: `${SILO_SCHEME}${archived.archiveKey}`,
    });

    try {
      await this.activeStorage.deleteAsset(sourceKey);
    } catch (err) {
      // The master is safe in Glacier; the R2 object is only an orphan now.
      log.warn({ err, versionId: version.id, sourceKey }, "Archived to The Silo, but the R2 original could not be deleted");
    }

    const streamFailures = await this.deleteStreamCopy(version, delivery.workspaceId);

    return {
      kind: "archived",
      bytes: expectedBytes,
      storageClass: archived.storageClass,
      streamDeletesFailed: streamFailures,
    };
  }

  /**
   * Deletes the Cloudflare Stream copy of an archived video, so it can no longer be played
   * or downloaded by its UID, and clears the columns that pointed at it. Returns how many
   * Stream copies are left behind; each is logged with its UID for cleanup.
   *
   * The UID comes from columns members can edit, so when the provider can look a video up
   * (getStreamVideo), only a video created for this workspace is deleted.
   */
  private async deleteStreamCopy(version: AssetVersion, workspaceId: string): Promise<number> {
    const hlsUid = streamUidOf(version.hlsManifestUrl);
    const thumbnailUid = streamUidOf(version.thumbnailUrl);
    const uids = Array.from(
      new Set([hlsUid, thumbnailUid].filter((uid): uid is string => Boolean(uid)))
    );
    if (uids.length === 0) return 0;

    const deleted = new Set<string>();
    for (const uid of uids) {
      try {
        if (typeof this.activeStorage.getStreamVideo === "function") {
          const video = await this.activeStorage.getStreamVideo(uid);
          if (!video) {
            deleted.add(uid); // already gone; only the dangling columns remain
            continue;
          }
          const owner = video.creator ?? video.workspaceId;
          if (!owner || owner.toLowerCase() !== workspaceId.toLowerCase()) {
            log.error(
              { versionId: version.id, streamUid: uid },
              "Not deleting a Cloudflare Stream video that was not created for this workspace"
            );
            continue;
          }
        }
        await this.activeStorage.deleteAsset(uid);
        deleted.add(uid);
      } catch (err) {
        log.error(
          { err, versionId: version.id, streamUid: uid },
          "Archived to The Silo, but its Cloudflare Stream copy could not be deleted"
        );
      }
    }

    const cleared: Partial<AssetVersion> = {};
    if (hlsUid && deleted.has(hlsUid)) cleared.hlsManifestUrl = null;
    if (thumbnailUid && deleted.has(thumbnailUid)) cleared.thumbnailUrl = null;
    if (Object.keys(cleared).length > 0) {
      await this.assetVersionRepo.update(version.id, cleared).catch((err) => {
        log.warn({ err, versionId: version.id }, "Could not clear the deleted Stream copy from the version");
      });
    }

    return uids.length - deleted.size;
  }

  /**
   * This delivery's file versions whose master is in The Silo. Archiving moves files to
   * Trash, so trashed files are included. Keys outside the workspace's Silo prefix are
   * ignored.
   */
  private async listArchivedVersions(delivery: Delivery): Promise<ArchivedVersionEntry[]> {
    const assets = (await this.assetRepo.listByWorkspaceId(delivery.workspaceId, true)).filter(
      (asset) => asset.deliveryId === delivery.id
    );

    const entries: ArchivedVersionEntry[] = [];
    for (const asset of assets) {
      const versions = await this.assetVersionRepo.listByAssetId(asset.id);
      for (const version of versions) {
        if (!version.siloArchiveKey) continue;
        const parsed = parseSiloArchiveKey(version.siloArchiveKey);
        if (!parsed || !isSiloKeyInWorkspace(parsed.key, delivery.workspaceId)) {
          log.warn(
            { deliveryId: delivery.id, versionId: version.id },
            "Ignoring a Silo archive key outside this workspace"
          );
          continue;
        }
        entries.push({ asset, version, archiveKey: parsed.key });
      }
    }
    return entries;
  }

  /**
   * Starts thawing an archived delivery in AWS S3 Glacier Deep Archive.
   * Standard tier takes ~12 hours; Bulk tier takes up to 48 hours.
   */
  async requestRestoreDelivery(
    deliveryId: string,
    tier: GlacierTier = "Bulk",
    days: number = 7
  ): Promise<RestoreDeliveryResult> {
    this.assertAvailable();

    if (tier !== "Bulk" && tier !== "Standard") {
      throw new Error("Deep Archive restores use the Bulk or Standard tier.");
    }

    const delivery = await this.deliveryRepo.findById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery with id "${deliveryId}" not found.`);
    }
    if (delivery.siloStatus !== "archived" && delivery.siloStatus !== "restoring") {
      throw new Error("This delivery is not archived in The Silo.");
    }

    const entries = await this.listArchivedVersions(delivery);
    if (entries.length === 0) {
      throw new Error("No archived files were found for this delivery.");
    }

    for (const { archiveKey } of entries) {
      await this.siloProvider.requestRestore({ key: archiveKey, tier, days });
    }

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
   * Checks whether every archived file of a restoring delivery has thawed. Once they all
   * have, copies them back into active storage (Cloudflare R2), takes the files out of
   * Trash, marks the delivery restored and emails the workspace owners and admins.
   * Writes files and rows: callers check access first and run this with the service role.
   */
  async checkAndFinalizeRestore(
    deliveryId: string,
    options?: { notifyEmails?: string[] }
  ): Promise<CheckRestoreResult> {
    this.assertAvailable();

    const delivery = await this.deliveryRepo.findById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery with id "${deliveryId}" not found.`);
    }

    const empty = { thawedVersionsCount: 0, totalVersionsCount: 0 };
    if (delivery.siloStatus === "restored") {
      return { deliveryId, isReady: true, status: "ready", ...empty };
    }
    if (delivery.siloStatus !== "restoring") {
      return {
        deliveryId,
        isReady: false,
        status: delivery.siloStatus === "archived" ? "archived" : "not_found",
        ...empty,
      };
    }

    const entries = await this.listArchivedVersions(delivery);
    if (entries.length === 0) {
      return { deliveryId, isReady: false, status: "not_found", ...empty };
    }

    let thawedVersionsCount = 0;
    let missingCount = 0;
    let earliestExpiry: Date | undefined;
    for (const { archiveKey } of entries) {
      const status = await this.siloProvider.checkRestoreStatus(archiveKey);
      if (status.status === "not_found") missingCount++;
      if (status.isRestored) {
        thawedVersionsCount++;
        if (status.expiryDate && (!earliestExpiry || status.expiryDate < earliestExpiry)) {
          earliestExpiry = status.expiryDate;
        }
      }
    }

    const counts = { thawedVersionsCount, totalVersionsCount: entries.length };
    if (missingCount > 0) {
      log.error({ deliveryId, missingCount }, "Archived Silo objects are missing from the archive bucket");
    }
    if (thawedVersionsCount < entries.length) {
      return {
        deliveryId,
        isReady: false,
        status: missingCount > 0 ? "not_found" : "restoring",
        expiryDate: earliestExpiry,
        ...counts,
      };
    }

    if (typeof this.activeStorage.putObjectStream !== "function") {
      throw new Error("Active storage provider cannot accept restored files.");
    }

    for (const { version, archiveKey } of entries) {
      // Already copied back by an earlier run that stopped halfway.
      if (!version.rawFileUrl?.startsWith(SILO_SCHEME)) continue;

      const filename = safeFilename(archiveKey, "master.mp4");
      const activeKey = `private/workspaces/${delivery.workspaceId}/deliveries/${delivery.id}/assets/${version.assetId}/v${version.versionNumber}/${filename}`;

      const thawed = await this.siloProvider.getObjectStream(archiveKey);
      await this.activeStorage.putObjectStream(
        activeKey,
        thawed.stream,
        thawed.contentType,
        thawed.contentLength ?? version.fileSizeBytes
      );

      await this.assetVersionRepo.update(version.id, { rawFileUrl: activeKey });
    }

    // Archiving moved these files to Trash; bring them back.
    for (const assetId of new Set(entries.map((entry) => entry.asset.id))) {
      await this.assetRepo.restore(assetId);
    }

    await this.deliveryRepo.update(deliveryId, {
      status: "approved",
      siloStatus: "restored",
      siloRestoredAt: new Date().toISOString(),
    });

    await this.notifyRestoreCompleted(delivery, options?.notifyEmails);

    return { deliveryId, isReady: true, status: "ready", expiryDate: earliestExpiry, ...counts };
  }

  private async notifyRestoreCompleted(delivery: Delivery, notifyEmails?: string[]): Promise<void> {
    if (!this.notificationService) return;

    let emails = notifyEmails || [];
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
    if (emails.length === 0) return;

    await this.notificationService
      .notifySiloRestoreCompleted({
        deliveryId: delivery.id,
        recipientEmails: emails,
        origin: siloEmailOrigin(),
        thawedDays: 7,
      })
      .catch((err) => {
        log.error({ err, deliveryId: delivery.id }, "Failed to dispatch restore notification");
      });
  }
}

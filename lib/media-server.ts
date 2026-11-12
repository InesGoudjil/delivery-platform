import { IStorageProvider } from "@/core/providers/storage";
import { createScopedLogger } from "@/lib/logger";
import { isR2KeyInWorkspace, parseStoredMedia } from "@/lib/storage/keys";

const log = createScopedLogger({ service: "MediaServer" });

/**
 * Server-side signing of stored media for the browser.
 *
 * Private R2 objects get short-lived presigned GET URLs; Cloudflare Stream URLs and
 * public objects pass through. Every caller says which workspace it's signing for, and
 * an R2 key outside that workspace's prefix is dropped (signed as nothing), because a
 * stored value could point at another studio's files.
 */

export interface PresignScope {
  /** Only R2 keys under this workspace's prefix are signed. */
  workspaceId: string;
  expiresInSeconds?: number;
}

const DEFAULT_EXPIRY_SECONDS = 7200;

export async function presignPrivateMediaUrl(
  url: string | null | undefined,
  storageProvider: IStorageProvider,
  scope: PresignScope,
  downloadFilename?: string
): Promise<string> {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  const expiresInSeconds = scope.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS;
  const parsed = parseStoredMedia(trimmed);

  if (parsed?.kind === "stream") {
    if (!downloadFilename) return trimmed;
    try {
      if (typeof storageProvider.getSecureDownloadUrl === "function") {
        return await storageProvider.getSecureDownloadUrl(parsed.uid, downloadFilename, false, expiresInSeconds);
      }
    } catch (err) {
      log.error({ err, streamUid: parsed.uid }, "Failed to resolve Stream download URL");
    }
    return "";
  }

  if (parsed?.kind === "r2") {
    if (!isR2KeyInWorkspace(parsed.key, scope.workspaceId)) {
      log.warn({ workspaceId: scope.workspaceId }, "Refused to sign a storage key outside the workspace");
      return "";
    }
    const isPrivateKey = parsed.visibility === "private";
    try {
      // With a filename, sign as an attachment (even public keys, so the browser downloads).
      if (downloadFilename && typeof storageProvider.getSecureDownloadUrl === "function") {
        return await storageProvider.getSecureDownloadUrl(parsed.key, downloadFilename, !isPrivateKey, expiresInSeconds);
      }
      if (isPrivateKey && typeof storageProvider.getSecurePlaybackUrl === "function") {
        return await storageProvider.getSecurePlaybackUrl(parsed.key, false, expiresInSeconds);
      }
    } catch (err) {
      log.error({ err, isPrivateKey }, "Failed to presign R2 URL");
      return "";
    }
    // A public key without a filename: the stored value (public CDN URL or key) is fine.
    return trimmed;
  }

  // Local mock uploads and static app images.
  if (trimmed.startsWith("/api/mock-upload/") || trimmed.startsWith("/images/")) {
    if (downloadFilename && trimmed.startsWith("/api/mock-upload/")) {
      return `${trimmed.split("?")[0]}?download=true&filename=${encodeURIComponent(downloadFilename)}`;
    }
    return trimmed;
  }

  return "";
}

export interface PresignAssetsOptions extends PresignScope {
  /**
   * Whether the viewer may download. Off: no attachment links and no MP4 proxy, and a
   * video that has a streaming copy doesn't expose its master file at all.
   */
  allowDownload: boolean;
  /** The client room's share token, for /api/media download links a guest can use. */
  roomShareToken?: string;
}

function isVideoType(type: string | undefined): boolean {
  return type !== "photo" && type !== "photo_gallery" && type !== "still" && type !== "image";
}

/**
 * Signs every version of a list of delivery files for display: raw file (or nothing, see
 * `allowDownload`), thumbnail, and attachment download links when downloads are allowed.
 */
export async function presignDeliveryAssets<
  V extends {
    rawFileUrl?: string | null;
    thumbnailUrl?: string | null;
    downloadUrl?: string | null;
    proxyDownloadUrl?: string | null;
    hlsManifestUrl?: string | null;
    isActiveVersion?: boolean;
    versionNumber?: number;
  },
  A extends {
    title?: string;
    type?: string;
    versions: V[];
    activeVersion?: V | null;
  }
>(assets: A[], storageProvider: IStorageProvider, options: PresignAssetsOptions): Promise<A[]> {
  if (!assets || assets.length === 0) return [];

  return Promise.all(
    assets.map(async (asset) => {
      const isVideo = isVideoType(asset.type);
      const presignedVersions = await Promise.all(
        asset.versions.map(async (v) => {
          let ext = "mp4";
          if (v.rawFileUrl) {
            const cleanUrl = v.rawFileUrl.split("?")[0];
            const matchExt = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
            if (matchExt) {
              const rawExt = matchExt[1].toLowerCase();
              ext = rawExt === "m3u8" || rawExt === "mpd" ? "mp4" : rawExt;
            } else if (!isVideo) {
              ext = "jpg";
            }
          }
          const safeTitle = (asset.title || "Cut").replace(/[/\\?%*:|"<>]/g, "_").trim();
          const versionSuffix = v.versionNumber ? `_V${v.versionNumber}` : "";
          const downloadFilename = `${safeTitle}${versionSuffix}.${ext}`;

          const streamUid =
            parseStoredMedia(v.hlsManifestUrl)?.kind === "stream"
              ? (parseStoredMedia(v.hlsManifestUrl) as { uid: string }).uid
              : parseStoredMedia(v.rawFileUrl)?.kind === "stream"
                ? (parseStoredMedia(v.rawFileUrl) as { uid: string }).uid
                : null;

          // Without downloads, a video with a streaming copy plays from the stream only.
          const exposeMaster = options.allowDownload || !isVideo || !v.hlsManifestUrl;

          const [presignedRaw, presignedThumb, presignedDownload] = await Promise.all([
            exposeMaster ? presignPrivateMediaUrl(v.rawFileUrl, storageProvider, options) : Promise.resolve(""),
            presignPrivateMediaUrl(v.thumbnailUrl, storageProvider, options),
            options.allowDownload
              ? presignPrivateMediaUrl(v.rawFileUrl, storageProvider, options, downloadFilename)
              : Promise.resolve(""),
          ]);

          const proxyDownloadUrl =
            options.allowDownload && streamUid
              ? `/api/media/${streamUid}?download=true&filename=${encodeURIComponent(
                  `${safeTitle}${versionSuffix}_WebProxy.mp4`
                )}${options.roomShareToken ? `&room=${encodeURIComponent(options.roomShareToken)}` : ""}`
              : null;

          return {
            ...v,
            rawFileUrl: presignedRaw,
            thumbnailUrl: presignedThumb,
            downloadUrl: options.allowDownload ? presignedDownload || presignedRaw : null,
            proxyDownloadUrl,
          };
        })
      );

      const activeVersion = presignedVersions.find((v) => v.isActiveVersion) || presignedVersions[0] || null;

      return {
        ...asset,
        versions: presignedVersions,
        activeVersion,
      };
    })
  );
}

import { IStorageProvider } from "@/core/providers/storage";

/**
 * Server-side helper that generates a direct, short-lived presigned GET URL (default 2 hours)
 * for private Cloudflare R2 assets.
 * 
 * Public assets, Cloudflare Stream URLs, or already-signed URLs are left untouched.
 */
export async function presignPrivateMediaUrl(
  url: string | null | undefined,
  storageProvider: IStorageProvider,
  expiresInSeconds: number = 7200,
  downloadFilename?: string
): Promise<string> {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // 1. Direct canonical private key (e.g. private/workspaces/...)
  let key: string | null = null;
  if (trimmed.startsWith("private/")) {
    key = trimmed;
  } else if (trimmed.includes("/private/workspaces/")) {
    const match = trimmed.match(/(private\/workspaces\/[^\s?#]+)/);
    if (match) key = match[1];
  }

  if (key) {
    try {
      if (downloadFilename && typeof storageProvider.getSecureDownloadUrl === "function") {
        return await storageProvider.getSecureDownloadUrl(key, downloadFilename, false, expiresInSeconds);
      }
      if (typeof storageProvider.getSecurePlaybackUrl === "function") {
        return await storageProvider.getSecurePlaybackUrl(key, false, expiresInSeconds);
      }
    } catch (err) {
      console.error("[Media Server] Failed to presign private URL:", err);
    }
  }

  // If internal route and downloadFilename is specified, attach query parameters
  if (downloadFilename && (trimmed.startsWith("/api/media/") || trimmed.startsWith("/api/mock-upload/"))) {
    const separator = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${separator}download=true&filename=${encodeURIComponent(downloadFilename)}`;
  }

  return trimmed;
}

/**
 * Batch-presigns all private media (raw files, thumbnails, and direct attachment download URLs)
 * in a list of delivery assets on the server.
 * Enables zero-proxy, high-speed direct streaming and downloads from Cloudflare R2.
 */
export async function presignDeliveryAssets<
  V extends {
    rawFileUrl?: string | null;
    thumbnailUrl?: string | null;
    downloadUrl?: string | null;
    isActiveVersion?: boolean;
    versionNumber?: number;
  },
  A extends {
    title?: string;
    type?: string;
    versions: V[];
    activeVersion?: V | null;
  }
>(
  assets: A[],
  storageProvider: IStorageProvider,
  expiresInSeconds: number = 7200
): Promise<A[]> {
  if (!assets || assets.length === 0) return [];

  return Promise.all(
    assets.map(async (asset) => {
      const presignedVersions = await Promise.all(
        asset.versions.map(async (v) => {
          let ext = "mp4";
          if (v.rawFileUrl) {
            const cleanUrl = v.rawFileUrl.split("?")[0];
            const matchExt = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
            if (matchExt) ext = matchExt[1].toLowerCase();
            else if (asset.type === "photo" || asset.type === "photo_gallery" || asset.type === "still") {
              ext = "jpg";
            }
          }
          const safeTitle = (asset.title || "Cut").replace(/[/\\?%*:|"<>]/g, "_").trim();
          const versionSuffix = v.versionNumber ? `_V${v.versionNumber}` : "";
          const downloadFilename = `${safeTitle}${versionSuffix}.${ext}`;

          const [presignedRaw, presignedThumb, presignedDownload] = await Promise.all([
            presignPrivateMediaUrl(v.rawFileUrl, storageProvider, expiresInSeconds),
            presignPrivateMediaUrl(v.thumbnailUrl, storageProvider, expiresInSeconds),
            presignPrivateMediaUrl(v.rawFileUrl, storageProvider, expiresInSeconds, downloadFilename),
          ]);

          return {
            ...v,
            rawFileUrl: presignedRaw,
            thumbnailUrl: presignedThumb,
            downloadUrl: presignedDownload || presignedRaw,
          };
        })
      );

      const activeVersion =
        presignedVersions.find((v) => v.isActiveVersion) ||
        presignedVersions[0] ||
        null;

      return {
        ...asset,
        versions: presignedVersions,
        activeVersion,
      };
    })
  );
}

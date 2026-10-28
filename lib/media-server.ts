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

  // 1. Check if this is a Cloudflare Stream video URL or 32-char Stream UID
  const streamUidMatch =
    trimmed.includes("videodelivery.net/") || trimmed.includes("cloudflarestream.com/")
      ? trimmed.match(/\/([a-f0-9]{32})(?:\/|$|\?)/i)
      : trimmed.match(/^(?:\/api\/media\/)?([a-f0-9]{32})(?:\?|$)/i);

  if (streamUidMatch && downloadFilename) {
    const streamUid = streamUidMatch[1];
    try {
      if (typeof storageProvider.getSecureDownloadUrl === "function") {
        return await storageProvider.getSecureDownloadUrl(
          streamUid,
          downloadFilename,
          false,
          expiresInSeconds
        );
      }
    } catch (err) {
      console.error("[Media Server] Failed to resolve Stream download URL:", err);
    }
    return `/api/media/${streamUid}?download=true&filename=${encodeURIComponent(downloadFilename)}`;
  }

  // 2. Extract canonical R2 key (private/workspaces/... or public/workspaces/...)
  let key: string | null = null;
  if (trimmed.startsWith("private/") || trimmed.startsWith("public/") || trimmed.startsWith("workspaces/")) {
    key = trimmed.split("?")[0];
  } else if (trimmed.startsWith("/api/media/")) {
    const rawKey = trimmed.replace(/^\/api\/media\//, "").split("?")[0];
    if (rawKey && !/^[a-f0-9]{32}$/i.test(rawKey) && rawKey !== "placeholder.svg" && rawKey !== "fallback.svg") {
      key = rawKey;
    }
  } else if (trimmed.includes("/private/workspaces/") || trimmed.includes("/public/workspaces/")) {
    const match = trimmed.match(/((?:private|public)\/workspaces\/[^\s?#]+)/);
    if (match) key = match[1];
  }

  const isPrivateKey = Boolean(key && key.startsWith("private/"));

  if (key) {
    try {
      // Whenever a downloadFilename is provided, always sign with ResponseContentDisposition: attachment
      // (even for public R2 keys so the browser downloads instead of navigating inline)
      if (downloadFilename && typeof storageProvider.getSecureDownloadUrl === "function") {
        return await storageProvider.getSecureDownloadUrl(
          key,
          downloadFilename,
          !isPrivateKey,
          expiresInSeconds
        );
      }
      if (isPrivateKey && typeof storageProvider.getSecurePlaybackUrl === "function") {
        return await storageProvider.getSecurePlaybackUrl(key, false, expiresInSeconds);
      }
    } catch (err) {
      console.error("[Media Server] Failed to presign R2 URL:", err);
    }
  }

  // If internal route and downloadFilename is specified, attach query parameters
  if (downloadFilename && (trimmed.startsWith("/api/media/") || trimmed.startsWith("/api/mock-upload/"))) {
    const base = trimmed.split("?")[0];
    return `${base}?download=true&filename=${encodeURIComponent(downloadFilename)}`;
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
            if (matchExt) {
              const rawExt = matchExt[1].toLowerCase();
              ext = rawExt === "m3u8" || rawExt === "mpd" ? "mp4" : rawExt;
            } else if (asset.type === "photo" || asset.type === "photo_gallery" || asset.type === "still") {
              ext = "jpg";
            }
          }
          const safeTitle = (asset.title || "Cut").replace(/[/\\?%*:|"<>]/g, "_").trim();
          const versionSuffix = v.versionNumber ? `_V${v.versionNumber}` : "";
          const downloadFilename = `${safeTitle}${versionSuffix}.${ext}`;

          // Detect Cloudflare Stream UID if available (to provide optional fast web-proxy download)
          let streamUid: string | null = null;
          const streamSource = v.hlsManifestUrl || v.rawFileUrl || "";
          const streamMatch =
            streamSource.match(/\/([a-f0-9]{32})(?:\/|$|\?)/i) ||
            streamSource.match(/^([a-f0-9]{32})$/i);
          if (streamMatch) {
            streamUid = streamMatch[1];
          }

          const proxyDownloadFilename = `${safeTitle}${versionSuffix}_WebProxy.mp4`;
          const proxyDownloadUrl = streamUid
            ? `/api/media/${streamUid}?download=true&filename=${encodeURIComponent(proxyDownloadFilename)}`
            : null;

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
            proxyDownloadUrl,
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

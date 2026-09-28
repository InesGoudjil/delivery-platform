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
  expiresInSeconds: number = 7200
): Promise<string> {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // 1. Direct canonical private key (e.g. private/workspaces/...)
  if (trimmed.startsWith("private/")) {
    try {
      if (typeof storageProvider.getSecurePlaybackUrl === "function") {
        return await storageProvider.getSecurePlaybackUrl(trimmed, false, expiresInSeconds);
      }
    } catch (err) {
      console.error("[Media Server] Failed to presign private URL:", err);
    }
  }

  // 2. Full URL containing private key path
  if (trimmed.includes("/private/workspaces/")) {
    const match = trimmed.match(/(private\/workspaces\/[^\s?#]+)/);
    if (match && typeof storageProvider.getSecurePlaybackUrl === "function") {
      try {
        return await storageProvider.getSecurePlaybackUrl(match[1], false, expiresInSeconds);
      } catch (err) {
        console.error("[Media Server] Failed to presign private URL from full path:", err);
      }
    }
  }

  return trimmed;
}

/**
 * Batch-presigns all private media (raw files, thumbnails) in a list of delivery assets on the server.
 * Enables zero-proxy, high-speed direct streaming and viewing from Cloudflare R2.
 */
export async function presignDeliveryAssets<
  V extends { rawFileUrl?: string | null; thumbnailUrl?: string | null; isActiveVersion?: boolean },
  A extends { versions: V[]; activeVersion?: V | null }
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
          const [presignedRaw, presignedThumb] = await Promise.all([
            presignPrivateMediaUrl(v.rawFileUrl, storageProvider, expiresInSeconds),
            presignPrivateMediaUrl(v.thumbnailUrl, storageProvider, expiresInSeconds),
          ]);

          return {
            ...v,
            rawFileUrl: presignedRaw,
            thumbnailUrl: presignedThumb,
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

/**
 * Normalizes media URLs for display across the application.
 *
 * Fixes:
 * 1. Resolves expired or invalid Cloudflare R2 presigned PUT URLs (which contain `x-id=PutObject` or AWS signatures)
 *    and placeholder `pub-xxxx.r2.dev` domains to the internal Next.js media proxy (`/api/media/[...key]`).
 * 2. Preserves valid local blobs, data URLs, public HLS streams, and external URLs.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Direct blob URLs or data URLs in active browser session
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  // Detect Cloudflare R2 direct endpoint, presigned upload URLs (PutObject), or pub-xxxx placeholder domain
  if (
    trimmed.includes("r2.cloudflarestorage.com") ||
    trimmed.includes("pub-xxxx.r2.dev") ||
    trimmed.includes("x-id=PutObject") ||
    (trimmed.includes("X-Amz-Algorithm") && trimmed.includes("workspaces/"))
  ) {
    try {
      const parsed = new URL(trimmed);
      let pathname = parsed.pathname;
      if (pathname.startsWith("/")) pathname = pathname.slice(1);

      // Strip bucket name if prefixed (e.g. cinespace-saas/workspaces/...)
      const workspaceIndex = pathname.indexOf("workspaces/");
      if (workspaceIndex !== -1) {
        const key = pathname.slice(workspaceIndex);
        return `/api/media/${key}`;
      }

      return `/api/media/${pathname}`;
    } catch {
      const match = trimmed.match(/(workspaces\/[^\s?#]+)/);
      if (match) {
        return `/api/media/${match[1]}`;
      }
    }
  }

  return trimmed;
}

/**
 * Checks if a given media or thumbnail URL is an obsolete placeholder or mock URL.
 */
export function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return true;
  const trimmed = url.trim();
  return (
    trimmed.includes("photo-1536440136628-849c177e76a1") ||
    trimmed.includes("files.vidstack.io/sprite-fight") ||
    trimmed.includes("/api/mock-upload/")
  );
}

/**
 * Intelligently resolves the best thumbnail URL for an asset.
 * For stills/photos, if the stored thumbnail is a placeholder or empty, it falls back to the real media file.
 */
export function resolveThumbnailUrl(
  thumbnailUrl: string | null | undefined,
  mediaUrl?: string | null | undefined,
  isStill: boolean = false
): string {
  const resolvedMedia = resolveMediaUrl(mediaUrl);
  const resolvedThumb = resolveMediaUrl(thumbnailUrl);

  // If this is a still photo or image, the media itself is always a valid thumbnail
  if (isStill) {
    if (!resolvedThumb || isPlaceholderUrl(resolvedThumb)) {
      if (resolvedMedia && !isPlaceholderUrl(resolvedMedia)) {
        return resolvedMedia;
      }
    }
  }

  // If the thumbnail is an obsolete mock/placeholder, and we have a valid non-placeholder media URL that is an image
  if (isPlaceholderUrl(resolvedThumb) && resolvedMedia && !isPlaceholderUrl(resolvedMedia)) {
    if (/\.(jpe?g|png|avif|webp|gif|svg)$/i.test(resolvedMedia)) {
      return resolvedMedia;
    }
  }

  return resolvedThumb || resolvedMedia || "";
}


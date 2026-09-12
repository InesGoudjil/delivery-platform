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

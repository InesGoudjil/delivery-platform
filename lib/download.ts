/**
 * Utilities for formatting file sizes and triggering zero-memory direct browser downloads
 * from Cloudflare R2 / S3 storage.
 */

export function formatBytes(bytes: number | null | undefined, decimals: number = 1): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

/**
 * Extracts a safe download filename from title, version, and original URL.
 */
export function getDownloadFilename(
  title: string,
  versionNumber?: number,
  rawUrl?: string | null,
  type?: string
): string {
  let ext = "mp4";
  if (rawUrl) {
    const cleanUrl = rawUrl.split("?")[0];
    const matchExt = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
    if (matchExt) {
      const rawExt = matchExt[1].toLowerCase();
      ext = rawExt === "m3u8" || rawExt === "mpd" ? "mp4" : rawExt;
    } else if (type === "photo" || type === "photo_gallery" || type === "still") {
      ext = "jpg";
    }
  } else if (type === "photo" || type === "photo_gallery" || type === "still") {
    ext = "jpg";
  }

  const safeTitle = (title || "Deliverable").replace(/[/\\?%*:|"<>]/g, "_").trim();
  const vSuffix = versionNumber ? `_V${versionNumber}` : "";
  return `${safeTitle}${vSuffix}.${ext}`;
}

/**
 * Normalizes any media URL (presigned R2 URL, public R2 CDN URL, canonical key,
 * Cloudflare Stream URL, or /api/media route) into a guaranteed attachment download URL
 * without ever corrupting existing AWS S3 signatures.
 */
export function buildAttachmentDownloadUrl(url: string, filename?: string): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  const safeFilename = (filename || "Deliverable.mp4")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .trim();

  // 1. Local static assets, blob URLs, or data URLs
  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/images/") ||
    trimmed.startsWith("/videos/")
  ) {
    return trimmed;
  }

  // 2. Bare canonical R2 keys (e.g. private/workspaces/... or public/workspaces/...)
  if (
    trimmed.startsWith("private/") ||
    trimmed.startsWith("public/") ||
    trimmed.startsWith("workspaces/")
  ) {
    const cleanKey = trimmed.split("?")[0];
    return `/api/media/${cleanKey}?download=true&filename=${encodeURIComponent(safeFilename)}`;
  }

  // 3. Internal /api/media/ or /api/mock-upload/ proxy routes
  if (trimmed.startsWith("/api/media/") || trimmed.startsWith("/api/mock-upload/")) {
    const base = trimmed.split("?")[0];
    return `${base}?download=true&filename=${encodeURIComponent(safeFilename)}`;
  }

  // 4. Already-presigned S3 / Cloudflare R2 URL
  if (trimmed.includes("X-Amz-Signature=") || trimmed.includes("X-Amz-Algorithm=")) {
    // If already signed with ResponseContentDisposition: attachment, return untouched!
    if (trimmed.toLowerCase().includes("response-content-disposition=")) {
      return trimmed;
    }
    // Otherwise extract the canonical key and route via /api/media so it gets signed with attachment disposition
    const keyMatch = trimmed.match(/((?:private|public)\/workspaces\/[^\s?#]+)/);
    if (keyMatch) {
      return `/api/media/${keyMatch[1]}?download=true&filename=${encodeURIComponent(safeFilename)}`;
    }
    return trimmed;
  }

  // 5. Public R2 CDN URL containing a workspace object key (no Content-Disposition header on raw CDN)
  if (trimmed.includes("/private/workspaces/") || trimmed.includes("/public/workspaces/")) {
    const keyMatch = trimmed.match(/((?:private|public)\/workspaces\/[^\s?#]+)/);
    if (keyMatch) {
      return `/api/media/${keyMatch[1]}?download=true&filename=${encodeURIComponent(safeFilename)}`;
    }
  }

  // 6. Cloudflare Stream URLs (videodelivery.net / cloudflarestream.com)
  // Route through /api/media/{uid}?download=true so the server guarantees MP4 downloads are enabled on Cloudflare Stream
  if (trimmed.includes("videodelivery.net/") || trimmed.includes("cloudflarestream.com/")) {
    try {
      const parsed = new URL(trimmed);
      const uidMatch = parsed.pathname.match(/\/([a-f0-9]{32})(?:\/|$)/i);
      if (uidMatch) {
        return `/api/media/${uidMatch[1]}?download=true&filename=${encodeURIComponent(safeFilename)}`;
      }
    } catch {
      // ignore URL parse error
    }
  }

  return trimmed;
}

/**
 * Triggers a direct native browser download without buffering the file in JavaScript memory
 * and WITHOUT opening any new tab ("onglet").
 *
 * Ensures the target URL carries a `Content-Disposition: attachment` header (via R2 presigning
 * or `/api/media/...?download=true`) or uses same-origin `<a download>` for static assets.
 */
export function triggerDirectDownload(url: string, filename?: string): void {
  if (!url || typeof window === "undefined") return;

  const safeFilename = (filename || "Deliverable")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .trim();
  const targetUrl = buildAttachmentDownloadUrl(url, safeFilename);
  if (!targetUrl) return;

  const link = document.createElement("a");
  link.href = targetUrl;
  link.setAttribute("download", safeFilename);
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 2000);
}

export interface SequentialDownloadItem {
  url: string;
  filename: string;
  title: string;
}

/**
 * Dispatches a list of direct file downloads in sequence with a controlled interval
 * so modern browsers don't trigger pop-up blockers or overwhelm the local download queue.
 */
export async function triggerSequentialDownloads(
  items: SequentialDownloadItem[],
  onProgress?: (index: number, total: number, currentItem: SequentialDownloadItem) => void,
  intervalMs: number = 850
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress?.(i + 1, items.length, item);
    triggerDirectDownload(item.url, item.filename);

    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

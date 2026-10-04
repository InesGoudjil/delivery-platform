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
      ext = matchExt[1].toLowerCase();
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
 * Triggers a direct native browser download without buffering the file in JavaScript memory
 * and WITHOUT opening any new tab ("onglet").
 * 
 * Uses an invisible iframe so that:
 * 1. Zero new tabs or blank pages are spawned.
 * 2. Download managers (like Free Download Manager / FDM or IDM) immediately capture the stream.
 * 3. Browser native download manager starts saving directly to disk (~/Downloads).
 */
export function triggerDirectDownload(url: string, filename?: string): void {
  if (!url || typeof window === "undefined") return;

  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    iframe.style.border = "none";
    iframe.src = url;
    document.body.appendChild(iframe);

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 45000);
    return;
  } catch (err) {
    console.warn("[Download] Iframe dispatch failed, using fallback anchor:", err);
  }

  // Fallback: direct anchor without target="_blank"
  const link = document.createElement("a");
  link.href = url;
  if (filename) {
    link.setAttribute("download", filename);
  }
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 1000);
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

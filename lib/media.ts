function getStreamDomain(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN ||
    process.env.CLOUDFLARE_STREAM_SUBDOMAIN ||
    "videodelivery.net"
  )
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

function getR2PublicDomain(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_DOMAIN ||
    process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN ||
    ""
  ).replace(/\/+$/, "");
}

function hasRealR2PublicDomain(): boolean {
  const domain = getR2PublicDomain();
  return (
    Boolean(domain) &&
    !domain.includes("pub-xxxx") &&
    !domain.includes("r2.cloudflarestorage.com")
  );
}

/**
 * Normalizes media URLs for display across the application.
 *
 * Fixes:
 * 1. Resolves 32-character hex Cloudflare Stream UIDs or `/api/media/[uid]` to public HLS manifest streams.
 * 2. Resolves direct `workspaces/...` keys and placeholder `pub-xxxx.r2.dev` domains to the public R2 CDN or media proxy.
 * 3. Preserves valid local blobs, data URLs, public HLS streams, and external URLs.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Direct blob URLs or data URLs in active browser session
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const streamDomain = getStreamDomain();
  const isRealR2 = hasRealR2PublicDomain();
  const r2Domain = getR2PublicDomain();

  // Detect raw 32-char hex Cloudflare Stream UID
  if (/^[a-f0-9]{32}$/i.test(trimmed)) {
    return `https://${streamDomain}/${trimmed}/manifest/video.m3u8`;
  }

  // Detect /api/media/<32-char-hex-uid> that was incorrectly stored
  const mediaUidMatch = trimmed.match(/^\/api\/media\/([a-f0-9]{32})$/i);
  if (mediaUidMatch) {
    return `https://${streamDomain}/${mediaUidMatch[1]}/manifest/video.m3u8`;
  }

  // Public R2 key (e.g. public/workspaces/...)
  if (trimmed.startsWith("public/")) {
    return isRealR2 ? `${r2Domain}/${trimmed}` : `/api/media/${trimmed}`;
  }

  // Private R2 key (e.g. private/workspaces/...) -> route through /api/media which 307-redirects to presigned GET
  if (trimmed.startsWith("private/")) {
    return `/api/media/${trimmed}`;
  }

  // Direct legacy workspaces key (e.g. workspaces/2f1a3dfe/.../photo.jpg)
  if (trimmed.startsWith("workspaces/")) {
    return isRealR2 ? `${r2Domain}/${trimmed}` : `/api/media/${trimmed}`;
  }

  // Direct presigned GET URL (AWS SigV4 with signature) - preserve direct fast R2 CDN delivery
  if (
    trimmed.includes("X-Amz-Signature") &&
    !trimmed.includes("x-id=PutObject")
  ) {
    return trimmed;
  }

  // Detect Cloudflare R2 direct endpoint, presigned upload/download URLs, or pub-xxxx placeholder domain
  if (
    trimmed.includes("r2.cloudflarestorage.com") ||
    trimmed.includes("pub-xxxx.r2.dev") ||
    trimmed.includes("x-id=PutObject") ||
    trimmed.includes("x-id=GetObject") ||
    (trimmed.includes("X-Amz-Algorithm") && (trimmed.includes("workspaces/") || trimmed.includes("private/")))
  ) {
    try {
      const parsed = new URL(trimmed);
      let pathname = parsed.pathname;
      if (pathname.startsWith("/")) pathname = pathname.slice(1);

      // Private assets must always be routed to /api/media to obtain fresh presigned GET redirects
      const privateIndex = pathname.indexOf("private/");
      if (privateIndex !== -1) {
        return `/api/media/${pathname.slice(privateIndex)}`;
      }

      // Public assets with explicit public/ prefix
      const publicIndex = pathname.indexOf("public/");
      if (publicIndex !== -1) {
        const key = pathname.slice(publicIndex);
        return isRealR2 ? `${r2Domain}/${key}` : `/api/media/${key}`;
      }

      // Legacy direct workspaces keys
      const workspaceIndex = pathname.indexOf("workspaces/");
      if (workspaceIndex !== -1) {
        const key = pathname.slice(workspaceIndex);
        if (isRealR2) {
          return `${r2Domain}/${key}`;
        }
        return `/api/media/${key}`;
      }

      if (isRealR2) {
        return `${r2Domain}/${pathname}`;
      }
      return `/api/media/${pathname}`;
    } catch {
      const privateMatch = trimmed.match(/(private\/[^\s?#]+)/);
      if (privateMatch) {
        return `/api/media/${privateMatch[1]}`;
      }
      const match = trimmed.match(/(workspaces\/[^\s?#]+)/);
      if (match) {
        if (isRealR2) {
          return `${r2Domain}/${match[1]}`;
        }
        return `/api/media/${match[1]}`;
      }
    }
  }

  // If URL is an internal /api/media/public/... or legacy /api/media/workspaces/... and we have a valid public R2 domain, direct to CDN
  if (isRealR2 && (trimmed.startsWith("/api/media/workspaces/") || trimmed.startsWith("/api/media/public/"))) {
    const key = trimmed.replace(/^\/api\/media\//, "");
    return `${r2Domain}/${key}`;
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
    trimmed.includes("files.vidstack.io/sprite-fight") ||
    trimmed.includes("/api/mock-upload/") ||
    trimmed.startsWith("mock_stream_") ||
    trimmed.startsWith("mock_")
  );
}

/**
 * Intelligently resolves the best thumbnail URL for an asset.
 * For Cloudflare Stream videos, extracts the stream UID and builds the official poster URL.
 * For stills/photos, if the stored thumbnail is a placeholder or empty, it falls back to the real media file.
 */
export function resolveThumbnailUrl(
  thumbnailUrl: string | null | undefined,
  mediaUrl?: string | null | undefined,
  isStill: boolean = false
): string {
  const streamDomain = getStreamDomain();

  // If thumbnail is a 32-char hex Cloudflare Stream UID
  if (thumbnailUrl && /^[a-f0-9]{32}$/i.test(thumbnailUrl.trim())) {
    return `https://${streamDomain}/${thumbnailUrl.trim()}/thumbnails/thumbnail.jpg?time=1s&height=720`;
  }

  // If thumbnail is /api/media/<32-char-hex>
  if (thumbnailUrl) {
    const thumbUidMatch = thumbnailUrl.trim().match(/^\/api\/media\/([a-f0-9]{32})$/i);
    if (thumbUidMatch) {
      return `https://${streamDomain}/${thumbUidMatch[1]}/thumbnails/thumbnail.jpg?time=1s&height=720`;
    }
  }

  const resolvedMedia = resolveMediaUrl(mediaUrl);
  const resolvedThumb = resolveMediaUrl(thumbnailUrl);

  // If this is a still photo or image, the media itself is always a valid thumbnail
  if (isStill) {
    if (!resolvedThumb || isPlaceholderUrl(resolvedThumb)) {
      if (resolvedMedia && !isPlaceholderUrl(resolvedMedia)) {
        return resolvedMedia;
      }
      return "";
    }
  }

  // Check if mediaUrl contains a Cloudflare Stream video UID
  if (resolvedMedia && (!resolvedThumb || isPlaceholderUrl(resolvedThumb))) {
    const streamMatch = resolvedMedia.match(
      /(?:cloudflarestream\.com|videodelivery\.net)\/([a-f0-9]{32})/i
    );
    if (streamMatch) {
      return `https://${streamDomain}/${streamMatch[1]}/thumbnails/thumbnail.jpg?time=1s&height=720`;
    }
  }

  // If the thumbnail is an obsolete mock/placeholder
  if (isPlaceholderUrl(resolvedThumb)) {
    if (resolvedMedia && !isPlaceholderUrl(resolvedMedia)) {
      if (/\.(jpe?g|png|avif|webp|gif|svg)$/i.test(resolvedMedia)) {
        return resolvedMedia;
      }
    }
    return "";
  }

  return resolvedThumb || resolvedMedia || "";
}


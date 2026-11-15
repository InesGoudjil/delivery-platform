"use client";

import { useState, useEffect, useRef } from "react";
import Image, { ImageLoader, ImageProps } from "next/image";
import { Camera, Film, Image as ImageIcon, RefreshCw } from "lucide-react";
import { resolveThumbnailUrl, isPlaceholderUrl, resolveMediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";

export interface AppImageProps extends Omit<ImageProps, "src" | "alt"> {
  src?: string | null;
  alt?: string;
  fallbackIcon?: "camera" | "film" | "image";
  fallbackText?: string;
  aspectRatioClass?: string;
  containerClassName?: string;
  objectFit?: "cover" | "contain";
}

function isVideoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".m4v") ||
    clean.endsWith(".ogv")
  );
}

/** The URL shown for `src`, or "" when there is nothing to show (missing or a placeholder). */
export function resolveDisplayUrl(src: string | null | undefined, isImageOrStill: boolean): string {
  if (!src || typeof src !== "string") return "";
  const trimmed = src.trim();
  if (!trimmed || isPlaceholderUrl(trimmed)) return "";
  const resolved = resolveThumbnailUrl(trimmed, undefined, isImageOrStill) || resolveMediaUrl(trimmed);
  return resolved && !isPlaceholderUrl(resolved) ? resolved : "";
}

/**
 * Whether `resolved` is the same on the server and in the browser, so it can be rendered on the
 * server: absolute https URLs left as they were (signed links, stored Stream thumbnails) and
 * local images. Rewritten URLs can depend on server-only settings (the Stream and R2 domains),
 * so those are worked out in the browser only, as before.
 */
export function isServerRenderable(src: string, resolved: string): boolean {
  return resolved === src.trim() && (/^https:\/\//.test(resolved) || /^\/(?!\/|api\/)/.test(resolved));
}

/** Cloudflare Stream resizes thumbnails on request, so they get a srcset sized to the card. */
export function isStreamThumbnailUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    return /(^|\.)(cloudflarestream\.com|videodelivery\.net)$/.test(hostname) && pathname.endsWith("/thumbnails/thumbnail.jpg");
  } catch {
    return false;
  }
}

export const streamThumbnailLoader: ImageLoader = ({ src, width }) => {
  const url = new URL(src);
  url.searchParams.delete("height");
  url.searchParams.set("width", String(width));
  return url.toString();
};

export function AppImage({
  src,
  alt = "Media asset",
  fallbackIcon = "film",
  fallbackText,
  aspectRatioClass,
  containerClassName = "",
  className = "",
  fill = true,
  objectFit = "cover",
  sizes,
  unoptimized,
  ...props
}: AppImageProps) {
  const isImageOrStill = fallbackIcon === "image" || fallbackIcon === "camera";

  // What the server can render already (see isServerRenderable); the rest waits for the browser.
  const initialResolved = resolveDisplayUrl(src, isImageOrStill);
  const initialSrc = initialResolved && src && isServerRenderable(src, initialResolved) ? initialResolved : "";

  const [hasError, setHasError] = useState(!initialResolved);
  // A server-rendered image paints as it arrives; the loading overlay is for URLs the browser
  // works out (otherwise it would sit dimmed until hydration, even once loaded).
  const [isLoading, setIsLoading] = useState(!initialSrc);
  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [retryAttempt, setRetryAttempt] = useState(0);
  // The URL on screen, so hydration doesn't reload an image the server already rendered.
  const shownSrc = useRef(initialSrc);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = isVideoUrl(currentSrc);

  useEffect(() => {
    const resolved = resolveDisplayUrl(src, isImageOrStill);
    if (!resolved) {
      shownSrc.current = "";
      setHasError(true);
      setIsLoading(false);
      setCurrentSrc("");
      return;
    }
    if (resolved === shownSrc.current && retryAttempt === 0) return;

    shownSrc.current = resolved;
    setHasError(false);
    setIsLoading(true);
    setCurrentSrc(resolved);
  }, [src, isImageOrStill, retryAttempt]);

  // A server-rendered video can finish loading before React attaches its handlers.
  useEffect(() => {
    if (isVideo && videoRef.current && videoRef.current.readyState >= 1) {
      setIsLoading(false);
    }
  }, [isVideo, currentSrc]);

  const handleImageError = () => {
    // If the media failed on direct R2 public CDN or S3 endpoint, gracefully fall back to the authenticated /api/media proxy
    if (!currentSrc.startsWith("/api/media/") && currentSrc.includes("workspaces/")) {
      const workspaceKey = currentSrc.slice(currentSrc.indexOf("workspaces/")).split("?")[0];
      const isPrivate = currentSrc.includes("private/") || workspaceKey.startsWith("private/");
      const cleanKey =
        workspaceKey.startsWith("private/") || workspaceKey.startsWith("public/")
          ? workspaceKey
          : isPrivate
          ? `private/${workspaceKey}`
          : workspaceKey;
      const proxyUrl = `/api/media/${cleanKey}`;
      if (currentSrc !== proxyUrl) {
        console.warn(`[AppImage] Media failed to load at ${currentSrc}. Falling back to proxy ${proxyUrl}`);
        shownSrc.current = proxyUrl;
        setCurrentSrc(proxyUrl);
        return;
      }
    }

    setHasError(true);
    setIsLoading(false);
  };

  const resizesOnRequest = isStreamThumbnailUrl(currentSrc);

  const renderFallbackIcon = () => {
    switch (fallbackIcon) {
      case "camera":
        return <Camera className="size-6 text-primary/70" />;
      case "image":
        return <ImageIcon className="size-6 text-primary/70" />;
      case "film":
      default:
        return <Film className="size-6 text-primary/70" />;
    }
  };

  const hasCustomPosition =
    containerClassName.includes("absolute") ||
    containerClassName.includes("relative") ||
    containerClassName.includes("fixed");

  const hasCustomSize =
    containerClassName.includes("h-") ||
    containerClassName.includes("size-") ||
    containerClassName.includes("aspect-") ||
    Boolean(aspectRatioClass);

  const fillClasses = fill
    ? `${hasCustomPosition || aspectRatioClass ? "" : "absolute inset-0"} ${hasCustomSize ? "" : "w-full h-full"}`
    : "relative w-full";

  return (
    <div
      className={`relative overflow-hidden bg-[#0c0c0e] ${fillClasses} ${aspectRatioClass || ""} ${containerClassName}`}
    >
      {!hasError && currentSrc ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-white/5 animate-pulse z-10 flex items-center justify-center pointer-events-none">
              <div className="size-5 rounded-full border-2 border-white/20 border-t-primary animate-spin" />
            </div>
          )}
          {isVideo ? (
            <video
              ref={videoRef}
              src={`${currentSrc}#t=0.001`}
              preload="metadata"
              muted
              playsInline
              className={`w-full h-full transition-opacity duration-300 ${
                isLoading ? "opacity-40" : "opacity-100"
              } ${objectFit === "contain" ? "object-contain" : "object-cover"} ${className}`}
              onLoadedData={() => setIsLoading(false)}
              onLoadedMetadata={(e) => {
                setIsLoading(false);
                const video = e.currentTarget;
                if (props.onLoad && video.videoWidth && video.videoHeight) {
                  props.onLoad({
                    currentTarget: {
                      naturalWidth: video.videoWidth,
                      naturalHeight: video.videoHeight,
                    },
                  } as any);
                }
              }}
              onError={handleImageError}
            />
          ) : (
            <Image
              src={currentSrc}
              alt={alt}
              fill={fill}
              sizes={sizes || (fill ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" : undefined)}
              loader={resizesOnRequest ? streamThumbnailLoader : undefined}
              unoptimized={resizesOnRequest ? false : (unoptimized ?? true)}
              onError={handleImageError}
              className={`transition-opacity duration-300 ${
                isLoading ? "opacity-40" : "opacity-100"
              } ${objectFit === "contain" ? "object-contain" : "object-cover"} ${className}`}
              {...props}
              onLoad={(e) => {
                setIsLoading(false);
                props.onLoad?.(e);
              }}
            />
          )}
        </>
      ) : !hasError && src ? (
        // Worked out in the browser (see isServerRenderable): a neutral placeholder until then.
        <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-[#141416] border border-white/5 text-[#8e8e93] space-y-1.5 select-none">
          {renderFallbackIcon()}
          {fallbackText ? (
            <span className="text-[10px]  text-[#71717a] line-clamp-1">{fallbackText}</span>
          ) : (
            <span className="text-[10px]  text-[#71717a] uppercase tracking-wider">
              {fallbackIcon === "film" ? "No Video Preview" : "No Image Preview"}
            </span>
          )}
          {src && !isPlaceholderUrl(src) && (
            <Button
              variant="link"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                setRetryAttempt((prev) => prev + 1);
              }}
              className="mt-1 h-auto p-0 flex items-center gap-1 text-[9px]  text-primary hover:underline cursor-pointer"
            >
              <RefreshCw className="size-2.5" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

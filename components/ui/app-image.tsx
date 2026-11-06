"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image, { ImageProps } from "next/image";
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

function computeResolvedSrc(src: string | null | undefined, isImageOrStill: boolean): string {
  if (!src || typeof src !== "string") return "";
  const trimmed = src.trim();
  if (!trimmed || isPlaceholderUrl(trimmed)) return "";

  const resolved =
    resolveThumbnailUrl(trimmed, undefined, isImageOrStill) ||
    resolveMediaUrl(trimmed);

  if (!resolved || isPlaceholderUrl(resolved)) return "";
  return resolved;
}

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
  priority,
  loading,
  ...props
}: AppImageProps) {
  const isImageOrStill = fallbackIcon === "image" || fallbackIcon === "camera";
  const initialSrc = useMemo(
    () => computeResolvedSrc(src, isImageOrStill),
    [src, isImageOrStill]
  );

  const [overrideSrc, setOverrideSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(!initialSrc);
  const [isLoading, setIsLoading] = useState(Boolean(initialSrc));
  const [retryAttempt, setRetryAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentSrc = overrideSrc ?? initialSrc;
  const isVideo = isVideoUrl(currentSrc);

  useEffect(() => {
    setOverrideSrc(null);
    if (!initialSrc) {
      setHasError(true);
      setIsLoading(false);
    } else {
      setHasError(false);
      setIsLoading(true);
    }
  }, [initialSrc, retryAttempt]);

  // Progressive enhancement + IntersectionObserver fallback for offscreen <video loading="lazy">
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!isVideo || !videoEl || priority || !currentSrc) return;

    const targetVideoSrc = `${currentSrc}#t=0.001`;
    const supportsLazyMedia =
      typeof HTMLMediaElement !== "undefined" &&
      Object.hasOwn(HTMLMediaElement.prototype, "loading");

    if (supportsLazyMedia || typeof IntersectionObserver === "undefined") {
      if (videoEl.getAttribute("src") !== targetVideoSrc) {
        videoEl.src = targetVideoSrc;
        videoEl.preload = "metadata";
      }
      return;
    }

    // Hold back network fetches in browsers without native <video loading="lazy"> until near viewport
    videoEl.preload = "none";
    videoEl.removeAttribute("src");

    const mediaObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const media = entry.target as HTMLVideoElement;
          media.preload = "metadata";
          media.src = targetVideoSrc;
          media.load();
          observer.unobserve(media);
        }
      },
      { rootMargin: "200px 0px" }
    );

    mediaObserver.observe(videoEl);
    return () => mediaObserver.disconnect();
  }, [isVideo, currentSrc, priority]);

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
        setOverrideSrc(proxyUrl);
        return;
      }
    }

    setHasError(true);
    setIsLoading(false);
  };

  const shouldUnoptimize =
    unoptimized ??
    (currentSrc.startsWith("/api/media/") ||
      currentSrc.startsWith("blob:") ||
      currentSrc.startsWith("data:") ||
      currentSrc.includes("X-Amz-Signature"));

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
              src={priority ? `${currentSrc}#t=0.001` : undefined}
              preload={priority ? "metadata" : "none"}
              width={640}
              height={360}
              muted
              playsInline
              {...(!priority ? ({ loading: "lazy" } as any) : {})}
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
              priority={priority}
              loading={priority ? undefined : loading ?? "lazy"}
              fetchPriority={priority ? "high" : props.fetchPriority}
              sizes={sizes || (fill ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" : undefined)}
              unoptimized={shouldUnoptimize}
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

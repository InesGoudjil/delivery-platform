"use client";

import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { Camera, Film, Image as ImageIcon, RefreshCw } from "lucide-react";
import { resolveThumbnailUrl, isPlaceholderUrl, resolveMediaUrl } from "@/lib/media";

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
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState<string>("");
  const [retryAttempt, setRetryAttempt] = useState(0);

  const isImageOrStill = fallbackIcon === "image" || fallbackIcon === "camera";
  const isVideo = isVideoUrl(currentSrc);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);

    if (!src || typeof src !== "string" || src.trim().length === 0) {
      setHasError(true);
      setIsLoading(false);
      setCurrentSrc("");
      return;
    }

    const trimmed = src.trim();
    if (isPlaceholderUrl(trimmed)) {
      setHasError(true);
      setIsLoading(false);
      setCurrentSrc("");
      return;
    }

    const resolved =
      resolveThumbnailUrl(trimmed, undefined, isImageOrStill) ||
      resolveMediaUrl(trimmed);

    if (!resolved || isPlaceholderUrl(resolved)) {
      setHasError(true);
      setIsLoading(false);
      setCurrentSrc("");
      return;
    }

    setCurrentSrc(resolved);
  }, [src, isImageOrStill, retryAttempt]);

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
        setCurrentSrc(proxyUrl);
        return;
      }
    }

    setHasError(true);
    setIsLoading(false);
  };

  const isExternalCdn = Boolean(
    currentSrc &&
    (currentSrc.includes("cloudflarestream.com") ||
      currentSrc.includes("r2.dev") ||
      currentSrc.includes("videodelivery.net"))
  );

  const renderFallbackIcon = () => {
    switch (fallbackIcon) {
      case "camera":
        return <Camera className="size-6 text-[#f5551d]/70" />;
      case "image":
        return <ImageIcon className="size-6 text-[#f5551d]/70" />;
      case "film":
      default:
        return <Film className="size-6 text-[#f5551d]/70" />;
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
              <div className="size-5 rounded-full border-2 border-white/20 border-t-[#f5551d] animate-spin" />
            </div>
          )}
          {isVideo ? (
            <video
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
              unoptimized={unoptimized ?? true}
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
            <span className="text-[10px] font-mono text-[#71717a] line-clamp-1">{fallbackText}</span>
          ) : (
            <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider">
              {fallbackIcon === "film" ? "No Video Preview" : "No Image Preview"}
            </span>
          )}
          {src && !isPlaceholderUrl(src) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRetryAttempt((prev) => prev + 1);
              }}
              className="mt-1 flex items-center gap-1 text-[9px] font-mono text-[#f5551d] hover:underline cursor-pointer"
            >
              <RefreshCw className="size-2.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

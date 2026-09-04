"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";
import { Camera, Film, Image as ImageIcon } from "lucide-react";

export interface AppImageProps extends Omit<ImageProps, "src" | "alt"> {
  src?: string | null;
  alt?: string;
  fallbackIcon?: "camera" | "film" | "image";
  fallbackText?: string;
  aspectRatioClass?: string;
  containerClassName?: string;
  objectFit?: "cover" | "contain";
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
  ...props
}: AppImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isValidSrc = Boolean(src && typeof src === "string" && src.trim().length > 0 && !hasError);

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

  return (
    <div
      className={`relative overflow-hidden bg-[#0c0c0e] ${aspectRatioClass || ""} ${containerClassName}`}
    >
      {isValidSrc ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-white/5 animate-pulse z-10 flex items-center justify-center">
              <div className="size-6 rounded-full border-2 border-white/20 border-t-[#f5551d] animate-spin" />
            </div>
          )}
          <Image
            src={src!}
            alt={alt}
            fill={fill}
            onError={() => setHasError(true)}
            onLoadingComplete={() => setIsLoading(false)}
            className={`transition-all duration-300 ${
              isLoading ? "scale-105 blur-sm opacity-0" : "scale-100 blur-0 opacity-100"
            } ${objectFit === "contain" ? "object-contain" : "object-cover"} ${className}`}
            {...props}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-[#141416] border border-white/5 text-[#8e8e93] space-y-1.5">
          {renderFallbackIcon()}
          {fallbackText && (
            <span className="text-[10px] font-mono text-[#71717a] line-clamp-1">{fallbackText}</span>
          )}
        </div>
      )}
    </div>
  );
}

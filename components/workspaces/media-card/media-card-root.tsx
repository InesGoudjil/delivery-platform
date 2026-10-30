"use client";

import React, { useState } from "react";
import { AppImage } from "@/components/ui/app-image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { TiltCard } from "@/components/ui/motion";
import { TypographyH4, TypographySpan } from "@/components/ui/typography";
import { WatermarkOverlay } from "@/components/ui/watermark-overlay";
import type { MediaCardProps } from "./types";
import { parseItemAspectRatio } from "./media-grid";
import {
  MediaBadge,
  AssetCountBadge,
  FeaturedBadge,
  HeroBadge,
  VersionBadge,
} from "./media-badges";
import {
  PlayButtonOverlay,
  ZoomButtonOverlay,
  CardBottomOverlay,
} from "./media-overlays";

export function MediaCard({
  title,
  subtitle,
  src,
  alt,
  type = "film",
  aspectRatio,
  numericRatio,
  isMasonry = false,
  thumbnailScale = "fill",
  onClick,
  isHero = false,
  isFeatured = false,
  className = "",
  containerClassName = "",
  tiltIntensity = 3,
  glareIntensity = 0.1,
  textAlign = "center",
  topLeft,
  topRight,
  centerAction,
  bottomRight,
  watermarkMedia,
  footerMode = "overlay",
  showInfo = true,
  showSubtitle = true,
  showTitle = true,
  footer,
  children,
}: MediaCardProps) {
  const isFit = thumbnailScale === "fit" || thumbnailScale === "Fit";
  const fallbackIcon =
    type === "still" || type === "photo" ? "image" : "film";

  const parsedRatio = parseItemAspectRatio(aspectRatio);
  const defaultRatio =
    type === "film" || type === "video" ? 16 / 9 : type === "still" ? 3 / 4 : 4 / 3;

  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const effectiveRatio = numericRatio || parsedRatio || naturalRatio || defaultRatio;
  const isInfoVisible = showInfo && (showTitle || showSubtitle);

  const mediaContent = (
    <div
      className={`relative w-full overflow-hidden bg-black/40 ${isMasonry ? "" : "size-full"}`}
      style={isMasonry ? { aspectRatio: `${effectiveRatio}` } : undefined}
    >
      <AppImage
        src={src}
        alt={alt || title || "media item"}
        fill
        objectFit={isFit ? "contain" : "cover"}
        fallbackIcon={fallbackIcon}
        containerClassName="absolute inset-0 size-full"
        className={`size-full ${
          isFit ? "object-contain bg-black" : "object-cover"
        } transition-transform duration-500 group-hover:scale-105`}
        onLoad={(e: any) => {
          const img = e?.currentTarget;
          if (!numericRatio && !parsedRatio && img?.naturalWidth && img?.naturalHeight) {
            const ratio = img.naturalWidth / img.naturalHeight;
            if (ratio > 0 && isFinite(ratio)) {
              setNaturalRatio(ratio);
            }
          }
        }}
      />

      {/* Watermark Overlay */}
      {watermarkMedia?.enabled && (
        <WatermarkOverlay
          text={watermarkMedia.text || "WATERMARK ACTIVE"}
          subtext={watermarkMedia.subtext}
          variant={watermarkMedia.variant || "card"}
          opacity={watermarkMedia.opacity ?? 0.16}
          className={watermarkMedia.className}
          showBadge={watermarkMedia.showBadge}
        />
      )}

      {/* Top Left Slots (Badges) */}
      {topLeft && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap">
          {topLeft}
        </div>
      )}

      {/* Top Right Slots (Actions, Counters) */}
      {topRight && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {topRight}
        </div>
      )}

      {/* Center Action (Play, Zoom) */}
      {centerAction && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {centerAction}
        </div>
      )}

      {/* Bottom Right Slot (Duration) */}
      {bottomRight && (
        <div className="absolute bottom-3 right-3 z-10">
          {bottomRight}
        </div>
      )}

      {/* Centered Overlay Metadata Mode (Matches Screenshot Inspiration) */}
      {footerMode === "overlay" && isInfoVisible && (title || subtitle) && (
        <CardBottomOverlay
          title={showTitle && showInfo ? title : undefined}
          subtitle={showSubtitle && showInfo ? subtitle : undefined}
          textAlign={textAlign}
          showSubtitle={showSubtitle && showInfo}
        />
      )}

      {children}
    </div>
  );

  return (
    <TiltCard
      tiltIntensity={tiltIntensity}
      glareIntensity={glareIntensity}
      className={`rounded-2xl w-full ${isMasonry ? "break-inside-avoid mb-4 h-auto" : "h-full"} ${containerClassName}`}
    >
      <Card
        onClick={onClick}
        className={`group relative rounded-2xl overflow-hidden border bg-[#0c0c0e] transition-all duration-300 p-0 cursor-pointer w-full shadow-lg hover:shadow-2xl ${
          isHero
            ? "border-primary/80 ring-1 ring-primary/40 shadow-lg shadow-primary/10"
            : "border-white/10 hover:border-white/30 dark:border-white/10 dark:hover:border-white/30"
        } ${isMasonry ? "h-auto" : "h-full"} ${className}`}
      >
        <CardContent className="p-0 relative overflow-hidden">
          {isMasonry ? (
            mediaContent
          ) : (
            <AspectRatio ratio={effectiveRatio} className="w-full relative overflow-hidden bg-black/40">
              {mediaContent}
            </AspectRatio>
          )}
        </CardContent>

        {/* Separate Card Footer Mode (e.g. for Deliveries with control buttons) */}
        {footerMode === "card" && (
          footer || (
            <CardFooter className="p-3.5 border-t border-border/40 flex-col items-start gap-1">
              {showTitle && showInfo && title && (
                <CardTitle className="p-0 border-none w-full">
                  <TypographyH4 className="text-xs font-bold text-card-foreground truncate w-full font-heading">
                    {title}
                  </TypographyH4>
                </CardTitle>
              )}
              {showSubtitle && showInfo && subtitle && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground w-full">
                  <TypographySpan>{subtitle}</TypographySpan>
                </div>
              )}
            </CardFooter>
          )
        )}
      </Card>
    </TiltCard>
  );
}

// Compound component attachments for maximum composition flexibility
MediaCard.Badge = MediaBadge;
MediaCard.Count = AssetCountBadge;
MediaCard.Featured = FeaturedBadge;
MediaCard.Hero = HeroBadge;
MediaCard.Version = VersionBadge;
MediaCard.Play = PlayButtonOverlay;
MediaCard.Zoom = ZoomButtonOverlay;
MediaCard.BottomOverlay = CardBottomOverlay;

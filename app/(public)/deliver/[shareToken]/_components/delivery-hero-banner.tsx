"use client";

import { Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  TypographyH1,
  TypographyKicker,
  TypographySpan,
} from "@/components/ui/typography";

interface DeliveryHeroBannerProps {
  title: string;
  clientName?: string | null;
  heroCoverUrl: string;
  formattedDate: string;
  displayLocation: string;
  formattedTotalSize: string;
  displayAssetCount: number;
  approvedCount: number;
  isGlobalDownloadUnlocked: boolean;
  onDownloadAll: () => void;
}

export function DeliveryHeroBanner({
  title,
  clientName,
  heroCoverUrl,
  formattedDate,
  displayLocation,
  formattedTotalSize,
  displayAssetCount,
  approvedCount,
  isGlobalDownloadUnlocked,
  onDownloadAll,
}: DeliveryHeroBannerProps) {
  const canDownload = Boolean(isGlobalDownloadUnlocked);

  return (
    // flex-auto: the room puts the header and this banner in a column at least one screen tall,
    // and the banner takes the rest of it. It is never shorter than its own text and buttons.
    <Card className="relative w-full flex-auto rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden border border-white/10 flex flex-col justify-end shadow-2xl group bg-transparent py-0 hover:translate-y-0">
      {/* Project Cover Background: background-size cover fills the frame whatever the image's shape */}
      {/* No cover and no thumbnail yet: a plain dark backdrop. */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02] ${
          heroCoverUrl ? "" : "bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-transparent"
        }`}
        style={heroCoverUrl ? { backgroundImage: `url("${heroCoverUrl}")` } : undefined}
      />
      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-[#0a0a0b]/35" />

      {/* Inner Content - Positioned at bottom */}
      <CardContent className="relative z-10 p-5 sm:p-7 md:p-10 lg:p-12 w-full mt-auto">
        <TypographyKicker className="text-xs sm:text-sm font-semibold text-primary font-sans tracking-wide">
          {clientName ? `Delivery for ${clientName}` : "Private delivery"}
        </TypographyKicker>

        {/* md:text-4xl overrides the h1 variant's md:text-7xl, which made tablet titles bigger than desktop ones */}
        <TypographyH1 className="font-heading font-black text-2xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl text-[#f6f3ec] uppercase tracking-tight leading-[1.05] mt-1.5 sm:mt-2 [overflow-wrap:anywhere]">
          {title}
        </TypographyH1>

        {/* 4 Metadata statistics */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-8 lg:gap-14 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/15">
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <TypographySpan className="text-[10px] uppercase tracking-widest text-[#aeaeb4]">
              DELIVERED
            </TypographySpan>
            <TypographySpan className="font-heading font-bold text-xs sm:text-base text-[#f6f3ec]">
              {formattedDate}
            </TypographySpan>
          </div>

          {displayLocation && (
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <TypographySpan className="text-[10px] uppercase tracking-widest text-[#aeaeb4]">
                LOCATION
              </TypographySpan>
              <TypographySpan className="font-heading font-bold text-xs sm:text-base text-[#f6f3ec]">
                {displayLocation}
              </TypographySpan>
            </div>
          )}

          <div className="flex flex-col gap-0.5 sm:gap-1">
            <TypographySpan className="text-[10px] uppercase tracking-widest text-[#aeaeb4]">
              TOTAL SIZE
            </TypographySpan>
            <TypographySpan className="font-heading font-bold text-xs sm:text-base text-primary">
              {formattedTotalSize}
            </TypographySpan>
          </div>

          <div className="flex flex-col gap-0.5 sm:gap-1">
            <TypographySpan className="text-[10px] uppercase tracking-widest text-[#aeaeb4]">
              ASSETS
            </TypographySpan>
            <TypographySpan className="font-heading font-bold text-xs sm:text-base text-[#f6f3ec]">
              {displayAssetCount}
            </TypographySpan>
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-5 sm:mt-6">
          <Button
            onClick={onDownloadAll}
            disabled={!canDownload}
            className={`w-full sm:w-auto rounded-full font-bold text-xs tracking-wider uppercase px-6 py-3.5 sm:py-3 shadow-lg transition-all duration-200 min-h-[44px] h-auto gap-2 justify-center ${
              canDownload
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/30 border border-primary/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                : "bg-white/10 text-zinc-400 border border-white/10 opacity-70 cursor-not-allowed hover:bg-white/10 hover:scale-100"
            }`}
          >
            {canDownload ? (
              <Download className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
            <TypographySpan>
              {canDownload ? "DOWNLOAD ALL" : "DOWNLOADS RESTRICTED"}
            </TypographySpan>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

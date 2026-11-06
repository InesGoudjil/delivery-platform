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
    <Card className="relative rounded-3xl overflow-hidden border border-white/10 min-h-[350px] sm:min-h-[560px] lg:min-h-[600px] flex flex-col justify-end shadow-2xl group bg-transparent py-0 hover:translate-y-0">
      {/* Project Cover Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
        style={{ backgroundImage: `url(${heroCoverUrl})` }}
      />
      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-[#0a0a0b]/35" />

      {/* Inner Content - Positioned at bottom */}
      <CardContent className="relative z-10 p-5 sm:p-10 lg:p-12 w-full mt-auto">
        <TypographyKicker className="text-xs sm:text-sm font-semibold text-primary font-sans tracking-wide">
          Delivery for {clientName || "Prestige Rentals"}
        </TypographyKicker>

        <TypographyH1 className="font-heading font-black text-2xl sm:text-5xl lg:text-6xl text-[#f6f3ec] uppercase tracking-tight leading-[1.05] mt-1.5 sm:mt-2">
          {title}
        </TypographyH1>

        {/* 4 Metadata statistics */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4 sm:gap-14 mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-white/15">
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <TypographySpan className="text-[10px] uppercase tracking-widest text-[#aeaeb4]">
              DELIVERED
            </TypographySpan>
            <TypographySpan className="font-heading font-bold text-xs sm:text-base text-[#f6f3ec]">
              {formattedDate}
            </TypographySpan>
          </div>

          <div className="flex flex-col gap-0.5 sm:gap-1">
            <TypographySpan className="text-[10px] uppercase tracking-widest text-[#aeaeb4]">
              LOCATION
            </TypographySpan>
            <TypographySpan className="font-heading font-bold text-xs sm:text-base text-[#f6f3ec]">
              {displayLocation}
            </TypographySpan>
          </div>

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

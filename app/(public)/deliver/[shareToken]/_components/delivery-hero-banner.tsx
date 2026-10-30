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
  const canDownload = isGlobalDownloadUnlocked || approvedCount > 0;

  return (
    <Card className="relative rounded-3xl overflow-hidden border border-white/10 min-h-[460px] sm:min-h-[560px] lg:min-h-[600px] flex flex-col justify-end shadow-2xl group bg-transparent py-0 hover:translate-y-0">
      {/* Project Cover Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
        style={{ backgroundImage: `url(${heroCoverUrl})` }}
      />
      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-[#0a0a0b]/35" />

      {/* Inner Content - Positioned at bottom */}
      <CardContent className="relative z-10 p-6 sm:p-10 lg:p-12 w-full mt-auto">
        <TypographyKicker className="text-xs sm:text-sm font-semibold text-primary font-sans tracking-wide">
          Delivery for {clientName || "Prestige Rentals"}
        </TypographyKicker>

        <TypographyH1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl text-[#f6f3ec] uppercase tracking-tight leading-[1.02] mt-2">
          {title}
        </TypographyH1>

        {/* 4 Metadata statistics */}
        <div className="flex flex-wrap items-center gap-8 sm:gap-14 mt-6 pt-5 border-t border-white/15">
          <div className="flex flex-col gap-1">
            <TypographySpan className="text-[10px] uppercase tracking-widest text-[#aeaeb4]">
              DELIVERED
            </TypographySpan>
            <TypographySpan className="font-heading font-bold text-sm sm:text-base text-[#f6f3ec]">
              {formattedDate}
            </TypographySpan>
          </div>

          <div className="flex flex-col gap-1">
            <TypographySpan className="text-[10px] uppercase tracking-widest text-[#aeaeb4]">
              LOCATION
            </TypographySpan>
            <TypographySpan className="font-heading font-bold text-sm sm:text-base text-[#f6f3ec]">
              {displayLocation}
            </TypographySpan>
          </div>

          <div className="flex flex-col gap-1">
            <TypographySpan className="text-[10px] uppercase tracking-widest text-[#aeaeb4]">
              TOTAL SIZE
            </TypographySpan>
            <TypographySpan className="font-heading font-bold text-sm sm:text-base text-primary">
              {formattedTotalSize}
            </TypographySpan>
          </div>

          <div className="flex flex-col gap-1">
            <TypographySpan className="text-[10px] uppercase tracking-widest text-[#aeaeb4]">
              ASSETS
            </TypographySpan>
            <TypographySpan className="font-heading font-bold text-sm sm:text-base text-[#f6f3ec]">
              {displayAssetCount}
            </TypographySpan>
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-6">
          <Button
            onClick={onDownloadAll}
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wider uppercase px-6 py-3 shadow-lg shadow-primary/30 border border-primary/40 transition-all duration-200 hover:scale-[1.02] cursor-pointer h-auto gap-2"
          >
            {canDownload ? (
              <Download className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
            <TypographySpan>
              {isGlobalDownloadUnlocked
                ? "DOWNLOAD ALL"
                : approvedCount > 0
                ? `DOWNLOAD APPROVED (${approvedCount})`
                : "DOWNLOADS LOCKED"}
            </TypographySpan>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

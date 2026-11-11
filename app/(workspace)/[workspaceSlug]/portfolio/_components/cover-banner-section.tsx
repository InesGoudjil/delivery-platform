"use client";

import React, { useState, useRef } from "react";
import {
  Film,
  Check,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Upload,
  Layers,
  Monitor,
  Type,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AppImage } from "@/components/ui/app-image";
import { TypographyH3, TypographyH4, TypographySpan } from "@/components/ui/typography";
import { PortfolioHeroCover } from "@/core/entities/portfolio";
import { cn } from "@/lib/utils";

interface CoverBannerSectionProps {
  heroCover: PortfolioHeroCover;
  onHeroCoverChange: (updated: PortfolioHeroCover) => void;
  brandName: string;
  handle: string;
  accent: string;
  logoUrl?: string | null;
  onCustomUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveHero?: () => void;
  isSavingHero?: boolean;
  isHeroDirty?: boolean;
  selectedAssetRatio?: string | null;
  isUploadingMedia?: boolean;
  uploadProgress?: number;
}

export function CoverBannerSection({
  heroCover,
  onHeroCoverChange,
  brandName,
  handle,
  accent,
  logoUrl,
  onCustomUpload,
  onSaveHero,
  isSavingHero = false,
  isHeroDirty = false,
  selectedAssetRatio,
  isUploadingMedia = false,
  uploadProgress = 0,
}: CoverBannerSectionProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isTestSoundMuted, setIsTestSoundMuted] = useState(true);

  const currentAspectRatio =
    heroCover.aspectRatio === "16:9" ||
    heroCover.aspectRatio === "3:1" ||
    heroCover.aspectRatio === "21:9"
      ? heroCover.aspectRatio
      : "21:9";

  const overlayOpacity = heroCover.overlayOpacity ?? 50;
  const isVideo = heroCover.type === "video";
  const showHeroText = heroCover.showHeroText ?? true;

  // Aspect ratio classes aligned with PortfolioHero and DeliveryHeroBanner
  const aspectClass =
    currentAspectRatio === "16:9"
      ? "aspect-[4/5] sm:aspect-[16/9]"
      : currentAspectRatio === "3:1"
      ? "aspect-[4/5] sm:aspect-[24/8]"
      : "aspect-[4/5] sm:aspect-[21/9]";

  return (
    <Card className="rounded-2xl bg-[#141416]/75 backdrop-blur-2xl border border-white/10 p-5 md:p-6 shadow-xl space-y-6 hover:translate-y-0">
      <CardContent className="p-0 space-y-6">
        {/* Stage Header Controls: Preview Label, Sound, Upload, and Save */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Monitor className="size-4 text-primary" />
            <TypographyH3 className="text-sm font-bold text-white font-heading tracking-wide">
              Storefront Hero Banner
            </TypographyH3>
            <Badge
              variant="outline"
              className="bg-black/60 text-[10px] uppercase font-bold text-zinc-300 ml-1"
            >
              {currentAspectRatio} {isVideo ? "Video" : "Still"}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isVideo && heroCover.mediaUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsTestSoundMuted((m) => !m)}
                className="h-8 px-2.5 text-xs gap-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                {isTestSoundMuted ? (
                  <VolumeX className="size-3.5 text-zinc-400" />
                ) : (
                  <Volume2 className="size-3.5 text-primary" />
                )}
                <TypographySpan>{isTestSoundMuted ? "Sound Off" : "Sound On"}</TypographySpan>
              </Button>
            )}

            {onCustomUpload && (
              <>
                <input
                  type="file"
                  ref={uploadInputRef}
                  onChange={onCustomUpload}
                  accept="image/*,video/*"
                  disabled={isUploadingMedia}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingMedia || isSavingHero}
                  onClick={() => uploadInputRef.current?.click()}
                  className="h-8 rounded-full bg-white/5 hover:bg-white/10 border-white/15 text-xs font-semibold gap-1.5 px-3 text-zinc-300 hover:text-white cursor-pointer transition-all disabled:opacity-50"
                >
                  {isUploadingMedia ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      <TypographySpan>
                        {uploadProgress && uploadProgress > 0
                          ? `Uploading ${uploadProgress}%`
                          : "Uploading..."}
                      </TypographySpan>
                    </>
                  ) : (
                    <>
                      <Upload className="size-3.5 text-primary" />
                      <TypographySpan>Upload File</TypographySpan>
                    </>
                  )}
                </Button>
              </>
            )}

            {onSaveHero && (
              <Button
                type="button"
                size="sm"
                disabled={isSavingHero || isUploadingMedia || !isHeroDirty}
                onClick={onSaveHero}
                className={cn(
                  "rounded-full text-xs font-extrabold px-4 h-8 transition-all uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer",
                  isHeroDirty
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                    : "bg-white/10 text-zinc-400 border border-white/10 shadow-none hover:bg-white/15 hover:text-white"
                )}
              >
                {isSavingHero ? (
                  <>
                    <Sparkles className="size-3.5 animate-spin text-primary" />
                    <TypographySpan>Saving...</TypographySpan>
                  </>
                ) : isHeroDirty ? (
                  <>
                    <Sparkles className="size-3.5" />
                    <TypographySpan>Save Hero Banner</TypographySpan>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5 text-emerald-400" />
                    <TypographySpan>Hero Saved</TypographySpan>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 🌟 1. LIVE HERO PREVIEW STAGE (Matches Public PortfolioHero & Delivery Room Banner) */}
        <div className="space-y-2">
          <div
            className={cn(
              "group relative w-full min-h-[380px] sm:min-h-0 rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl select-none transition-all",
              aspectClass
            )}
          >
            {/* Visual Media Layer (Default to Ambient Loop for Videos) */}
            {heroCover.mediaUrl || heroCover.thumbnailUrl ? (
              isVideo ? (
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
                  <video
                    key={heroCover.mediaUrl}
                    src={heroCover.mediaUrl || undefined}
                    poster={heroCover.thumbnailUrl || undefined}
                    autoPlay
                    loop
                    muted={isTestSoundMuted}
                    playsInline
                    className="size-full object-cover"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
                  <AppImage
                    src={heroCover.thumbnailUrl || heroCover.mediaUrl}
                    alt={heroCover.title || brandName}
                    fallbackIcon="image"
                    containerClassName="size-full"
                    className="size-full object-cover"
                  />
                </div>
              )
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center text-zinc-600 gap-2">
                <Film className="size-10 opacity-40 text-primary" />
                <TypographySpan className="text-xs">No cover asset selected</TypographySpan>
              </div>
            )}

            {/* Dynamic Vignette & Overlay Darkness Layer */}
            <div
              className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300"
              style={{ opacity: overlayOpacity / 100 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/20 group-hover:via-black/20 transition-all duration-300 pointer-events-none" />

            {/* Overlaid Badges */}
            <div className="absolute top-4 left-4 sm:top-5 sm:left-5 flex items-center gap-1.5 sm:gap-2 z-10 pointer-events-none">
              <Badge
                variant="outline"
                className="bg-black/80 backdrop-blur-md border-white/20 text-white text-[9px] sm:text-[10px] uppercase font-bold px-2.5 py-1 shadow-lg"
              >
                Storefront Preview
              </Badge>
              <Badge
                variant="orange"
                className="text-[9px] sm:text-[10px] uppercase font-bold px-2.5 py-1 shadow-lg"
              >
                {isVideo ? "Cinematic Video" : "High-Res Still"}
              </Badge>
            </div>

            {/* Interactive Sound Toggle (if video) */}
            {isVideo && heroCover.mediaUrl && (
              <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTestSoundMuted((m) => !m)}
                  className="min-h-[38px] px-3.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border-white/20 text-white text-xs gap-1.5 shadow-xl transition-all cursor-pointer active:scale-95 touch-manipulation"
                >
                  {isTestSoundMuted ? (
                    <>
                      <VolumeX className="size-3.5 text-zinc-400" />
                      <TypographySpan className="hidden sm:inline">Unmute</TypographySpan>
                    </>
                  ) : (
                    <>
                      <Volume2 className="size-3.5 text-primary animate-pulse" />
                      <TypographySpan className="hidden sm:inline">Mute</TypographySpan>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Overlaid Headline & Category Text */}
            {showHeroText && (
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-10 sm:left-10 sm:right-10 z-10 pointer-events-none space-y-2.5 max-w-3xl">
                {(heroCover.category || (isVideo ? "Featured Film" : "Featured Still")) && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="orange"
                      className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 shadow-lg"
                    >
                      {heroCover.category || (isVideo ? "Featured Film" : "Featured Still")}
                    </Badge>
                  </div>
                )}
                <TypographyH3 className="font-heading font-extrabold text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight drop-shadow-md uppercase break-words line-clamp-2">
                  {heroCover.title || brandName}
                </TypographyH3>
              </div>
            )}
          </div>
        </div>

        {/* 🌟 2. HERO CUSTOMIZATION PROPERTIES */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-white/[0.08]">
            <Sliders className="size-4 text-primary" />
            <TypographyH4 className="text-xs font-bold text-white uppercase tracking-wider">
              Reel Display Controls
            </TypographyH4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Aspect Ratio Framing */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                Aspect Ratio Framing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "21:9", label: "21:9", desc: "Cinematic" },
                  { id: "16:9", label: "16:9", desc: "Standard" },
                  { id: "3:1", label: "3:1", desc: "Panoramic" },
                ].map((r) => {
                  const isSelected = currentAspectRatio === r.id;
                  return (
                    <Button
                      key={r.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        onHeroCoverChange({
                          ...heroCover,
                          aspectRatio: r.id as any,
                        })
                      }
                      className={cn(
                        "h-9 flex flex-col justify-center items-center py-1 rounded-xl text-xs font-bold cursor-pointer transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white"
                      )}
                    >
                      <TypographySpan>{r.label}</TypographySpan>
                      <TypographySpan variant="muted" className="text-[9px] font-normal opacity-70">
                        {r.desc}
                      </TypographySpan>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Vignette Darkness Overlay */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Overlay Darkness
                </label>
                <TypographySpan className="text-xs font-bold text-white">
                  {overlayOpacity}%
                </TypographySpan>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[25, 45, 65, 85].map((val) => {
                  const isSelected = overlayOpacity === val;
                  return (
                    <Button
                      key={val}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        onHeroCoverChange({
                          ...heroCover,
                          overlayOpacity: val,
                        })
                      }
                      className={cn(
                        "h-9 rounded-xl text-xs font-semibold cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white"
                      )}
                    >
                      {val}%
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Hero Text & Badge Visibility Switch */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="size-3.5 text-primary" />
                  Hero Text & Badge
                </label>
                <Switch
                  checked={showHeroText}
                  onCheckedChange={(checked) =>
                    onHeroCoverChange({
                      ...heroCover,
                      showHeroText: checked,
                    })
                  }
                  className="cursor-pointer"
                />
              </div>
              <div className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <TypographySpan className="text-zinc-300 font-medium">
                  {showHeroText ? "Headline & category visible" : "Headline & category hidden"}
                </TypographySpan>
                <Badge
                  variant={showHeroText ? "orange" : "outline"}
                  className="text-[10px] uppercase font-bold px-2 py-0.5"
                >
                  {showHeroText ? "Visible" : "Hidden"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Headline & Category Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.08]">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Hero Headline Text</span>
                {!showHeroText && (
                  <span className="text-[10px] text-zinc-500 font-normal lowercase">(hidden on hero)</span>
                )}
              </label>
              <Input
                type="text"
                value={heroCover.title || ""}
                onChange={(e) =>
                  onHeroCoverChange({
                    ...heroCover,
                    title: e.target.value,
                  })
                }
                placeholder={brandName}
                className={cn(
                  "h-9 rounded-xl bg-white/5 border-white/10 text-white text-xs px-3.5 transition-opacity",
                  !showHeroText && "opacity-60"
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Category / Badge Text</span>
                {!showHeroText && (
                  <span className="text-[10px] text-zinc-500 font-normal lowercase">(hidden on hero)</span>
                )}
              </label>
              <Input
                type="text"
                value={heroCover.category || ""}
                onChange={(e) =>
                  onHeroCoverChange({
                    ...heroCover,
                    category: e.target.value,
                  })
                }
                placeholder={isVideo ? "Featured Film" : "Featured Still"}
                className={cn(
                  "h-9 rounded-xl bg-white/5 border-white/10 text-white text-xs px-3.5 transition-opacity",
                  !showHeroText && "opacity-60"
                )}
              />
            </div>
          </div>

          {/* Active Hero Summary & Direct Selection Hint */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Film className="size-3.5 text-primary shrink-0" />
              <span>
                Active Hero:{" "}
                <strong className="text-white font-medium">
                  {heroCover.title || brandName}
                </strong>{" "}
                ({heroCover.category || (isVideo ? "Featured Film" : "Featured Still")})
                {!showHeroText && (
                  <span className="ml-2 text-zinc-500 font-normal text-[11px]">[Text Hidden]</span>
                )}
              </span>
            </div>
            <TypographySpan className="text-[11px] text-zinc-500">
              Click the ✨ button on any item in your showcase below to set it as hero
            </TypographySpan>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

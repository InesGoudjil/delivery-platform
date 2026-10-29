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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AppImage } from "@/components/ui/app-image";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographyH3, TypographyH4, TypographySpan } from "@/components/ui/typography";
import { TiltCard } from "@/components/ui/motion";
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
}

function parseRatioString(ratioStr?: string | null): number | null {
  if (!ratioStr) return null;
  if (ratioStr.includes(":")) {
    const [w, h] = ratioStr.split(":").map(Number);
    if (w && h && !isNaN(w) && !isNaN(h)) return w / h;
  }
  const val = parseFloat(ratioStr);
  if (!isNaN(val) && val > 0) return val;
  return null;
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
}: CoverBannerSectionProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isTestSoundMuted, setIsTestSoundMuted] = useState(true);

  const currentAspectRatio = heroCover.aspectRatio || "asset";
  const overlayOpacity = heroCover.overlayOpacity ?? 50;
  const isVideo = heroCover.type === "video";

  // Compute live aspect ratio
  let ratioValue = 21 / 9;
  if (currentAspectRatio === "16:9") {
    ratioValue = 16 / 9;
  } else if (currentAspectRatio === "3:1") {
    ratioValue = 3 / 1;
  } else if (currentAspectRatio === "21:9") {
    ratioValue = 21 / 9;
  } else if (currentAspectRatio === "asset" || currentAspectRatio === "original") {
    const parsed = parseRatioString(selectedAssetRatio);
    ratioValue = parsed || (isVideo ? 21 / 9 : 16 / 9);
  }

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
              className="bg-black/60  text-[10px] uppercase font-bold text-zinc-300 ml-1"
            >
              {currentAspectRatio === "asset" ? "Native Ratio" : currentAspectRatio}{" "}
              {isVideo ? "Video" : "Still"}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isVideo && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsTestSoundMuted((m) => !m)}
                className="h-8 px-2.5 text-xs  gap-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
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
                  className="hidden"
                />
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => uploadInputRef.current?.click()}
                        className="h-8 rounded-full bg-white/5 hover:bg-white/10 border-white/15 text-xs font-semibold gap-1.5 px-3 text-zinc-300 hover:text-white cursor-pointer"
                      >
                        <Upload className="size-3.5 text-primary" />
                        <TypographySpan>Upload File</TypographySpan>
                      </Button>
                    }
                  />
                  <TooltipContent side="top">
                    Upload custom banner media directly from computer
                  </TooltipContent>
                </Tooltip>
              </>
            )}

            {onSaveHero && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSavingHero || !isHeroDirty}
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
                  }
                />
                <TooltipContent>
                  {isHeroDirty
                    ? "Save hero banner customizations live"
                    : "Hero banner is up to date"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* 🌟 1. LIVE HERO PREVIEW STAGE */}
        <div className="space-y-2">
          <TiltCard tiltIntensity={2} glareIntensity={0.06} className="rounded-2xl overflow-hidden shadow-2xl">
            <AspectRatio ratio={ratioValue} className="relative overflow-hidden bg-black group">
              {/* Visual Media Layer (Default to Ambient Loop for Videos) */}
              {heroCover.mediaUrl ? (
                isVideo ? (
                  <video
                    key={heroCover.mediaUrl}
                    src={heroCover.mediaUrl}
                    poster={heroCover.thumbnailUrl}
                    autoPlay
                    loop
                    muted={isTestSoundMuted}
                    playsInline
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <AppImage
                    src={heroCover.thumbnailUrl || heroCover.mediaUrl}
                    alt={heroCover.title || "Hero Banner"}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center text-zinc-600 gap-2">
                  <Film className="size-10 opacity-40 text-primary" />
                  <TypographySpan className="text-xs ">No cover asset selected</TypographySpan>
                </div>
              )}

              {/* Dynamic Vignette & Overlay Darkness */}
              <div
                className="absolute inset-0 bg-black transition-opacity duration-300 pointer-events-none"
                style={{ opacity: overlayOpacity / 100 }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />

              {/* Overlaid Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10 pointer-events-none">
                <Badge
                  variant="outline"
                  className="bg-black/80 backdrop-blur-md border-white/20 text-white  text-[10px] uppercase font-bold px-2 py-0.5"
                >
                  Live Storefront View
                </Badge>
                <Badge variant="orange" className=" text-[10px] uppercase font-bold px-2.5 py-1 shadow-lg">
                  {isVideo ? "Cinematic Video" : "High-Res Still"}
                </Badge>
              </div>

              {/* Overlaid Headline */}
              <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
                <TypographyH3 className="text-lg sm:text-2xl text-white tracking-tight uppercase drop-shadow-md max-w-xl font-heading">
                  {heroCover.title || brandName}
                </TypographyH3>
              </div>
            </AspectRatio>
          </TiltCard>
        </div>

        {/* 🌟 2. HERO CUSTOMIZATION PROPERTIES (Simplified) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-white/[0.08]">
            <Sliders className="size-4 text-primary" />
            <TypographyH4 className="text-xs font-bold text-white uppercase tracking-wider ">
              Hero Display Controls
            </TypographyH4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Aspect Ratio Framing (Includes Asset Native Aspect) - Hidden per user request */}
            <div className="hidden space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                Aspect Ratio Framing
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "asset", label: "Asset", desc: "Native" },
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
                        "h-9 flex flex-col justify-center items-center py-1 rounded-xl text-xs  font-bold cursor-pointer transition-all",
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
                <TypographySpan className="text-xs  font-bold text-white">
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
                        "h-9 rounded-xl text-xs  font-semibold cursor-pointer",
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
          </div>

          {/* Headline & Category Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.08]">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Hero Headline Text
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
                className="h-9 rounded-xl bg-white/5 border-white/10 text-white text-xs px-3.5"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Category / Badge Text
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
                className="h-9 rounded-xl bg-white/5 border-white/10 text-white text-xs px-3.5"
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
              </span>
            </div>
            <TypographySpan className="text-[11px]  text-zinc-500">
              Click the ✨ button on any item in your showcase below to set it as hero
            </TypographySpan>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

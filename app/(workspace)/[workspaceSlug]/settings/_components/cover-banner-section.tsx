"use client";

import React, { useRef } from "react";
import {
  Image as ImageIcon,
  Check,
  Trash2,
  Eye,
  Camera,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AppImage } from "@/components/ui/app-image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { TiltCard } from "@/components/ui/motion";
import { COVER_PRESETS } from "./constants";

interface CoverBannerSectionProps {
  coverUrl: string;
  isCustomCover: boolean;
  brandName: string;
  handle: string;
  accent: string;
  logoUrl?: string | null;
  onSelectPreset: (url: string) => void;
  onCustomUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveCover: () => void;
  onProfileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CoverBannerSection({
  coverUrl,
  isCustomCover,
  brandName,
  handle,
  accent,
  logoUrl,
  onSelectPreset,
  onCustomUpload,
  onRemoveCover,
  onProfileUpload,
}: CoverBannerSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const initials =
    brandName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PC";

  return (
    <section className="space-y-4">
      <div>
        <Badge variant="orange" className="text-xs font-mono uppercase tracking-wider mb-1 font-semibold">
          Storefront Visuals
        </Badge>
        <TypographyH2 className="text-xl font-bold font-heading text-foreground tracking-tight">
          COVER BANNER &amp; SHOWCASE HERO
        </TypographyH2>
        <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
          Choose a cinematic preset or upload your own 16:9 / 21:9 key visual to display across the top of your public portfolio.
        </TypographyMuted>
      </div>

      <Card className="rounded-2xl border border-border p-5 md:p-6 shadow-sm space-y-6 hover:translate-y-0">
        <CardContent className="p-0 space-y-6">
          {/* Live Cover Preview Stage */}
          <TiltCard tiltIntensity={2} glareIntensity={0.06} className="rounded-2xl overflow-hidden shadow-2xl">
            <AspectRatio ratio={24 / 8} className="relative overflow-hidden bg-black/60 group">
              {coverUrl ? (
                <AppImage
                  src={coverUrl}
                  alt="Storefront Cover Preview"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center text-zinc-600">
                  <ImageIcon className="size-12 opacity-40" />
                </div>
              )}

              {/* Cinematic Gradient Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />

              {/* Top Badge: Active Cover Status */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <Badge variant="outline" className="bg-black/60 backdrop-blur-md border-white/20 text-white font-mono text-[10px] uppercase font-bold px-3 py-1 flex items-center gap-1.5 shadow-lg">
                  <Eye className="size-3 text-primary" />
                  Live Preview
                </Badge>
                {isCustomCover && (
                  <Badge variant="orange" className="font-mono text-[10px] uppercase font-bold px-2.5 py-1 shadow-lg">
                    Custom Upload
                  </Badge>
                )}
              </div>

              {/* Overlaid Filmmaker Profile Identity */}
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative group/avatar">
                    <input
                      type="file"
                      ref={profileInputRef}
                      onChange={onProfileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <div
                            onClick={() => onProfileUpload && profileInputRef.current?.click()}
                            className="size-12 sm:size-14 rounded-2xl overflow-hidden flex items-center justify-center text-black font-extrabold text-base shadow-xl border-2 border-white/25 backdrop-blur-md relative cursor-pointer"
                            style={{ backgroundColor: accent }}
                          >
                            {logoUrl ? (
                              <Avatar className="w-full h-full rounded-2xl">
                                <AvatarImage src={logoUrl} alt={brandName} className="object-cover" />
                                <AvatarFallback className="font-extrabold text-base sm:text-lg">{initials}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <span className="font-extrabold text-base sm:text-lg">{initials}</span>
                            )}
                            {onProfileUpload && (
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                                <Camera className="size-4 text-primary" />
                                <span className="text-[8px] font-bold uppercase mt-0.5 tracking-wider">Photo</span>
                              </div>
                            )}
                          </div>
                        }
                      />
                      <TooltipContent>Click to change profile portrait</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="drop-shadow-md">
                    <div className="font-heading font-extrabold text-base sm:text-lg text-white leading-tight">
                      {brandName}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-300 mt-0.5">
                      cinespace.film/p/{handle}
                    </div>
                  </div>
                </div>

                {/* Reset or Change Button */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border-white/20 text-white text-[11px] font-bold px-3.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg h-7"
                        >
                          <Camera className="size-3 text-primary" />
                          <span>Change Image</span>
                        </Button>
                      }
                    />
                    <TooltipContent>Upload custom cover visual from your computer</TooltipContent>
                  </Tooltip>
                  {isCustomCover && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={onRemoveCover}
                            className="size-7 rounded-full bg-rose-500/20 hover:bg-rose-500/30 backdrop-blur-md border border-rose-500/30 text-rose-300 transition-all flex items-center justify-center cursor-pointer shadow-lg"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        }
                      />
                      <TooltipContent>Reset to cinematic preset</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </AspectRatio>
          </TiltCard>

          {/* Preset Covers Grid & Upload Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                Select from Cinematic Presets
              </span>
              <TypographyMuted className="text-[11px] text-muted-foreground">
                Or upload high-res stills below
              </TypographyMuted>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {COVER_PRESETS.map((preset) => {
                const isSelected = coverUrl === preset.url;
                return (
                  <Tooltip key={preset.id}>
                    <TooltipTrigger
                      render={
                        <div
                          onClick={() => onSelectPreset(preset.url)}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all group cursor-pointer text-left shadow-sm ${
                            isSelected
                              ? "border-primary scale-[1.02] shadow-primary/20 shadow-lg"
                              : "border-border hover:border-primary/40 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <AspectRatio ratio={16 / 9} className="relative overflow-hidden bg-black/40">
                            <AppImage
                              src={preset.url}
                              alt={preset.title}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                            <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-mono font-bold text-white truncate drop-shadow">
                              {preset.title}
                            </span>
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md">
                                <Check className="size-2.5 stroke-[3]" />
                              </div>
                            )}
                          </AspectRatio>
                        </div>
                      }
                    />
                    <TooltipContent>Set &ldquo;{preset.title}&rdquo; as hero banner</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Custom Upload Trigger */}
            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onCustomUpload}
                className="hidden"
              />
              <Card
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-dashed border-border hover:border-primary/60 bg-muted/40 hover:bg-muted/60 p-4 text-center cursor-pointer transition-all flex items-center justify-center gap-3 shadow-none hover:translate-y-0"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary">
                  <Upload className="size-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-foreground">
                    Upload Custom Cover Visual
                  </div>
                  <TypographyMuted className="text-[11px] text-muted-foreground">
                    PNG, JPG, or WebP up to 10MB (recommended 2560×1080 or 1920×1080)
                  </TypographyMuted>
                </div>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

"use client";

import React, { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Play,
  Film,
  Check,
  Eye,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Search,
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
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { TiltCard } from "@/components/ui/motion";
import { PortfolioHeroCover } from "@/core/entities/portfolio";
import { SelectableCoverAsset } from "@/lib/portfolio-data";

interface CoverBannerSectionProps {
  heroCover: PortfolioHeroCover;
  onHeroCoverChange: (updated: PortfolioHeroCover) => void;
  availableAssets: SelectableCoverAsset[];
  brandName: string;
  handle: string;
  accent: string;
  logoUrl?: string | null;
  onCustomUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CoverBannerSection({
  heroCover,
  onHeroCoverChange,
  availableAssets,
  brandName,
  handle,
  accent,
  logoUrl,
  onCustomUpload,
}: CoverBannerSectionProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [filterType, setFilterType] = useState<"all" | "video" | "still">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTestSoundMuted, setIsTestSoundMuted] = useState(true);

  // Filter available assets
  const filteredAssets = availableAssets.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title?.toLowerCase().includes(q);
      const matchProject = a.projectName?.toLowerCase().includes(q);
      const matchCategory = a.category?.toLowerCase().includes(q);
      if (!matchTitle && !matchProject && !matchCategory) return false;
    }
    return true;
  });

  const videoCount = availableAssets.filter((a) => a.type === "video").length;
  const stillCount = availableAssets.filter((a) => a.type === "still").length;

  const currentAspectRatio = heroCover.aspectRatio || "21:9";
  const ratioValue =
    currentAspectRatio === "21:9"
      ? 21 / 9
      : currentAspectRatio === "16:9"
      ? 16 / 9
      : 24 / 8; // 3:1 banner

  const overlayOpacity = heroCover.overlayOpacity ?? 50;
  const isVideo = heroCover.type === "video";
  const videoBehavior = heroCover.videoBehavior || "ambient_loop";

  const handleSelectAsset = (asset: SelectableCoverAsset) => {
    onHeroCoverChange({
      ...heroCover,
      assetId: asset.id,
      type: asset.type,
      mediaUrl: asset.url,
      thumbnailUrl: asset.thumbnailUrl,
      title: asset.title,
      category: asset.category || (asset.type === "video" ? "Featured Film" : "Featured Still"),
      aspectRatio: heroCover.aspectRatio || (asset.type === "video" ? "21:9" : "16:9"),
    });
  };

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
          Select any film or photo still from your portfolio assets to headline your public storefront. Customize video playback, aspect ratio, and lighting vignette.
        </TypographyMuted>
      </div>

      <Card className="rounded-2xl border border-border p-5 md:p-6 shadow-sm space-y-8 hover:translate-y-0">
        <CardContent className="p-0 space-y-8">
          {/* 🌟 1. LIVE HERO PREVIEW STAGE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Monitor className="size-3.5 text-primary" />
                Live Hero Stage Preview
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-black/60 font-mono text-[10px] uppercase font-bold text-zinc-300">
                  {currentAspectRatio} {isVideo ? "Video Reel" : "Photo Still"}
                </Badge>
                {isVideo && videoBehavior === "ambient_loop" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsTestSoundMuted((m) => !m)}
                    className="h-6 px-2 text-[10px] font-mono gap-1 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    {isTestSoundMuted ? <VolumeX className="size-3" /> : <Volume2 className="size-3 text-primary" />}
                    <span>{isTestSoundMuted ? "Sound Muted" : "Sound Playing"}</span>
                  </Button>
                )}
              </div>
            </div>

            <TiltCard tiltIntensity={2} glareIntensity={0.06} className="rounded-2xl overflow-hidden shadow-2xl">
              <AspectRatio ratio={ratioValue} className="relative overflow-hidden bg-black group">
                {/* Visual Media Layer */}
                {heroCover.mediaUrl ? (
                  isVideo && videoBehavior === "ambient_loop" ? (
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
                    <span className="text-xs font-mono">No cover asset selected</span>
                  </div>
                )}

                {/* Dynamic Vignette & Overlay Darkness */}
                <div
                  className="absolute inset-0 bg-black transition-opacity duration-300 pointer-events-none"
                  style={{ opacity: overlayOpacity / 100 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />

                {/* Interactive Center Play Trigger (if click-to-play) */}
                {isVideo && videoBehavior === "click_to_play" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="size-14 sm:size-16 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-2xl">
                      <Play className="size-6 sm:size-7 fill-current ml-0.5 text-primary" />
                    </div>
                  </div>
                )}

                {/* Top Badge: Active Cover Status */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <Badge variant="outline" className="bg-black/70 backdrop-blur-md border-white/20 text-white font-mono text-[10px] uppercase font-bold px-3 py-1 flex items-center gap-1.5 shadow-lg">
                    <Eye className="size-3 text-primary" />
                    Live Storefront View
                  </Badge>
                  <Badge variant="orange" className="font-mono text-[10px] uppercase font-bold px-2.5 py-1 shadow-lg">
                    {isVideo ? "Cinematic Video" : "High-Res Still"}
                  </Badge>
                </div>

                {/* Overlaid Headline - Minimal Title Only */}
                <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
                  <div className="font-heading font-extrabold text-lg sm:text-2xl text-white tracking-tight uppercase drop-shadow-md max-w-xl">
                    {heroCover.title || brandName}
                  </div>
                </div>
              </AspectRatio>
            </TiltCard>
          </div>

          {/* 🌟 2. HERO CUSTOMIZATION PROPERTIES */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border space-y-5">
            <div className="flex items-center gap-2 pb-1 border-b border-border/70">
              <Sliders className="size-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                Hero Display Controls &amp; Properties
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Aspect Ratio Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
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
                        className={`h-9 flex flex-col justify-center items-center py-1 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                          isSelected ? "bg-primary text-primary-foreground shadow-md" : "bg-card hover:bg-card/80"
                        }`}
                      >
                        <span>{r.label}</span>
                        <span className="text-[9px] font-sans font-normal opacity-70">{r.desc}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Video Playback Mode (only active for video) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Play className="size-3.5 text-primary" />
                  Video Playback Behavior
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={videoBehavior === "ambient_loop" ? "default" : "outline"}
                    size="sm"
                    disabled={!isVideo}
                    onClick={() =>
                      onHeroCoverChange({
                        ...heroCover,
                        videoBehavior: "ambient_loop",
                      })
                    }
                    className={`h-9 flex flex-col justify-center items-center py-1 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      videoBehavior === "ambient_loop" && isVideo
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card hover:bg-card/80"
                    } ${!isVideo ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span>Ambient Loop</span>
                    <span className="text-[9px] font-normal opacity-75">Auto-playing reel</span>
                  </Button>
                  <Button
                    type="button"
                    variant={videoBehavior === "click_to_play" ? "default" : "outline"}
                    size="sm"
                    disabled={!isVideo}
                    onClick={() =>
                      onHeroCoverChange({
                        ...heroCover,
                        videoBehavior: "click_to_play",
                      })
                    }
                    className={`h-9 flex flex-col justify-center items-center py-1 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      videoBehavior === "click_to_play" && isVideo
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card hover:bg-card/80"
                    } ${!isVideo ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span>Click to Play</span>
                    <span className="text-[9px] font-normal opacity-75">Poster + modal</span>
                  </Button>
                </div>
              </div>

              {/* Vignette Darkness Overlay */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" />
                    Overlay Darkness
                  </label>
                  <span className="text-xs font-mono font-bold text-foreground">{overlayOpacity}%</span>
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
                        className={`h-9 rounded-xl text-xs font-mono font-semibold cursor-pointer ${
                          isSelected ? "bg-primary text-primary-foreground shadow-sm" : "bg-card"
                        }`}
                      >
                        {val}%
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Custom Headline & Category Badge Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/70">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  className="h-9 rounded-xl bg-muted/60 border-border text-foreground text-xs px-3.5"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  className="h-9 rounded-xl bg-muted/60 border-border text-foreground text-xs px-3.5"
                />
              </div>
            </div>
          </div>

          {/* 🌟 3. SELECT FROM PORTFOLIO ASSETS */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Film className="size-3.5 text-primary" />
                  Select From Your Portfolio Assets
                </span>
                <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
                  Click any asset below to set it as your storefront cover.
                </TypographyMuted>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl bg-muted/50 p-1 border border-border">
                  <Button
                    type="button"
                    size="sm"
                    variant={filterType === "all" ? "default" : "ghost"}
                    onClick={() => setFilterType("all")}
                    className="h-7 text-xs rounded-lg px-2.5 font-semibold"
                  >
                    All ({availableAssets.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={filterType === "video" ? "default" : "ghost"}
                    onClick={() => setFilterType("video")}
                    className="h-7 text-xs rounded-lg px-2.5 font-semibold"
                  >
                    Films ({videoCount})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={filterType === "still" ? "default" : "ghost"}
                    onClick={() => setFilterType("still")}
                    className="h-7 text-xs rounded-lg px-2.5 font-semibold"
                  >
                    Stills ({stillCount})
                  </Button>
                </div>

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
                            className="h-8 rounded-xl bg-muted/50 hover:bg-muted border-border text-xs font-semibold gap-1.5 px-3"
                          >
                            <Upload className="size-3 text-primary" />
                            <span>Upload File</span>
                          </Button>
                        }
                      />
                      <TooltipContent side="top">
                        Upload custom visual directly from computer
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets by title, project, or category..."
                className="h-9 pl-9 rounded-xl bg-muted/40 border-border text-xs text-foreground"
              />
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
              {filteredAssets.map((asset) => {
                const isSelected =
                  heroCover.assetId === asset.id ||
                  heroCover.mediaUrl === asset.url ||
                  heroCover.thumbnailUrl === asset.thumbnailUrl;
                const isAssetVideo = asset.type === "video";

                return (
                  <Card
                    key={asset.id}
                    onClick={() => handleSelectAsset(asset)}
                    className={`group relative rounded-xl overflow-hidden cursor-pointer border transition-all p-0 bg-zinc-950 hover:scale-[1.02] ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/40 shadow-lg"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    <AspectRatio ratio={16 / 9} className="relative overflow-hidden bg-zinc-900">
                      <AppImage
                        src={asset.thumbnailUrl}
                        alt={asset.title}
                        fallbackIcon={isAssetVideo ? "film" : "image"}
                        containerClassName="size-full"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Type Badge */}
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <Badge
                          variant="outline"
                          className="bg-black/70 backdrop-blur-md border-white/20 text-white font-mono text-[9px] uppercase font-bold px-1.5 py-0 flex items-center gap-1 shadow-md"
                        >
                          {isAssetVideo ? <Film className="size-2.5 text-primary" /> : <ImageIcon className="size-2.5 text-primary" />}
                          {isAssetVideo ? asset.duration || "Film" : "Still"}
                        </Badge>
                      </div>

                      {/* Active Selected Checkmark */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 z-10 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border border-white/20">
                          <Check className="size-3 stroke-[3]" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                      <div className="absolute bottom-1.5 left-2 right-2 z-10">
                        <div className="font-semibold text-white text-xs truncate drop-shadow-sm">
                          {asset.title}
                        </div>
                        {asset.projectName && (
                          <div className="text-[10px] text-zinc-400 font-mono truncate">
                            {asset.projectName}
                          </div>
                        )}
                      </div>
                    </AspectRatio>
                  </Card>
                );
              })}

              {filteredAssets.length === 0 && (
                <div className="col-span-full py-10 text-center space-y-2 rounded-xl border border-dashed border-border bg-muted/20">
                  <Film className="size-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs text-muted-foreground font-mono">
                    No matching portfolio assets found.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

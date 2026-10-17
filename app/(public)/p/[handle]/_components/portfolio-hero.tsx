"use client";

import React, { useState } from "react";
import { Play, Film, Image as ImageIcon, Volume2, VolumeX } from "lucide-react";
import { FilmmakerProfile, PublicFeaturedItem, PortfolioProject, PortfolioAsset } from "@/lib/portfolio-data";
import { HeroPreviewTrigger } from "./portfolio-buttons";
import { AppImage } from "@/components/ui/app-image";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TypographyH2, TypographyLead } from "@/components/ui/typography";

interface PortfolioHeroProps {
  profile: FilmmakerProfile;
  primaryFeatured?: PublicFeaturedItem | null;
  featuredProject?: PortfolioProject | null;
  featuredAsset?: PortfolioAsset | null;
}

export function PortfolioHero({
  profile,
  primaryFeatured,
  featuredProject,
  featuredAsset,
}: PortfolioHeroProps) {
  const [isMuted, setIsMuted] = useState(true);

  const heroCover = profile.heroCover;

  // Resolve cover media & type
  const isCoverVideo = heroCover ? heroCover.type === "video" : primaryFeatured?.type === "film" || Boolean(primaryFeatured?.videoUrl);
  const isCoverStill = heroCover ? heroCover.type === "still" : primaryFeatured?.type === "still";
  const videoBehavior = heroCover?.videoBehavior || "ambient_loop";
  const mediaUrl = heroCover?.mediaUrl || primaryFeatured?.videoUrl || "";
  const bgImage =
    heroCover?.thumbnailUrl ||
    heroCover?.mediaUrl ||
    profile.heroImage ||
    primaryFeatured?.thumbnailUrl ||
    featuredProject?.coverImage ||
    "/images/hero.jpg";

  // Aspect ratio classes
  const aspectRatio = heroCover?.aspectRatio || "21:9";
  const aspectClass =
    aspectRatio === "16:9"
      ? "aspect-[16/9]"
      : aspectRatio === "3:1"
      ? "aspect-[16/9] sm:aspect-[24/8]"
      : "aspect-[16/9] sm:aspect-[21/9]";

  const overlayOpacity = heroCover?.overlayOpacity ?? 50;

  const badgeTitle =
    heroCover?.category ||
    (primaryFeatured
      ? primaryFeatured.type === "project"
        ? "Featured Project"
        : primaryFeatured.type === "film"
        ? "Featured Film"
        : "Featured Still"
      : featuredProject
      ? "Featured Project"
      : "Cinematic Portfolio");

  const heroTitle = heroCover?.title || primaryFeatured?.title || featuredProject?.title || profile.name;
  const heroDesc =
    heroCover?.description ||
    primaryFeatured?.project?.desc ||
    primaryFeatured?.asset?.desc ||
    featuredProject?.desc ||
    profile.bio ||
    profile.tagline;

  const isAmbientVideo = isCoverVideo && videoBehavior === "ambient_loop" && Boolean(mediaUrl);

  return (
    <section className="relative">
      <HeroPreviewTrigger
        className={`group relative w-full ${aspectClass} rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl cursor-pointer block select-none`}
      >
        {/* Visual Media Layer: Ambient Video or Image */}
        {isAmbientVideo ? (
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
            <video
              src={mediaUrl}
              poster={bgImage}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="size-full object-cover"
            />
          </div>
        ) : (
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
            <AppImage
              src={bgImage}
              alt={heroTitle}
              fallbackIcon={isCoverVideo ? "film" : "image"}
              containerClassName="size-full"
              className="size-full object-cover"
            />
          </div>
        )}

        {/* Dynamic Vignette & Darkness Layer */}
        <div
          className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300"
          style={{ opacity: overlayOpacity / 100 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/20 group-hover:via-black/20 transition-all duration-300 pointer-events-none" />

        {/* Interactive sound toggle button if ambient video */}
        {isAmbientVideo && (
          <div className="absolute top-5 right-5 z-20">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted((prev) => !prev);
              }}
              className="h-8 px-3 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border-white/20 text-white font-mono text-xs gap-1.5 shadow-xl transition-all cursor-pointer"
            >
              {isMuted ? (
                <>
                  <VolumeX className="size-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 className="size-3.5 text-primary animate-pulse" />
                  <span className="hidden sm:inline">Mute</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Center play icon (if interactive click-to-play video or still) */}
        {(!isAmbientVideo || videoBehavior === "click_to_play") && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-16 sm:size-20 rounded-full bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
              {isCoverStill ? (
                <ImageIcon className="size-7 sm:size-8 transition-transform" />
              ) : (
                <Play className="size-7 sm:size-8 fill-current ml-1 transition-transform" />
              )}
            </div>
          </div>
        )}

        {/* Bottom-left information */}
        <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pointer-events-none">
          <div className="space-y-2.5 max-w-xl text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="default"
                className="font-extrabold uppercase tracking-wider text-primary-foreground bg-primary px-3 py-1 text-[11px] shadow-md"
              >
                {badgeTitle}
              </Badge>

              {/* Brand Logo or Avatar Pill */}
              {profile.logoUrl ? (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 shadow-sm">
                  <div className="size-4 rounded overflow-hidden shrink-0">
                    <img src={profile.logoUrl} alt={profile.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="font-semibold text-xs text-zinc-200">{profile.name}</span>
                </div>
              ) : profile.avatar ? (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 shadow-sm">
                  <Avatar size="sm" className="size-4 ring-1 ring-white/20">
                    <AvatarImage src={profile.avatar} alt={profile.name} />
                    <AvatarFallback className="text-[8px] bg-zinc-800 text-white">
                      {profile.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-xs text-zinc-200">{profile.name}</span>
                </div>
              ) : null}
            </div>

            <TypographyH2 className="font-heading font-extrabold text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight drop-shadow-md uppercase">
              {heroTitle}
            </TypographyH2>

            <TypographyLead className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed drop-shadow-sm line-clamp-2 max-w-lg">
              {heroDesc}
            </TypographyLead>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-300 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shrink-0 shadow-lg">
            {isCoverStill ? (
              <>
                <ImageIcon className="size-3.5 text-primary" />
                <span>{heroCover?.category || primaryFeatured?.category || "Photo Gallery"}</span>
              </>
            ) : (
              <>
                <Film className="size-3.5 text-primary" />
                <span>
                  {primaryFeatured?.asset?.resolution || "4K 60fps"} ·{" "}
                  {heroCover?.category || "Cinematic Reel"}
                </span>
              </>
            )}
          </div>
        </div>
      </HeroPreviewTrigger>
    </section>
  );
}

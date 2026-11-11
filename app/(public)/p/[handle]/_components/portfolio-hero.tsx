"use client";

import React, { useState } from "react";
import { Play, Image as ImageIcon, Volume2, VolumeX } from "lucide-react";
import { FilmmakerProfile, PublicFeaturedItem, PortfolioProject, PortfolioAsset } from "@/lib/portfolio-data";
import { HeroPreviewTrigger } from "./portfolio-buttons";
import { AppImage } from "@/components/ui/app-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypographyH2, TypographySpan } from "@/components/ui/typography";

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
      ? "aspect-[4/5] sm:aspect-[16/9]"
      : aspectRatio === "3:1"
      ? "aspect-[4/5] sm:aspect-[24/8]"
      : "aspect-[4/5] sm:aspect-[21/9]";

  const overlayOpacity = heroCover?.overlayOpacity ?? 50;

  const showHeroText = heroCover?.showHeroText ?? true;
  const heroCategory =
    heroCover?.category ||
    primaryFeatured?.category ||
    (isCoverVideo ? "Featured Film" : "Featured Still");
  const heroTitle = heroCover?.title || primaryFeatured?.title || featuredProject?.title || profile.name;

  const isAmbientVideo = isCoverVideo && videoBehavior === "ambient_loop" && Boolean(mediaUrl);

  return (
    <section className="relative">
      <HeroPreviewTrigger
        className={`group relative w-full ${aspectClass} min-h-[380px] sm:min-h-0 rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl cursor-pointer block select-none`}
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
          <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted((prev) => !prev);
              }}
              className="min-h-[38px] px-3.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border-white/20 text-white text-xs gap-1.5 shadow-xl transition-all cursor-pointer active:scale-95 touch-manipulation"
            >
              {isMuted ? (
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

        {/* Hero Information - Headline and Category / Badge Text */}
        {showHeroText && (
          <div className="absolute bottom-5 left-5 right-5 sm:bottom-10 sm:left-10 sm:right-10 z-10 pointer-events-none space-y-2.5 max-w-3xl">
            {heroCategory && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="orange"
                  className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 shadow-lg"
                >
                  {heroCategory}
                </Badge>
              </div>
            )}
            <TypographyH2 className="font-heading font-extrabold text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight drop-shadow-md uppercase break-words line-clamp-2">
              {heroTitle}
            </TypographyH2>
          </div>
        )}
      </HeroPreviewTrigger>
    </section>
  );
}

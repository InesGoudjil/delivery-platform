import React from "react";
import { Play, Film, Image as ImageIcon } from "lucide-react";
import { FilmmakerProfile, PublicFeaturedItem, PortfolioProject, PortfolioAsset } from "@/lib/portfolio-data";
import { HeroPreviewTrigger } from "./portfolio-buttons";

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
  const bgImage =
    primaryFeatured?.thumbnailUrl ||
    featuredProject?.coverImage ||
    profile.heroImage ||
    "/images/hero.jpg";

  const isStill = primaryFeatured?.type === "still";
  const badgeTitle = primaryFeatured
    ? primaryFeatured.type === "project"
      ? "Featured Project"
      : primaryFeatured.type === "film"
      ? "Featured Film"
      : "Featured Still"
    : featuredProject
    ? "Featured Project"
    : "Filmmaker Portfolio";

  const heroTitle = primaryFeatured?.title || featuredProject?.title || profile.name;
  const heroDesc =
    primaryFeatured?.project?.desc ||
    primaryFeatured?.asset?.desc ||
    featuredProject?.desc ||
    profile.bio ||
    profile.tagline;

  return (
    <section className="relative">
      <HeroPreviewTrigger className="group relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl cursor-pointer">
        {/* Background cover image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ backgroundImage: `url(${bgImage})` }}
        />

        {/* Dark gradient & cinematic vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20 group-hover:via-black/20 transition-all duration-300" />

        {/* Center play / view icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-16 sm:size-20 rounded-full bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-hover:bg-[#f5551d] group-hover:text-black group-hover:border-[#f5551d] transition-all duration-300">
            {isStill ? (
              <ImageIcon className="size-7 sm:size-8 transition-transform" />
            ) : (
              <Play className="size-7 sm:size-8 fill-current ml-1 transition-transform" />
            )}
          </div>
        </div>

        {/* Bottom-left information */}
        <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5551d] text-black text-[11px] font-extrabold uppercase tracking-wider">
              <span>{badgeTitle}</span>
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight drop-shadow-md uppercase">
              {heroTitle}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed drop-shadow-sm line-clamp-2">
              {heroDesc}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-300 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
            {isStill ? (
              <>
                <ImageIcon className="size-3.5 text-[#f5551d]" />
                <span>{primaryFeatured?.category || "High Resolution Still"}</span>
              </>
            ) : (
              <>
                <Film className="size-3.5 text-[#f5551d]" />
                <span>
                  {primaryFeatured?.asset?.resolution || "4K 60fps"} ·{" "}
                  {primaryFeatured?.type === "project" ? "Featured Project" : "Cinematic Cut"}
                </span>
              </>
            )}
          </div>
        </div>
      </HeroPreviewTrigger>
    </section>
  );
}

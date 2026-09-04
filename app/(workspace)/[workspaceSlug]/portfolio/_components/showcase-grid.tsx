"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Star, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppImage } from "@/components/ui/app-image";
import { toggleFeaturedItemAction } from "@/app/actions/portfolio";
import { PortfolioAppearance } from "@/core/entities/portfolio";
import { PortfolioItem } from "../portfolio-client";

interface ShowcaseGridProps {
  portfolioId: string;
  workspaceSlug: string;
  projects: PortfolioItem[];
  initialFeaturedIds: string[];
  appearance: PortfolioAppearance;
  showFlash: (msg: string) => void;
}

export function ShowcaseGrid({
  portfolioId,
  workspaceSlug,
  projects,
  initialFeaturedIds,
  appearance,
  showFlash,
}: ShowcaseGridProps) {
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"all" | "films" | "stills" | "projects">("all");
  const [featuredIds, setFeaturedIds] = useState<string[]>(
    initialFeaturedIds.length > 0
      ? initialFeaturedIds
      : projects.map((p) => p.id)
  );

  const handleToggleFeature = (item: PortfolioItem) => {
    const isCurrentlyFeatured = featuredIds.includes(item.id);
    const updatedIds = isCurrentlyFeatured
      ? featuredIds.filter((fId) => fId !== item.id)
      : [...featuredIds, item.id];

    setFeaturedIds(updatedIds);

    startTransition(async () => {
      const itemType = item.type === "project" ? "project" : "asset";
      await toggleFeaturedItemAction(
        portfolioId,
        item.id,
        itemType,
        !isCurrentlyFeatured
      );
      showFlash(
        isCurrentlyFeatured
          ? `Removed "${item.title}" from featured reel`
          : `Pinned "${item.title}" to featured reel`
      );
    });
  };

  const filteredProjects = projects.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "projects") return p.type === "project";
    if (activeTab === "films") return p.type === "film";
    if (activeTab === "stills") return p.type === "still";
    return true;
  });

  // Dynamic Grid Classes based on Card Size
  const cardSize = appearance.cardSize || "M";
  const gridClasses =
    cardSize === "S"
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
      : cardSize === "M"
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6";

  // Dynamic Aspect Ratio classes
  const aspectRatio = appearance.aspectRatio || "16:9";
  const aspectClasses =
    aspectRatio === "16:9"
      ? "aspect-video"
      : aspectRatio === "9:16"
      ? "aspect-[9/16]"
      : aspectRatio === "1:1"
      ? "aspect-square"
      : "aspect-[4/3]";

  return (
    <section className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-sm font-bold text-[#f6f3ec]">
          Portfolio work — shown to visitors
        </div>

        {/* Filter Pills: All / Projects / Films / Stills */}
        <div className="flex items-center bg-[#0c0c0e] p-1 rounded-xl border border-white/10 self-start">
          {(["all", "projects", "films", "stills"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-[#f5551d] text-black font-bold"
                  : "text-[#8e8e93] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Showcase Grid */}
      <div className={`grid ${gridClasses}`}>
        {filteredProjects.map((item) => {
          const isFeatured = featuredIds.includes(item.id);

          return (
            <div
              key={item.id}
              className="group relative rounded-2xl bg-[#0c0c0e] border border-white/[0.08] overflow-hidden transition-all duration-300 hover:border-white/20 hover:shadow-2xl shadow-black/40"
            >
              <AppImage
                src={item.thumbnailUrl}
                alt={item.title}
                objectFit={appearance.thumbnailScale === "fit" ? "contain" : "cover"}
                fallbackIcon={item.type === "still" ? "image" : "film"}
                containerClassName={`relative w-full ${aspectClasses}`}
              />

              <div className="absolute top-2.5 right-2.5 z-10">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-black/60 backdrop-blur-md text-[#f6f3ec] border border-white/10">
                  {item.type === "project"
                    ? `${item.assetCount} assets`
                    : item.type === "still"
                    ? "Photo Gallery"
                    : "Film Cut"}
                </span>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleToggleFeature(item)}
                  className={`rounded-full size-8 p-0 cursor-pointer ${
                    isFeatured
                      ? "bg-[#f5551d] text-black hover:bg-[#ff8a45]"
                      : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
                  }`}
                  title={isFeatured ? "Unfeature" : "Feature"}
                >
                  <Star className="size-4 fill-current" />
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="rounded-full size-8 p-0 bg-white text-black hover:bg-white/90 shadow-md cursor-pointer"
                  title="View Project"
                >
                  <Link href={`/${workspaceSlug}/deliveries/${item.id}`}>
                    <Play className="size-3.5 fill-black ml-0.5" />
                  </Link>
                </Button>
              </div>

              {/* Bottom Label Overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3.5 pt-8 flex flex-col justify-end">
                <span className="text-xs font-bold text-white tracking-tight leading-snug truncate">
                  {item.title}
                </span>
                {appearance.showClientInfo && (
                  <span className="text-[10px] text-[#9a9a9f] font-mono truncate">
                    {item.category}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

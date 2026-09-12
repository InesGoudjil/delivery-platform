"use client";

import React, { useState, useTransition } from "react";
import { Star, Play } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { toggleFeaturedItemAction } from "@/app/actions/portfolio";
import { PortfolioItem } from "../portfolio-client";

interface FeaturedReelProps {
  portfolioId: string;
  initialProjects: PortfolioItem[];
  initialFeaturedIds: string[];
  showFlash: (msg: string) => void;
  onSelectItem?: (item: PortfolioItem) => void;
}

export function FeaturedReel({
  portfolioId,
  initialProjects,
  initialFeaturedIds,
  showFlash,
  onSelectItem,
}: FeaturedReelProps) {

  const [isPending, startTransition] = useTransition();

  const [featuredIds, setFeaturedIds] = useState<string[]>(
    initialFeaturedIds.length > 0
      ? initialFeaturedIds
      : initialProjects.map((p) => p.id)
  );

  const featuredItems = initialProjects.filter((p) => featuredIds.includes(p.id));

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

  return (
    <section
      className="rounded-2xl bg-[#141416]/75 backdrop-blur-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-3"
      style={{
        boxShadow:
          "0 20px 40px -20px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white font-heading tracking-wide">
          Featured on your Work page
        </h2>
        <span className="text-[11px] text-zinc-500 font-mono">
          {featuredItems.length} featured
        </span>
      </div>

      <div className="flex items-center gap-3.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-white/10">
        {featuredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => (onSelectItem ? onSelectItem(item) : handleToggleFeature(item))}
            className="relative w-36 h-20 sm:w-44 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-white/10 hover:border-white/30 cursor-pointer transition-all duration-200 group hover:scale-[1.02] bg-[#0c0c0e]"
          >
            <AppImage
              src={item.thumbnailUrl}
              alt={item.title}
              fallbackIcon={item.type === "still" ? "image" : "film"}
              containerClassName="size-full"
            />

            {/* Unpin Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFeature(item);
              }}
              className="absolute top-1.5 right-1.5 z-10 size-6 rounded-full bg-black/60 hover:bg-[#f5551d] text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-md"
              title="Unpin from featured reel"
            >
              <Star className="size-3 fill-current text-[#f5551d] group-hover:text-white" />
            </button>

            {/* Play overlay for video/project */}
            {(item.type === "film" || item.type === "project") && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="size-8 rounded-full bg-black/60 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg">
                  <Play className="size-3.5 ml-0.5 fill-current" />
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-2.5 pointer-events-none">
              <span className="text-xs font-bold text-white truncate max-w-full font-heading leading-tight">
                {item.title}
              </span>
            </div>
          </div>
        ))}
        {featuredItems.length === 0 && (
          <div className="text-xs text-zinc-500 italic py-4">
            No items currently featured. Star any item in the portfolio grid below to feature it here.
          </div>
        )}
      </div>
    </section>
  );
}

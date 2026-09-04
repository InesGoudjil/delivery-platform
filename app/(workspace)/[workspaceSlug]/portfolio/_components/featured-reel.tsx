"use client";

import React, { useState, useTransition } from "react";
import { AppImage } from "@/components/ui/app-image";
import { toggleFeaturedItemAction } from "@/app/actions/portfolio";
import { PortfolioItem } from "../portfolio-client";

interface FeaturedReelProps {
  portfolioId: string;
  initialProjects: PortfolioItem[];
  initialFeaturedIds: string[];
  showFlash: (msg: string) => void;
}

export function FeaturedReel({
  portfolioId,
  initialProjects,
  initialFeaturedIds,
  showFlash,
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
    <section className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-[#f6f3ec]">
          Featured on your Work page ({featuredItems.length})
        </div>
        <span className="text-[11px] text-[#71717a] font-mono">
          Click star icon on any card below to pin/unpin
        </span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-white/10">
        {featuredItems.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => handleToggleFeature(item)}
            className={`relative size-20 sm:w-28 sm:h-18 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer transition-all duration-200 group hover:scale-[1.03] ${
              idx === featuredItems.length - 1
                ? "border-[#f5551d] shadow-md shadow-[#f5551d]/20"
                : "border-white/10 hover:border-white/30"
            }`}
          >
            <AppImage
              src={item.thumbnailUrl}
              alt={item.title}
              fallbackIcon={item.type === "still" ? "image" : "film"}
              containerClassName="size-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
              <span className="text-[10px] font-bold text-white truncate max-w-full leading-tight">
                {item.title}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

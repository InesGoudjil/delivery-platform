"use client";

import React, { useState, useTransition } from "react";
import { Star, Play, Film, Image as ImageIcon, FolderKanban, Maximize2 } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { toggleFeaturedItemAction } from "@/app/actions/portfolio";
import { PortfolioAppearance } from "@/core/entities/portfolio";
import { PortfolioItem } from "../portfolio-client";

interface ShowcaseGridProps {
  portfolioId: string;
  workspaceSlug: string;
  projects: PortfolioItem[];
  initialFeaturedIds: string[];
  featuredIds?: string[];
  onToggleFeature?: (item: PortfolioItem) => void;
  appearance: PortfolioAppearance;
  showFlash: (msg: string) => void;
  onSelectItem: (item: PortfolioItem) => void;
}


export function ShowcaseGrid({
  portfolioId,
  workspaceSlug,
  projects,
  initialFeaturedIds,
  featuredIds: propFeaturedIds,
  onToggleFeature: propOnToggleFeature,
  appearance,
  showFlash,
  onSelectItem,
}: ShowcaseGridProps) {
  const [isPending, startTransition] = useTransition();

  // Filter tabs matching Screenshot 4: "Films", "Stills", "Projects"
  const [activeTab, setActiveTab] = useState<"films" | "stills" | "projects">("films");
  const [localFeaturedIds, setLocalFeaturedIds] = useState<string[]>(initialFeaturedIds);
  const featuredIds = propFeaturedIds ?? localFeaturedIds;

  const handleToggleFeature = (item: PortfolioItem) => {
    if (propOnToggleFeature) {
      propOnToggleFeature(item);
      return;
    }

    const isCurrentlyFeatured = featuredIds.includes(item.id);
    const updatedIds = isCurrentlyFeatured
      ? featuredIds.filter((fId) => fId !== item.id)
      : [...featuredIds, item.id];

    setLocalFeaturedIds(updatedIds);

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
    if (activeTab === "films") return p.type === "film";
    if (activeTab === "stills") return p.type === "still";
    if (activeTab === "projects") return p.type === "project";
    return true;
  });

  console.log("here",filteredProjects)

  // Dynamic Grid Classes based on Card Size
  const cardSize = appearance.cardSize || "M";
  const gridClasses =
    cardSize === "S"
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5"
      : cardSize === "M"
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5"
      : "grid-cols-1 sm:grid-cols-2 gap-6";

  // Dynamic Aspect Ratio classes
  const aspectRatio = appearance.aspectRatio || "16:9";
  const aspectClasses =
    aspectRatio === "16:9"
      ? "aspect-video"
      : aspectRatio === "9:16"
      ? "aspect-[9/16]"
      : aspectRatio === "1:1"
      ? "aspect-square"
      : aspectRatio === "grid"
      ? "aspect-[4/3]"
      : "aspect-[4/3]";

  return (
    <section
      className="rounded-2xl bg-[#141416]/75 backdrop-blur-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-6"
      style={{
        boxShadow:
          "0 20px 40px -20px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white font-heading tracking-wide">
          Portfolio work — shown to visitors
        </h2>

        {/* Filter Pills matching Screenshot 4: Films | Stills | Projects */}
        <div className="inline-flex items-center bg-[#0c0c0e]/90 p-1 rounded-full border border-white/10 gap-1">
          {(["films", "stills", "projects"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-[#f5551d] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
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
          const isVideo = item.type === "film" || item.type === "project";

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="group relative rounded-2xl bg-[#0c0c0e] border border-white/10 overflow-hidden transition-all duration-300 hover:border-white/30 hover:shadow-2xl shadow-black/50 cursor-pointer"
            >
              {/* Media Image / Thumbnail */}
              <AppImage
                src={item.thumbnailUrl}
                alt={item.title}
                objectFit={appearance.thumbnailScale === "fit" ? "contain" : "cover"}
                fallbackIcon={item.type === "still" ? "image" : "film"}
                containerClassName={`relative w-full ${aspectClasses}`}
              />

              {/* Top-Left Badge (FILM / STILL / PROJECT) */}
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                  {item.type === "still" ? (
                    <>
                      <ImageIcon className="size-3 text-zinc-300" />
                      <span>STILL</span>
                    </>
                  ) : item.type === "project" ? (
                    <>
                      <FolderKanban className="size-3 text-zinc-300" />
                      <span>PROJECT</span>
                    </>
                  ) : (
                    <>
                      <Film className="size-3 text-zinc-300" />
                      <span>FILM</span>
                    </>
                  )}
                </span>
              </div>

              {/* Top-Right Star Pin Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFeature(item);
                }}
                className={`absolute top-3 right-3 z-10 size-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isFeatured
                    ? "bg-[#f5551d] text-white shadow-md shadow-[#f5551d]/30 opacity-100"
                    : "bg-black/50 backdrop-blur-md text-zinc-400 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100"
                }`}
                title={isFeatured ? "Unpin from featured reel" : "Pin to featured reel"}
              >
                <Star className={`size-4 ${isFeatured ? "fill-current" : ""}`} />
              </button>

              {/* Center Action Button for Video Cuts / Projects or Zoom for Stills */}
              {isVideo ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="size-11 rounded-full bg-black/50 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:bg-[#f5551d] group-hover:text-black transition-all">
                    <Play className="size-4.5 ml-0.5 fill-current" />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="size-11 rounded-full bg-black/50 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-xl scale-90 group-hover:scale-110 group-hover:bg-[#f5551d] group-hover:text-black transition-all">
                    <Maximize2 className="size-4.5 stroke-[2.5]" />
                  </div>
                </div>
              )}


              {/* Bottom Label Overlay (Always rendered smoothly with client info toggle) */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3.5 pt-8 pointer-events-none flex flex-col justify-end">
                <span className="text-xs font-bold text-white tracking-tight leading-snug truncate font-heading">
                  {item.title}
                </span>
                {appearance.showClientInfo && (
                  <span className="text-[10px] text-zinc-400 font-mono truncate">
                    {item.category}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 text-xs italic">
            No {activeTab} yet. Click the upload button above to add your first {activeTab.slice(0, -1)}.
          </div>
        )}
      </div>
    </section>
  );
}

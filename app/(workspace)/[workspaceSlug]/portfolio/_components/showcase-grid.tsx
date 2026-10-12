"use client";

import React, { useState, useTransition } from "react";
import { Star, Play, Film, Image as ImageIcon, FolderKanban, Maximize2, Trash2, Pencil, Loader2, CheckCircle2 } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TiltCard } from "@/components/ui/motion";
import { TypographyH4, TypographyMuted } from "@/components/ui/typography";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
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
  onDeleteItem?: (item: PortfolioItem) => Promise<void> | void;
  onEditItem?: (item: PortfolioItem) => void;
  onOpenTrash?: () => void;
}

function parseItemAspectRatio(ar?: string | number): number | null {
  if (!ar) return null;
  if (typeof ar === "number") return ar;
  if (typeof ar === "string") {
    if (ar.includes(":")) {
      const [w, h] = ar.split(":").map(Number);
      if (w && h && !isNaN(w) && !isNaN(h)) return w / h;
    }
    const val = parseFloat(ar);
    if (!isNaN(val) && val > 0) return val;
  }
  return null;
}

function ShowcaseMasonryMedia({
  item,
  thumbnailScale,
}: {
  item: PortfolioItem;
  thumbnailScale?: "fit" | "fill";
}) {
  const parsedRatio = parseItemAspectRatio(item.aspectRatio);
  const defaultRatio =
    item.type === "film" ? 16 / 9 : item.type === "still" ? 3 / 4 : 4 / 3;

  const [naturalRatio, setNaturalRatio] = useState<number | null>(parsedRatio);
  const effectiveRatio = naturalRatio || parsedRatio || defaultRatio;

  return (
    <div
      className="relative w-full overflow-hidden bg-[#0c0c0e]"
      style={{
        aspectRatio: `${effectiveRatio}`,
      }}
    >
      <AppImage
        src={item.thumbnailUrl}
        alt={item.title}
        fill
        objectFit={thumbnailScale === "fit" ? "contain" : "cover"}
        fallbackIcon={item.type === "still" ? "image" : "film"}
        containerClassName="size-full"
        className="transition-transform duration-500 group-hover:scale-105"
        onLoad={(e: any) => {
          if (!parsedRatio && e?.currentTarget?.naturalWidth && e?.currentTarget?.naturalHeight) {
            const ratio = e.currentTarget.naturalWidth / e.currentTarget.naturalHeight;
            if (ratio > 0 && isFinite(ratio)) {
              setNaturalRatio(ratio);
            }
          }
        }}
      />
    </div>
  );
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
  onDeleteItem,
  onEditItem,
  onOpenTrash,
}: ShowcaseGridProps) {
  const [isPending, startTransition] = useTransition();

  // Filter tabs matching Screenshot 4: "Films", "Stills", "Projects"
  const [activeTab, setActiveTab] = useState<"films" | "stills" | "projects">("films");
  const [localFeaturedIds, setLocalFeaturedIds] = useState<string[]>(initialFeaturedIds);
  const [itemToDelete, setItemToDelete] = useState<PortfolioItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const PAGE_SIZE = 12;
  const [visibleCounts, setVisibleCounts] = useState<Record<"films" | "stills" | "projects", number>>({
    films: PAGE_SIZE,
    stills: PAGE_SIZE,
    projects: PAGE_SIZE,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filteredProjects = projects.filter((p) => {
    if (activeTab === "films") return p.type === "film";
    if (activeTab === "stills") return p.type === "still";
    if (activeTab === "projects") return p.type === "project";
    return true;
  });

  const currentVisibleCount = visibleCounts[activeTab] || PAGE_SIZE;
  const visibleProjects = filteredProjects.slice(0, currentVisibleCount);
  const hasMore = filteredProjects.length > currentVisibleCount;
  const remainingCount = Math.max(0, filteredProjects.length - currentVisibleCount);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCounts((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] || PAGE_SIZE) + PAGE_SIZE,
      }));
      setIsLoadingMore(false);
    }, 200);
  };

  const isMasonry =
    appearance.aspectRatio === "grid" ||
    appearance.aspectRatio === "masonry" ||
    appearance.aspectRatio === "4:3";

  // Dynamic Grid Classes based on Card Size
  const cardSize = appearance.cardSize || "M";
  const gridClasses =
    cardSize === "S"
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5"
      : cardSize === "M"
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5"
      : "grid-cols-1 sm:grid-cols-2 gap-6";

  const masonryClasses =
    cardSize === "S"
      ? "columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3.5"
      : cardSize === "M"
      ? "columns-1 sm:columns-2 md:columns-3 lg:columns-3 gap-5"
      : "columns-1 sm:columns-2 gap-6";

  const masonryItemSpacing =
    cardSize === "S" ? "mb-3.5" : cardSize === "L" ? "mb-6" : "mb-5";

  // Dynamic Aspect Ratio classes & numeric ratio
  const aspectRatio = appearance.aspectRatio || "16:9";
  const numericRatio =
    aspectRatio === "9:16"
      ? 9 / 16
      : aspectRatio === "1:1"
      ? 1
      : 16 / 9;

  return (
    <Card
      className="rounded-2xl bg-[#141416]/75 backdrop-blur-2xl border border-white/10 shadow-xl space-y-4 hover:translate-y-0 hover:shadow-xl"
      style={{
        boxShadow:
          "0 20px 40px -20px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-4 pb-0">
        <div className="space-y-3">
          <CardTitle className="text-sm font-bold text-white font-heading tracking-wide">
            Portfolio work — shown to visitors
          </CardTitle>

          {/* Filter Pills: Films | Stills | Projects */}
          <div className="inline-flex items-center bg-[#0c0c0e]/90 p-1 rounded-full border border-white/10 gap-1">
            {(["films", "stills", "projects"] as const).map((tab) => (
              <Button
                key={tab}
                size="sm"
                variant={activeTab === tab ? "default" : "ghost"}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-1.5 h-auto rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-[#f5551d] text-white hover:bg-[#f5551d]/90 shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-transparent"
                }`}
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>

        {/* Workspace Trash Button in CardAction */}
        {onOpenTrash && (
          <CardAction className="self-start sm:self-auto">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenTrash}
                    className="flex items-center gap-2 px-4 py-2 h-auto rounded-full bg-white/5 hover:bg-white/10 border-white/10 hover:border-amber-500/30 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Trash2 className="size-3.5 text-amber-400" />
                    <span>Trash</span>
                  </Button>
                }
              />
              <TooltipContent>Open Workspace Trash (30-day safety retention)</TooltipContent>
            </Tooltip>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="pt-2">
        {/* Showcase Grid / Masonry */}
        <div className={isMasonry ? masonryClasses : `grid ${gridClasses}`}>
        {visibleProjects.map((item) => {
          const isFeatured = featuredIds.includes(item.id);
          const isVideo = item.type === "film" || item.type === "project";

          return (
            <div
              key={item.id}
              className={isMasonry ? `break-inside-avoid ${masonryItemSpacing} w-full` : "h-full"}
            >
              <TiltCard tiltIntensity={4} glareIntensity={0.12} className={`w-full ${isMasonry ? "h-auto" : "h-full"}`}>
                <Card
                  onClick={() => onSelectItem(item)}
                  className={`group relative rounded-2xl bg-[#0c0c0e] border border-white/10 overflow-hidden transition-all duration-300 hover:border-white/30 p-0 cursor-pointer w-full ${isMasonry ? "h-auto" : "h-full"}`}
                >
                  {/* Media Image */}
                  {isMasonry ? (
                    <ShowcaseMasonryMedia
                      item={item}
                      thumbnailScale={appearance.thumbnailScale}
                    />
                  ) : (
                    <AspectRatio ratio={numericRatio} className="w-full">
                      <AppImage
                        src={item.thumbnailUrl}
                        alt={item.title}
                        objectFit={appearance.thumbnailScale === "fit" ? "contain" : "cover"}
                        fallbackIcon={item.type === "still" ? "image" : "film"}
                        containerClassName="size-full"
                        className="transition-transform duration-500 group-hover:scale-105"
                      />
                    </AspectRatio>
                  )}

                {/* Top-Left Badge (FILM / STILL / PROJECT) */}
                <div className="absolute top-3 left-3 z-10">
                  <Badge
                    variant="outline"
                    className="bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white uppercase tracking-wider gap-1.5 px-2.5 py-1 rounded-md"
                  >
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
                  </Badge>
                </div>

                {/* Top-Right Action Controls (Star Pin + Edit + Delete) */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFeature(item);
                          }}
                          className={`size-8 rounded-full p-0 flex items-center justify-center transition-all cursor-pointer ${
                            isFeatured
                              ? "bg-[#f5551d] text-white hover:bg-[#ff8a45] shadow-md shadow-[#f5551d]/30 opacity-100"
                              : "bg-black/50 backdrop-blur-md text-zinc-400 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Star className={`size-4 ${isFeatured ? "fill-current" : ""}`} />
                        </Button>
                      }
                    />
                    <TooltipContent>
                      {isFeatured ? "Unpin from featured reel" : "Pin to featured reel"}
                    </TooltipContent>
                  </Tooltip>

                  {onEditItem && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditItem(item);
                            }}
                            className="size-8 rounded-full p-0 bg-black/50 backdrop-blur-md text-zinc-400 hover:text-white hover:bg-white/20 border border-white/10 hover:border-white/30 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 shadow-md"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <TooltipContent>Edit {item.type === "project" ? "project" : "asset"}</TooltipContent>
                    </Tooltip>
                  )}

                  {onDeleteItem && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(item);
                            }}
                            className="size-8 rounded-full p-0 bg-black/50 backdrop-blur-md text-zinc-400 hover:text-red-400 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 shadow-md"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        }
                      />
                      <TooltipContent>Delete {item.type === "project" ? "project" : "asset"}</TooltipContent>
                    </Tooltip>
                  )}
                </div>

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

                {/* Bottom Label Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3.5 pt-8 pointer-events-none flex flex-col justify-end">
                  <TypographyH4 className="text-xs font-bold text-white tracking-tight leading-snug truncate font-heading">
                    {item.title}
                  </TypographyH4>
                  {appearance.showClientInfo && (
                    <TypographyMuted className="text-[10px] text-zinc-400 font-mono truncate">
                      {item.category}
                    </TypographyMuted>
                  )}
                </div>
              </Card>
            </TiltCard>
          </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="col-span-full [column-span:all] py-12 text-center text-zinc-500 text-xs italic">
            No {activeTab} yet. Click the upload button above to add your first {activeTab.slice(0, -1)}.
          </div>
        )}

        {/* Load More Button & Stats Footer */}
        {hasMore && (
          <div className="col-span-full [column-span:all] flex flex-col items-center justify-center pt-8 pb-4 space-y-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isLoadingMore}
              onClick={handleLoadMore}
              className="group relative rounded-full px-8 py-3 bg-[#0c0c0e]/80 hover:bg-[#141416] border-white/10 hover:border-[#f5551d]/50 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-xl cursor-pointer"
            >
              {isLoadingMore ? (
                <div className="flex items-center gap-2.5">
                  <Loader2 className="size-4 animate-spin text-[#f5551d]" />
                  <span>Loading {activeTab}...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Load More {activeTab}</span>
                  {remainingCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full ml-1 bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30"
                    >
                      +{remainingCount} more
                    </Badge>
                  )}
                </div>
              )}
            </Button>
            <p className="text-[11px] font-mono text-zinc-400">
              Showing {visibleProjects.length} of {filteredProjects.length} {activeTab}
            </p>
          </div>
        )}

        {!hasMore && filteredProjects.length > PAGE_SIZE && (
          <div className="col-span-full [column-span:all] text-center pt-6 pb-2 text-[11px] font-mono text-zinc-500 flex items-center justify-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>All {filteredProjects.length} {activeTab} displayed</span>
          </div>
        )}
      </div>
      </CardContent>

      <DeleteConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        isPermanent={itemToDelete?.type === "project"}
        title={itemToDelete?.type === "project" ? "Delete Showcase Project" : "Move Asset to Trash"}
        itemName={itemToDelete?.title}
        description={
          itemToDelete?.type === "project"
            ? "Are you sure you want to permanently delete this project container from your portfolio? This action cannot be undone."
            : "This asset will be moved to your workspace Trash. It will immediately disappear from your portfolio showcase and be kept safely for 30 days before permanent deletion."
        }
        confirmText={itemToDelete?.type === "project" ? "Delete Forever" : "Move to Trash"}
        isDeleting={isDeleting}
        onConfirm={async () => {
          if (!itemToDelete || !onDeleteItem) return;
          setIsDeleting(true);
          try {
            await onDeleteItem(itemToDelete);
            setItemToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </Card>
  );
}

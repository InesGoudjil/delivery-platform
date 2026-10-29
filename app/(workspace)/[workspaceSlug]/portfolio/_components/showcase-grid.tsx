"use client";

import React, { useState, useTransition, useCallback } from "react";
import { Star, Play, Film, Image as ImageIcon, FolderKanban, Maximize2, Trash2, Pencil, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import {
  MediaCard,
  MediaGrid,
  MediaBadge,
  HeroBadge,
  PlayButtonOverlay,
  ZoomButtonOverlay,
} from "@/components/workspaces/media-card";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographyH4, TypographyMuted, TypographySpan } from "@/components/ui/typography";
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
  heroAssetId?: string | null;
  onSetAsHero?: (item: PortfolioItem) => void;
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
  heroAssetId,
  onSetAsHero,
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

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCounts((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] || PAGE_SIZE) + PAGE_SIZE,
      }));
      setIsLoadingMore(false);
    }, 200);
  }, [activeTab, PAGE_SIZE]);

  const handleInfiniteLoadMore = useCallback(() => {
    if (isLoadingMore) return;
    handleLoadMore();
  }, [isLoadingMore, handleLoadMore]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: handleInfiniteLoadMore,
    rootMargin: "300px",
  });

  const isMasonry =
    appearance.aspectRatio === "grid" ||
    appearance.aspectRatio === "masonry" ||
    appearance.aspectRatio === "4:3";

  const cardSize = appearance.cardSize || "M";

  // Dynamic Aspect Ratio classes & numeric ratio
  const aspectRatio = appearance.aspectRatio || "16:9";
  const numericRatio =
    isMasonry
      ? undefined
      : aspectRatio === "9:16"
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
          <CardTitle className="p-0 border-none">
            <TypographyH4 className="text-sm font-bold text-white font-heading tracking-wide">
              Portfolio work — shown to visitors
            </TypographyH4>
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
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
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
                    <TypographySpan>Trash</TypographySpan>
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
        <MediaGrid isMasonry={isMasonry} cardSize={cardSize}>
        {visibleProjects.map((item) => {
          const isFeatured = featuredIds.includes(item.id);
          const isHero = heroAssetId ? heroAssetId === item.id : false;
          const isVideo = item.type === "film" || item.type === "project";

          return (
            <MediaCard
              key={item.id}
              title={item.title}
              subtitle={item.category}
              showInfo={appearance.showClientInfo}
              showSubtitle={appearance.showClientInfo}
              src={item.thumbnailUrl}
              type={item.type}
              aspectRatio={item.aspectRatio}
              numericRatio={numericRatio}
              isMasonry={isMasonry}
              thumbnailScale={appearance.thumbnailScale}
              onClick={() => onSelectItem(item)}
              isHero={isHero}
              isFeatured={isFeatured}
              tiltIntensity={4}
              glareIntensity={0.12}
              topLeft={
                <>
                  <MediaBadge type={item.type} />
                  {isHero && <HeroBadge />}
                </>
              }
              topRight={
                <>
                  {onSetAsHero && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetAsHero(item);
                            }}
                            className={`size-8 rounded-full p-0 flex items-center justify-center transition-all cursor-pointer shadow-md ${
                              isHero
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 opacity-100 ring-2 ring-primary/40"
                                : "bg-black/50 backdrop-blur-md text-zinc-400 hover:text-primary hover:bg-white/20 border border-white/10 opacity-0 group-hover:opacity-100 max-sm:opacity-100"
                            }`}
                          >
                            <Sparkles className={`size-3.5 ${isHero ? "fill-current" : ""}`} />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {isHero ? "Currently Active Storefront Hero" : "Set as Cover Banner & Hero"}
                      </TooltipContent>
                    </Tooltip>
                  )}

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
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/30 opacity-100"
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
                </>
              }
              // centerAction={isVideo ? <PlayButtonOverlay /> : <ZoomButtonOverlay />}
              footerMode="overlay"
            />
          );
        })}
        </MediaGrid>

        {filteredProjects.length === 0 && (
          <div className="py-12 text-center text-zinc-500 text-xs italic">
            No {activeTab} yet. Click the upload button above to add your first {activeTab.slice(0, -1)}.
          </div>
        )}

        {/* Infinite Scroll Sentinel & Stats Footer */}
        {hasMore && (
          <div
            ref={sentinelRef}
            className="flex flex-col items-center justify-center pt-8 pb-4 space-y-3"
          >
            <div
              onClick={handleLoadMore}
              className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-[#0c0c0e]/90 border border-white/10 text-white shadow-xl cursor-pointer hover:border-primary/40 transition-all duration-300"
            >
              <Loader2 className="size-4 animate-spin text-primary" />
              <TypographySpan className="text-xs font-bold uppercase tracking-wider">
                {isLoadingMore ? `Loading ${activeTab}...` : `Loading more ${activeTab}`}
              </TypographySpan>
              {remainingCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5 rounded-full ml-1 bg-primary/15 text-primary border border-primary/30"
                >
                  +{remainingCount} more
                </Badge>
              )}
            </div>
            <TypographyMuted className="text-[11px] text-zinc-400">
              Showing {visibleProjects.length} of {filteredProjects.length} {activeTab}
            </TypographyMuted>
          </div>
        )}

        {!hasMore && filteredProjects.length > PAGE_SIZE && (
          <div className="text-center pt-6 pb-2 text-[11px] text-zinc-500 flex items-center justify-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <TypographySpan>All {filteredProjects.length} {activeTab} displayed</TypographySpan>
          </div>
        )}
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

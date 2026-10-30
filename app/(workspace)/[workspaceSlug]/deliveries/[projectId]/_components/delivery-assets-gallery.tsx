"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Check, Video, ImageIcon, Play, Trash2, Pencil, Download, Loader2, CheckCircle2 } from "lucide-react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import {
  MediaCard,
  MediaGrid,
  MediaBadge,
  VersionBadge,
  PlayButtonOverlay,
  ZoomButtonOverlay,
} from "@/components/workspaces/media-card";
import { getDownloadFilename, triggerDirectDownload } from "@/lib/download";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  TypographyH2,
  TypographyH4,
  TypographyKicker,
  TypographyMuted,
  TypographySpan,
} from "@/components/ui/typography";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
import type { GalleryItem, AppearanceSettings } from "./types";

interface DeliveryAssetsGalleryProps {
  items: GalleryItem[];
  appearance: AppearanceSettings;
  showAssetAddedBadge: boolean;
  totalCount?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: (filterTab: "ALL" | "VIDEOS" | "PHOTOS") => Promise<void> | void;
  onSelectItem: (item: GalleryItem) => void;
  onToggleApproval?: (itemId: string, currentStatus: string) => void;
  onDeleteAsset?: (item: GalleryItem) => Promise<void> | void;
  onEditAsset?: (item: GalleryItem) => void;
  onOpenTrash?: () => void;
}

export function DeliveryAssetsGallery({
  items,
  appearance,
  showAssetAddedBadge,
  totalCount,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onSelectItem,
  onToggleApproval,
  onDeleteAsset,
  onEditAsset,
  onOpenTrash,
}: DeliveryAssetsGalleryProps) {
  const [filterTab, setFilterTab] = useState<"ALL" | "VIDEOS" | "PHOTOS">("ALL");
  const [itemToDelete, setItemToDelete] = useState<GalleryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredItems = items.filter((item) => {
    if (filterTab === "VIDEOS") return item.type === "video";
    if (filterTab === "PHOTOS") return item.type === "photo";
    return true;
  });

  const handleInfiniteLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || !onLoadMore) return;
    onLoadMore(filterTab);
  }, [isLoadingMore, hasMore, onLoadMore, filterTab]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: handleInfiniteLoadMore,
    rootMargin: "300px",
  });

  const { cardSize, aspectRatioSetting, thumbnailScale, showCardInfo, watermarkMedia } = appearance;
  const isMasonry = aspectRatioSetting === "masonry";
  console.log("items",appearance)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <TypographyKicker className="text-xs font-bold text-primary uppercase tracking-widest block">
            Deliverables
          </TypographyKicker>
          <TypographyH2 className="text-3xl font-black font-heading tracking-tight text-foreground uppercase border-none pb-0">
            PROJECT ASSETS
          </TypographyH2>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-card/60 p-1 rounded-full border border-border/40 backdrop-blur-md">
            {(["ALL", "VIDEOS", "PHOTOS"] as const).map((tab) => (
              <Button
                key={tab}
                type="button"
                variant={filterTab === tab ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterTab(tab)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold cursor-pointer transition-all ${
                  filterTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab}
              </Button>
            ))}
          </div>

          {/* Trash Bin Trigger Button */}
          {onOpenTrash && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenTrash}
              className="rounded-full bg-card/40 hover:bg-muted border border-border hover:border-amber-500/30 text-xs font-bold text-foreground transition-all cursor-pointer gap-2"
              title="Open Workspace Trash"
            >
              <Trash2 className="size-3.5 text-amber-400" />
              <TypographySpan>Trash</TypographySpan>
            </Button>
          )}

          {/* Floating ✓ Asset added pill badge */}
          {showAssetAddedBadge && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg animate-in fade-in duration-200"
            >
              <Check className="size-3.5 stroke-[3]" />
              <TypographySpan>Asset added</TypographySpan>
            </Badge>
          )}
        </div>
      </div>

      {/* Masonry / Responsive Asset Grid */}
      <MediaGrid isMasonry={isMasonry} cardSize={cardSize} className="gap-4">
        {filteredItems.map((item) => {
          const numericRatio =
            isMasonry
              ? undefined
              : aspectRatioSetting === "16:9"
              ? 16 / 9
              : aspectRatioSetting === "1:1"
              ? 1
              : aspectRatioSetting === "9:16"
              ? 9 / 16
              : 16 / 9;

          const aspectLabel =
            typeof item.aspectRatio === "object" && item.aspectRatio !== null
              ? (item.aspectRatio as any)?.shortLabel ||
                (item.aspectRatio as any)?.id ||
                (item.aspectRatio as any)?.cssRatio ||
                "16:9"
              : item.aspectRatio || "16:9";

          return (
            <MediaCard
              key={item.id}
              title={item.title}
              // subtitle={`Aspect: ${aspectLabel}`}

              showInfo={showCardInfo}
              showTitle={showCardInfo}
              showSubtitle={showCardInfo}
              src={item.src}
              type={item.type}
              aspectRatio={item.aspectRatio}
              numericRatio={numericRatio}
              isMasonry={isMasonry}
              thumbnailScale={"Fill"}
              onClick={() => onSelectItem(item)}
              textAlign="center"
              footerMode="overlay"
              watermarkMedia={
                watermarkMedia
                  ? { enabled: true, text: "WATERMARK ACTIVE", opacity: 0.16 }
                  : undefined
              }
              tiltIntensity={3}
              glareIntensity={0.1}
              topLeft={
                <>
                  <MediaBadge type={item.type} />
                  <VersionBadge
                    versionNumber={item.versionNumber || 1}
                    totalVersions={item.totalVersions}
                  />
                  {item.status === "approved" && (
                    <Badge
                      variant="sage"
                      className="text-[9px] px-1.5 py-0.5 font-bold uppercase rounded-md shadow-md border-none"
                    >
                      ✓ Approved
                    </Badge>
                  )}
                </>
              }
              topRight={
                <>
                  {onToggleApproval && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleApproval(item.id, item.status);
                            }}
                            className={`size-7 rounded-lg backdrop-blur-md transition-all cursor-pointer shadow-md ${
                              item.status === "approved"
                                ? "bg-emerald-500/80 border-emerald-400/50 text-black hover:bg-amber-500/80 hover:border-amber-400/50 hover:text-black opacity-100"
                                : "bg-black/60 border-white/20 text-zinc-300 hover:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 opacity-0 group-hover:opacity-100 max-sm:opacity-100"
                            }`}
                          >
                            <Check className="size-3.5 stroke-[2.5]" />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {item.status === "approved"
                          ? "Approved — click to unapprove"
                          : "Approve asset"}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            const dlUrl =
                              item.downloadUrl ||
                              item.rawUrl ||
                              (item.type === "photo" ? item.src : "");
                            if (!dlUrl) {
                              toast.error("No master file available for download.");
                              return;
                            }
                            const filename = getDownloadFilename(
                              item.title,
                              item.versionNumber,
                              dlUrl,
                              item.type
                            );
                            triggerDirectDownload(dlUrl, filename);
                            toast.success(`Downloading ${item.title}`, {
                              description: `Saving as ${filename}`,
                            });
                          }}
                          className="size-7 rounded-lg bg-black/60 backdrop-blur-md border-white/20 text-zinc-300 hover:text-white hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 shadow-md"
                        >
                          <Download className="size-3.5" />
                        </Button>
                      }
                    />
                    <TooltipContent>Download master file</TooltipContent>
                  </Tooltip>

                  {onEditAsset && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditAsset(item);
                            }}
                            className="size-7 rounded-lg bg-black/60 backdrop-blur-md border-white/20 text-zinc-300 hover:text-white hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 shadow-md"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <TooltipContent>Edit asset details</TooltipContent>
                    </Tooltip>
                  )}
                  {onDeleteAsset && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(item);
                            }}
                            className="size-7 rounded-lg bg-black/60 backdrop-blur-md border-white/20 text-zinc-300 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 shadow-md"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        }
                      />
                      <TooltipContent>Move asset to trash</TooltipContent>
                    </Tooltip>
                  )}
                </>
              }
              // centerAction={item.type === "video" ? <PlayButtonOverlay /> : <ZoomButtonOverlay />}
              bottomRight={
                item.duration ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-black/80 px-2 py-0.5 rounded text-white border-white/10"
                  >
                    {item.duration}
                  </Badge>
                ) : undefined
              }
            />
          );
        })}
      </MediaGrid>

      {/* Empty Filter State */}
      {filteredItems.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-xs italic bg-card/20 rounded-2xl border border-dashed border-border/40">
          No {filterTab.toLowerCase()} in this delivery yet.
        </div>
      )}

      {/* Infinite Scroll Sentinel & Stats Footer */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex flex-col items-center justify-center pt-8 pb-4 space-y-3"
        >
          <div
            onClick={() => onLoadMore?.(filterTab)}
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-card/80 border border-border text-foreground shadow-lg cursor-pointer hover:border-primary/50 transition-all duration-300"
          >
            <Loader2 className="size-4 animate-spin text-primary" />
            <TypographySpan className="text-xs font-bold uppercase tracking-wider">
              {isLoadingMore ? "Loading assets..." : "Loading more assets"}
            </TypographySpan>
            {totalCount !== undefined && totalCount > items.length && (
              <Badge
                variant="secondary"
                className="text-[10px] px-2 py-0.5 rounded-full ml-1 bg-primary/10 text-primary border border-primary/20"
              >
                +{totalCount - items.length} more
              </Badge>
            )}
          </div>
          {totalCount !== undefined && totalCount > 0 && (
            <TypographyMuted className="text-[11px] text-muted-foreground">
              Showing {filteredItems.length} of {totalCount} total assets
            </TypographyMuted>
          )}
        </div>
      )}

      {!hasMore && items.length > 12 && (
        <div className="text-center pt-6 pb-2 text-[11px]  text-muted-foreground/60 flex items-center justify-center gap-2">
          <CheckCircle2 className="size-3.5 text-sage-400" />
          <TypographySpan>All deliverables loaded ({totalCount || items.length} total)</TypographySpan>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        isPermanent={false}
        title="Move to Trash"
        itemName={itemToDelete?.title}
        description="This asset will be moved to your workspace Trash. It will immediately disappear from this client delivery link and be kept safely for 30 days before permanent deletion."
        confirmText="Move to Trash"
        isDeleting={isDeleting}
        onConfirm={async () => {
          if (!itemToDelete || !onDeleteAsset) return;
          setIsDeleting(true);
          try {
            await onDeleteAsset(itemToDelete);
            setItemToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </div>
  );
}

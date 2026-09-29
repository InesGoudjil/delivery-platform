"use client";

import { useState } from "react";
import { Check, Video, ImageIcon, Play, Trash2, Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AppImage } from "@/components/ui/app-image";
import { TiltCard } from "@/components/ui/motion";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
import type { GalleryItem, AppearanceSettings } from "./types";

interface DeliveryAssetsGalleryProps {
  items: GalleryItem[];
  appearance: AppearanceSettings;
  showAssetAddedBadge: boolean;
  onSelectItem: (item: GalleryItem) => void;
  onDeleteAsset?: (item: GalleryItem) => Promise<void> | void;
  onEditAsset?: (item: GalleryItem) => void;
  onOpenTrash?: () => void;
}

export function DeliveryAssetsGallery({
  items,
  appearance,
  showAssetAddedBadge,
  onSelectItem,
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

  const { cardSize, aspectRatioSetting, thumbnailScale, showCardInfo } = appearance;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-widest block">
            Deliverables
          </span>
          <h2 className="text-3xl font-black font-heading tracking-tight text-foreground uppercase">
            PROJECT ASSETS
          </h2>
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
              <span>Trash</span>
            </Button>
          )}

          {/* Floating ✓ Asset added pill badge */}
          {showAssetAddedBadge && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg animate-in fade-in duration-200"
            >
              <Check className="size-3.5 stroke-[3]" />
              <span>Asset added</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Masonry / Responsive Asset Grid */}
      <div
        className={`columns-1 ${
          cardSize === "S"
            ? "sm:columns-2 md:columns-4"
            : cardSize === "L"
            ? "sm:columns-1 md:columns-2"
            : "sm:columns-2 md:columns-3"
        } gap-4 space-y-4`}
      >
        {filteredItems.map((item) => {
          const numericRatio =
            aspectRatioSetting === "16:9"
              ? 16 / 9
              : aspectRatioSetting === "1:1"
              ? 1
              : aspectRatioSetting === "9:16"
              ? 9 / 16
              : item.aspectRatio === "9:16"
              ? 9 / 16
              : 16 / 9;

          return (
            <TiltCard
              key={item.id}
              tiltIntensity={3}
              glareIntensity={0.1}
              className="break-inside-avoid mb-4 rounded-2xl"
            >
              <Card
                onClick={() => onSelectItem(item)}
                className="rounded-2xl border border-border/80 overflow-hidden group hover:border-primary/50 transition-all duration-300 cursor-pointer relative shadow-lg p-0 gap-0 hover:translate-y-0"
              >
                <CardContent className="p-0 relative overflow-hidden">
                  <AspectRatio ratio={numericRatio} className="relative overflow-hidden bg-black/40">
                    <AppImage
                      src={item.src}
                      alt={item.title}
                      fill
                      className={`w-full h-full ${
                        thumbnailScale === "Fit" ? "object-contain bg-black" : "object-cover"
                      } group-hover:scale-105 transition-transform duration-500`}
                    />

                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                      <div className="size-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                        {item.type === "video" ? (
                          <Video className="size-3.5" />
                        ) : (
                          <ImageIcon className="size-3.5" />
                        )}
                      </div>
                      <div className="px-2 h-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-[10px] font-mono font-bold text-white tracking-wider">
                        V{item.versionNumber || 1}
                        {item.totalVersions && item.totalVersions > 1 && (
                          <span className="text-[9px] text-[#ff8a45] ml-1">
                            ({item.totalVersions})
                          </span>
                        )}
                      </div>
                    </div>

                    {(onEditAsset || onDeleteAsset) && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
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
                            <TooltipContent>Edit asset title &amp; aspect ratio</TooltipContent>
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
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                        <Play className="size-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className="absolute bottom-3 right-3 z-10 text-[10px] font-mono bg-black/80 px-2 py-0.5 rounded text-white border-white/10"
                    >
                      {item.duration}
                    </Badge>
                  </AspectRatio>
                </CardContent>

                {showCardInfo && (
                  <CardFooter className="p-3.5 border-t border-border/40 flex-col items-start gap-1">
                    <CardTitle className="text-xs font-bold text-card-foreground truncate w-full">
                      {item.title}
                    </CardTitle>
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground w-full">
                      <span>Aspect: {item.aspectRatio}</span>
                      <Badge
                        variant={item.status === "approved" ? "sage" : "orange"}
                        className="text-[10px] px-1.5 py-0 font-medium"
                      >
                        {item.status === "approved" ? "✓ Approved" : "In Review"}
                      </Badge>
                    </div>
                  </CardFooter>
                )}
              </Card>
            </TiltCard>
          );
        })}
      </div>

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

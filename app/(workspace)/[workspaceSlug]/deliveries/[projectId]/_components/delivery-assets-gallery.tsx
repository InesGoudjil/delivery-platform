"use client";

import { useState } from "react";
import { Check, Video, ImageIcon, Play } from "lucide-react";
import type { GalleryItem, AppearanceSettings } from "./types";

interface DeliveryAssetsGalleryProps {
  items: GalleryItem[];
  appearance: AppearanceSettings;
  showAssetAddedBadge: boolean;
  onSelectItem: (item: GalleryItem) => void;
}

export function DeliveryAssetsGallery({
  items,
  appearance,
  showAssetAddedBadge,
  onSelectItem,
}: DeliveryAssetsGalleryProps) {
  const [filterTab, setFilterTab] = useState<"ALL" | "VIDEOS" | "PHOTOS">("ALL");

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
          <span className="text-xs font-bold text-[#f5551d] uppercase tracking-widest block">
            Deliverables
          </span>
          <h2 className="text-3xl font-black font-heading tracking-tight text-white uppercase">
            PROJECT ASSETS
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#121215] p-1.5 rounded-full border border-white/10">
            {(["ALL", "VIDEOS", "PHOTOS"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filterTab === tab
                    ? "bg-white text-black shadow-md"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Floating ✓ Asset added pill badge */}
          {showAssetAddedBadge && (
            <div className="flex items-center gap-1.5 bg-white text-black px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg animate-in fade-in duration-200">
              <Check className="size-3.5 stroke-[3]" />
              <span>Asset added</span>
            </div>
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
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectItem(item)}
            className="break-inside-avoid rounded-2xl bg-[#121215] border border-white/10 overflow-hidden group hover:border-[#f5551d]/50 transition-all duration-300 cursor-pointer relative shadow-lg"
          >
            <div
              className={`relative overflow-hidden ${
                aspectRatioSetting === "16:9"
                  ? "aspect-video"
                  : aspectRatioSetting === "1:1"
                  ? "aspect-square"
                  : aspectRatioSetting === "9:16"
                  ? "aspect-[9/16]"
                  : item.aspectRatio === "9:16"
                  ? "aspect-[9/16]"
                  : "aspect-video"
              }`}
            >
              <img
                src={item.src}
                alt={item.title}
                className={`w-full h-full ${
                  thumbnailScale === "Fit" ? "object-contain bg-black" : "object-cover"
                } group-hover:scale-105 transition-transform duration-500`}
              />

              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
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

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#f5551d] text-black flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                  <Play className="size-5 fill-current ml-0.5" />
                </div>
              </div>

              <span className="absolute bottom-3 right-3 z-10 text-[10px] font-mono bg-black/80 px-2 py-0.5 rounded text-white border border-white/10">
                {item.duration}
              </span>
            </div>

            {showCardInfo && (
              <div className="p-3.5 border-t border-white/5 space-y-1">
                <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Aspect: {item.aspectRatio}</span>
                  <span
                    className={`font-semibold ${
                      item.status === "approved"
                        ? "text-emerald-400 flex items-center gap-1"
                        : "text-[#f5551d]"
                    }`}
                  >
                    {item.status === "approved" ? "✓ Approved" : "In Review"}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

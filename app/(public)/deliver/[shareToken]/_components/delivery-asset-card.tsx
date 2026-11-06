"use client";

import { Check, Download, Loader2 } from "lucide-react";
import { resolveThumbnailUrl } from "@/lib/media";
import {
  MediaCard,
  MediaBadge,
  VersionBadge,
  PlayButtonOverlay,
  ZoomButtonOverlay,
} from "@/components/workspaces/media-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { DeliveryAssetItem, DeliveryAppearance } from "./types";

interface DeliveryAssetCardProps {
  asset: DeliveryAssetItem;
  workspaceBrandName: string;
  appearance?: DeliveryAppearance | null;
  isDeliveryWatermarked?: boolean;
  isGlobalDownloadUnlocked: boolean;
  isApproving: boolean;
  numericRatio?: number;
  isMasonry?: boolean;
  thumbnailScale?: "Fit" | "Fill";
  showCardInfo?: boolean;
  onSelect: (asset: DeliveryAssetItem) => void;
  onToggleApproval: (assetId: string) => void;
  onDownload: (asset: DeliveryAssetItem) => void;
}

export function DeliveryAssetCard({
  asset,
  workspaceBrandName,
  appearance,
  isDeliveryWatermarked = true,
  isGlobalDownloadUnlocked,
  isApproving,
  numericRatio,
  isMasonry = true,
  thumbnailScale = "Fill",
  showCardInfo = true,
  onSelect,
  onToggleApproval,
  onDownload,
}: DeliveryAssetCardProps) {
  const ver = asset.activeVersion || asset.versions[0] || null;
  const isPhoto =
    asset.type === "photo_gallery" ||
    asset.type === "image" ||
    asset.type === "photo" ||
    asset.type === "still";

  const poster =
    resolveThumbnailUrl(ver?.thumbnailUrl, ver?.rawFileUrl, isPhoto) ||
    "/images/projects/mercedes-amg-gt/1.webp";

  const durationSec = ver?.durationSeconds ? Math.round(ver.durationSeconds) : null;
  const durationLabel = isPhoto
    ? null
    : durationSec
    ? `${Math.floor(durationSec / 60)
        .toString()
        .padStart(1, "0")}:${(durationSec % 60).toString().padStart(2, "0")}`
    : "VIDEO";

  const isWatermarkedSetting = appearance?.watermarkMedia ?? isDeliveryWatermarked;
  const showWatermarkOnAsset = isWatermarkedSetting && !asset.isApproved;

  const subtitleText = isPhoto
    ? (asset.isApproved ? "Approved • High-Res Still" : "High-Res Still • In Review")
    : `${durationLabel || "Video"}${ver?.versionNumber ? ` • v${ver.versionNumber}` : ""} • ${asset.isApproved ? "Approved" : "In Review"}`;

  return (
    <MediaCard
      title={asset.title}
      subtitle={subtitleText}
      src={poster}
      type={isPhoto ? "photo" : "video"}
      aspectRatio={asset.aspectRatio}
      numericRatio={numericRatio}
      isMasonry={isMasonry}
      thumbnailScale={thumbnailScale}
      onClick={() => onSelect(asset)}
      showInfo={showCardInfo}
      showTitle={showCardInfo}
      showSubtitle={showCardInfo}
      textAlign="center"
      footerMode="overlay"
      centerAction={isPhoto ? <ZoomButtonOverlay /> : <PlayButtonOverlay />}
      watermarkMedia={
        showWatermarkOnAsset
          ? {
              enabled: true,
              text: workspaceBrandName || "STUDIO PREVIEW",
              variant: "card",
            }
          : undefined
      }
      tiltIntensity={4}
      glareIntensity={0.12}
      topLeft={
        <>
          <MediaBadge type={isPhoto ? "photo" : "video"} />
          {asset.versions && asset.versions.length > 1 && (
            <VersionBadge
              versionNumber={ver?.versionNumber || 1}
              totalVersions={asset.versions.length}
            />
          )}
          <Badge
            variant={asset.isApproved ? "sage" : "outline"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleApproval(asset.id);
            }}
            className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded-md shadow-md border cursor-pointer active:scale-95 touch-manipulation transition-all ${
              asset.isApproved
                ? "bg-emerald-500/80 border-emerald-400/50 text-black hover:bg-amber-400 opacity-100"
                : "bg-black/60 border-amber-500/30 text-amber-300 backdrop-blur-md hover:bg-amber-500/20"
            }`}
          >
            {asset.isApproved ? "✓ Approved" : "In Review"}
          </Badge>
        </>
      }
      topRight={
        <div className="flex items-center gap-1.5 p-0.5">
          {isGlobalDownloadUnlocked && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(asset);
                    }}
                    className="size-9 sm:size-7.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/90 hover:text-white hover:bg-white/20 hover:border-white/40 flex items-center justify-center shadow-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 p-0 active:scale-90 touch-manipulation"
                  >
                    <Download className="size-4 sm:size-3.5" />
                  </Button>
                }
              />
              <TooltipContent side="top">
                Download {asset.title}
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isApproving}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleApproval(asset.id);
                  }}
                  className={`size-9 sm:size-7.5 rounded-full p-0 flex items-center justify-center shadow-md font-bold transition-all cursor-pointer active:scale-90 touch-manipulation ${
                    asset.isApproved
                      ? "bg-[#86b98f] hover:bg-amber-400 text-black opacity-100"
                      : "bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-black hover:bg-[#86b98f] hover:border-[#86b98f] opacity-0 group-hover:opacity-100 max-sm:opacity-100"
                  }`}
                >
                  {isApproving ? (
                    <Loader2 className="size-4 sm:size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-4 sm:size-3.5 stroke-[3]" />
                  )}
                </Button>
              }
            />
            <TooltipContent side="top">
              {asset.isApproved
                ? "Approved — click to unapprove"
                : "Click to approve cut"}
            </TooltipContent>
          </Tooltip>
        </div>
      }
      bottomRight={
        !showCardInfo && !isPhoto && durationLabel ? (
          <div className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white border border-white/10 z-10 pointer-events-none">
            {durationLabel}
          </div>
        ) : null
      }
    />
  );
}

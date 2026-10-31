"use client";

import { Check, Download, Loader2 } from "lucide-react";
import { resolveThumbnailUrl } from "@/lib/media";
import {
  MediaCard,
  MediaBadge,
  VersionBadge,
} from "@/components/workspaces/media-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypographySpan } from "@/components/ui/typography";
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

  return (
    <MediaCard
      title={asset.title}
      src={poster}
      type={isPhoto ? "photo" : "video"}
      aspectRatio={asset.aspectRatio}
      numericRatio={numericRatio}
      isMasonry={isMasonry}
      thumbnailScale={thumbnailScale}
      onClick={() => onSelect(asset)}
      showInfo={showCardInfo}
      footerMode={showCardInfo ? "card" : "none"}
      watermarkMedia={
        showWatermarkOnAsset
          ? {
              enabled: true,
              text: workspaceBrandName || "STUDIO PREVIEW",
              variant: "card",
            }
          : undefined
      }
      tiltIntensity={3}
      glareIntensity={0.1}
      topLeft={
        <>
          <MediaBadge type={isPhoto ? "photo" : "video"} />
          {asset.versions && asset.versions.length > 1 && (
            <VersionBadge
              versionNumber={ver?.versionNumber || 1}
              totalVersions={asset.versions.length}
            />
          )}
          {asset.isApproved && (
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
          {(isGlobalDownloadUnlocked || asset.isApproved) && (
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
                    className="size-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/90 hover:text-white hover:bg-white/20 hover:border-white/40 flex items-center justify-center shadow-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 p-0"
                  >
                    <Download className="size-3.5" />
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
                  className={`size-7 rounded-full p-0 flex items-center justify-center shadow-md font-bold transition-all cursor-pointer ${
                    asset.isApproved
                      ? "bg-[#86b98f] hover:bg-amber-400 text-black opacity-100"
                      : "bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-black hover:bg-[#86b98f] hover:border-[#86b98f] opacity-0 group-hover:opacity-100 max-sm:opacity-100"
                  }`}
                >
                  {isApproving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5 stroke-[3]" />
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
        </>
      }
      bottomRight={
        !isPhoto && durationLabel ? (
          <div className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white border border-white/10 z-10">
            {durationLabel}
          </div>
        ) : null
      }
      footer={
        showCardInfo ? (
          <div className="p-3.5 border-t border-white/10 flex items-center justify-between gap-2 bg-[#141416] w-full">
            <TypographySpan className="text-xs font-semibold text-white truncate">
              {asset.title}
            </TypographySpan>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={isApproving}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleApproval(asset.id);
                }}
                title={
                  asset.isApproved
                    ? "Click to unapprove"
                    : "Click to approve"
                }
                className="h-auto p-0 hover:bg-transparent cursor-pointer focus:outline-none"
              >
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 font-medium transition-colors ${
                    asset.isApproved
                      ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-amber-500/15 hover:text-amber-300 hover:border-amber-500/30"
                      : "border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/30"
                  }`}
                >
                  {asset.isApproved ? "✓ Approved" : "In Review"}
                </Badge>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!isGlobalDownloadUnlocked && !asset.isApproved}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(asset);
                }}
                className="size-6 rounded-md text-[#aeaeb4] hover:text-white hover:bg-white/10 transition-colors p-0 cursor-pointer disabled:opacity-30"
                title={
                  isGlobalDownloadUnlocked || asset.isApproved
                    ? `Download ${asset.title}`
                    : "Approve cut to unlock download"
                }
              >
                <Download className="size-3" />
              </Button>
            </div>
          </div>
        ) : null
      }
    />
  );
}

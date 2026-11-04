"use client";

import { FileVideo } from "lucide-react";
import { parseAspectRatio } from "@/lib/media";
import { MediaGrid } from "@/components/workspaces/media-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  TypographyH2,
  TypographyH4,
  TypographyKicker,
  TypographyLead,
} from "@/components/ui/typography";
import { DeliveryAssetCard } from "./delivery-asset-card";
import type { DeliveryAssetItem, DeliveryAppearance, AssetFilterTab } from "./types";

interface DeliveryAssetGridProps {
  filteredAssets: DeliveryAssetItem[];
  activeTab: AssetFilterTab;
  onTabChange: (tab: AssetFilterTab) => void;
  workspaceBrandName: string;
  appearance?: DeliveryAppearance | null;
  isDeliveryWatermarked?: boolean;
  isGlobalDownloadUnlocked: boolean;
  approvingAssetId: string | null;
  onSelectAsset: (asset: DeliveryAssetItem) => void;
  onToggleApproval: (assetId: string) => void;
  onDownloadAsset: (asset: DeliveryAssetItem) => void;
}

export function DeliveryAssetGrid({
  filteredAssets,
  activeTab,
  onTabChange,
  workspaceBrandName,
  appearance,
  isDeliveryWatermarked = true,
  isGlobalDownloadUnlocked,
  approvingAssetId,
  onSelectAsset,
  onToggleApproval,
  onDownloadAsset,
}: DeliveryAssetGridProps) {
  const app = appearance || {
    cardSize: "M",
    aspectRatioSetting: "masonry",
    thumbnailScale: "Fill",
    showCardInfo: true,
    watermarkMedia: true,
  };
  const cardSize = app.cardSize || "M";
  const aspectRatioSetting = app.aspectRatioSetting || "masonry";
  const isMasonry = aspectRatioSetting === "masonry";
  const thumbnailScale = app.thumbnailScale || "Fill";
  const showCardInfo = app.showCardInfo ?? true;
  const numericRatio = isMasonry
    ? undefined
    : aspectRatioSetting === "16:9"
    ? 16 / 9
    : aspectRatioSetting === "1:1"
    ? 1
    : aspectRatioSetting === "9:16"
    ? 9 / 16
    : parseAspectRatio(aspectRatioSetting).numeric;

  return (
    <div className="space-y-5 pt-4">
      {/* Title & Category Info */}
      <div className="space-y-1">
        <TypographyKicker className="text-xs sm:text-sm font-semibold text-primary font-sans tracking-wide">
          Asset library
        </TypographyKicker>
        <TypographyH2 className="font-heading font-black text-2xl sm:text-4xl text-[#f6f3ec] uppercase tracking-tight">
          PROJECT FILES
        </TypographyH2>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex items-center bg-[#141416] border border-white/10 rounded-full p-1 shadow-inner gap-1">
        <Button
          type="button"
          variant={activeTab === "all" ? "default" : "ghost"}
          size="xs"
          onClick={() => onTabChange("all")}
          className={`h-7 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-white text-black hover:bg-white/90 shadow-md"
              : "text-[#aeaeb4] hover:text-white hover:bg-white/5"
          }`}
        >
          ALL
        </Button>
        <Button
          type="button"
          variant={activeTab === "video" ? "default" : "ghost"}
          size="xs"
          onClick={() => onTabChange("video")}
          className={`h-7 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "video"
              ? "bg-white text-black hover:bg-white/90 shadow-md"
              : "text-[#aeaeb4] hover:text-white hover:bg-white/5"
          }`}
        >
          VIDEOS
        </Button>
        <Button
          type="button"
          variant={activeTab === "photo" ? "default" : "ghost"}
          size="xs"
          onClick={() => onTabChange("photo")}
          className={`h-7 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "photo"
              ? "bg-white text-black hover:bg-white/90 shadow-md"
              : "text-[#aeaeb4] hover:text-white hover:bg-white/5"
          }`}
        >
          PHOTOS
        </Button>
      </div>

      {/* Grid or Empty State */}
      {filteredAssets.length === 0 ? (
        <Card className="bg-[#111115] border border-white/10 rounded-3xl p-12 text-center">
          <CardContent className="space-y-4 p-0">
            <FileVideo className="w-12 h-12 text-primary mx-auto opacity-70" />
            <div className="space-y-1">
              <TypographyH4 className="font-heading font-bold text-lg text-white">
                No Files in this Category
              </TypographyH4>
              <TypographyLead className="text-xs text-[#aeaeb4] max-w-md mx-auto">
                Switch tabs or check back once additional files have been processed.
              </TypographyLead>
            </div>
          </CardContent>
        </Card>
      ) : (
        <MediaGrid isMasonry={isMasonry} cardSize={cardSize} className="gap-5 pt-1">
          {filteredAssets.map((asset) => (
            <DeliveryAssetCard
              key={asset.id}
              asset={asset}
              workspaceBrandName={workspaceBrandName}
              appearance={appearance}
              isDeliveryWatermarked={isDeliveryWatermarked}
              isGlobalDownloadUnlocked={isGlobalDownloadUnlocked}
              isApproving={approvingAssetId === asset.id}
              numericRatio={numericRatio}
              isMasonry={isMasonry}
              thumbnailScale={thumbnailScale}
              showCardInfo={showCardInfo}
              onSelect={onSelectAsset}
              onToggleApproval={onToggleApproval}
              onDownload={onDownloadAsset}
            />
          ))}
        </MediaGrid>
      )}
    </div>
  );
}

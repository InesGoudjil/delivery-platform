"use client";

import {
  Pencil,
  Lock,
  RectangleHorizontal,
  RectangleVertical,
  Square,
  Grid,
} from "lucide-react";
import type { AppearanceSettings } from "./types";

interface DeliveryAppearanceCardProps {
  settings: AppearanceSettings;
  onChangeSettings: (settings: AppearanceSettings) => void;
}

export function DeliveryAppearanceCard({
  settings,
  onChangeSettings,
}: DeliveryAppearanceCardProps) {
  const {
    cardSize,
    aspectRatioSetting,
    thumbnailScale,
    showCardInfo,
    watermarkMedia,
  } = settings;

  const update = (partial: Partial<AppearanceSettings>) => {
    onChangeSettings({ ...settings, ...partial });
  };

  return (
    <div className="rounded-2xl bg-[#121215] border border-white/10 p-6 space-y-6 shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5 text-white font-heading font-bold text-base">
          <Pencil className="size-4 text-[#f5551d]" />
          <span>Appearance</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Lock className="size-3.5" />
          <span>How your client sees this gallery</span>
        </div>
      </div>

      <div className="space-y-4 text-xs font-medium">
        {/* Card size row */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-muted-foreground font-sans">Card size</span>
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
            {(["S", "M", "L"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => update({ cardSize: size })}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  cardSize === size
                    ? "bg-[#f5551d] text-black"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect ratio row */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-muted-foreground font-sans">Aspect ratio</span>
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => update({ aspectRatioSetting: "16:9" })}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                aspectRatioSetting === "16:9"
                  ? "bg-[#f5551d] text-black"
                  : "text-muted-foreground hover:text-white"
              }`}
              title="16:9 Landscape"
            >
              <RectangleHorizontal className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => update({ aspectRatioSetting: "1:1" })}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                aspectRatioSetting === "1:1"
                  ? "bg-[#f5551d] text-black"
                  : "text-muted-foreground hover:text-white"
              }`}
              title="1:1 Square"
            >
              <Square className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => update({ aspectRatioSetting: "9:16" })}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                aspectRatioSetting === "9:16"
                  ? "bg-[#f5551d] text-black"
                  : "text-muted-foreground hover:text-white"
              }`}
              title="9:16 Vertical"
            >
              <RectangleVertical className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => update({ aspectRatioSetting: "masonry" })}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                aspectRatioSetting === "masonry"
                  ? "bg-[#f5551d] text-black"
                  : "text-muted-foreground hover:text-white"
              }`}
              title="Masonry Grid"
            >
              <Grid className="size-4" />
            </button>
          </div>
        </div>

        {/* Thumbnail scale row */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-muted-foreground font-sans">Thumbnail scale</span>
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
            {(["Fit", "Fill"] as const).map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => update({ thumbnailScale: scale })}
                className={`px-3.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  thumbnailScale === scale
                    ? "bg-[#f5551d] text-black"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {scale}
              </button>
            ))}
          </div>
        </div>

        {/* Show card info row */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-muted-foreground font-sans">Show card info</span>
          <button
            type="button"
            onClick={() => update({ showCardInfo: !showCardInfo })}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              showCardInfo ? "bg-[#f5551d]" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                showCardInfo ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Watermark media PRO row */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-sans">Watermark media</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#f5551d]/20 text-[#f5551d] border border-[#f5551d]/30">
              PRO
            </span>
          </div>
          <button
            type="button"
            onClick={() => update({ watermarkMedia: !watermarkMedia })}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              watermarkMedia ? "bg-[#f5551d]" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                watermarkMedia ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

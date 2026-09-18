"use client";

import React, { useState, useTransition } from "react";
import {
  SlidersHorizontal,
  Lock,
  RectangleHorizontal,
  Square,
  RectangleVertical,
  LayoutGrid,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { updatePortfolioAction } from "@/app/actions/portfolio";
import { PortfolioAppearance } from "@/core/entities/portfolio";

interface AppearanceToolbarProps {
  portfolioId: string;
  initialAppearance: PortfolioAppearance;
  onAppearanceChange?: (appearance: PortfolioAppearance) => void;
  showFlash: (msg: string) => void;
}

export function AppearanceToolbar({
  portfolioId,
  initialAppearance,
  onAppearanceChange,
  showFlash,
}: AppearanceToolbarProps) {
  const [isPending, startTransition] = useTransition();

  const [cardSize, setCardSize] = useState<"S" | "M" | "L">(
    initialAppearance.cardSize || "M"
  );
  const [aspectRatio, setAspectRatio] = useState<
    "16:9" | "1:1" | "9:16" | "grid" | "4:3"
  >(initialAppearance.aspectRatio || "16:9");
  const [thumbnailScale, setThumbnailScale] = useState<"fit" | "fill">(
    initialAppearance.thumbnailScale || "fill"
  );
  const [showClientInfo, setShowClientInfo] = useState(
    initialAppearance.showClientInfo ?? true
  );

  const persistAppearance = (updates: Partial<PortfolioAppearance>) => {
    const updatedAppearance: PortfolioAppearance = {
      ...initialAppearance,
      cardSize,
      aspectRatio,
      thumbnailScale,
      showClientInfo,
      featuredItemIds:initialAppearance.featuredItemIds,
      ...updates,
    };

    if (onAppearanceChange) {
      onAppearanceChange(updatedAppearance);
    }

    startTransition(async () => {
      await updatePortfolioAction(portfolioId, {
        appearance: updatedAppearance,
      });
      showFlash("Appearance preferences saved");
    });
  };

  return (
    <section
      className="rounded-2xl bg-[#141416]/75 backdrop-blur-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4"
      style={{
        boxShadow:
          "0 20px 40px -20px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      {/* Header matching Screenshot 3 */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-sm font-bold text-white font-heading tracking-wide">
          <SlidersHorizontal className="size-4 text-[#f5551d]" />
          <span>Appearance</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-sans">
          <Lock className="size-3.5 text-zinc-500" />
          <span>How visitors see your work grid</span>
        </div>
      </div>

      {/* Settings Rows */}
      <div className="divide-y divide-white/[0.05] text-xs">
        {/* Row 1: Card size */}
        <div className="flex items-center justify-between py-3">
          <span className="text-zinc-300 font-medium">Card size</span>
          <div className="inline-flex rounded-lg bg-[#0c0c0e]/90 border border-white/10 p-0.5">
            {(["S", "M", "L"] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  setCardSize(sz);
                  persistAppearance({ cardSize: sz });
                }}
                className={`px-3.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  cardSize === sz
                    ? "bg-[#f5551d] text-white font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Aspect ratio */}
        <div className="flex items-center justify-between py-3">
          <span className="text-zinc-300 font-medium">Aspect ratio</span>
          <div className="inline-flex items-center rounded-lg bg-[#0c0c0e]/90 border border-white/10 p-0.5 gap-0.5">
            {/* 16:9 Landscape */}
            <button
              type="button"
              onClick={() => {
                setAspectRatio("16:9");
                persistAppearance({ aspectRatio: "16:9" });
              }}
              className={`p-1.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                aspectRatio === "16:9"
                  ? "bg-[#f5551d] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="16:9 Landscape"
            >
              <RectangleHorizontal className="size-4" />
            </button>

            {/* 1:1 Square */}
            <button
              type="button"
              onClick={() => {
                setAspectRatio("1:1");
                persistAppearance({ aspectRatio: "1:1" });
              }}
              className={`p-1.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                aspectRatio === "1:1"
                  ? "bg-[#f5551d] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="1:1 Square"
            >
              <Square className="size-3.5" />
            </button>

            {/* 9:16 Portrait */}
            <button
              type="button"
              onClick={() => {
                setAspectRatio("9:16");
                persistAppearance({ aspectRatio: "9:16" });
              }}
              className={`p-1.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                aspectRatio === "9:16"
                  ? "bg-[#f5551d] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="9:16 Vertical"
            >
              <RectangleVertical className="size-4" />
            </button>

            {/* Grid / Masonry */}
            <button
              type="button"
              onClick={() => {
                setAspectRatio("grid");
                persistAppearance({ aspectRatio: "grid" });
              }}
              className={`p-1.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                aspectRatio === "grid" || aspectRatio === "4:3"
                  ? "bg-[#f5551d] text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Grid / Multi"
            >
              <LayoutGrid className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Row 3: Thumbnail scale */}
        <div className="flex items-center justify-between py-3">
          <span className="text-zinc-300 font-medium">Thumbnail scale</span>
          <div className="inline-flex rounded-lg bg-[#0c0c0e]/90 border border-white/10 p-0.5">
            {(["fit", "fill"] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => {
                  setThumbnailScale(sc);
                  persistAppearance({ thumbnailScale: sc });
                }}
                className={`px-3.5 py-1 rounded-md text-xs font-semibold capitalize transition-all cursor-pointer ${
                  thumbnailScale === sc
                    ? "bg-[#f5551d] text-white font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>

        {/* Row 4: Show card info */}
        <div className="flex items-center justify-between py-3">
          <span className="text-zinc-300 font-medium">Show card info</span>
          <Switch
            checked={showClientInfo}
            onCheckedChange={(val) => {
              setShowClientInfo(val);
              persistAppearance({ showClientInfo: val });
            }}
            className="data-[state=checked]:bg-[#f5551d]"
          />
        </div>
      </div>
    </section>
  );
}

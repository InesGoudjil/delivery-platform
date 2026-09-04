"use client";

import React, { useState, useTransition } from "react";
import { Sliders } from "lucide-react";
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
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1" | "4:3">(
    initialAppearance.aspectRatio || "16:9"
  );
  const [thumbnailScale, setThumbnailScale] = useState<"fit" | "fill">(
    initialAppearance.thumbnailScale || "fill"
  );
  const [showClientInfo, setShowClientInfo] = useState(
    initialAppearance.showClientInfo ?? true
  );

  const persistAppearance = (updates: Partial<PortfolioAppearance>) => {
    const updatedAppearance: PortfolioAppearance = {
      cardSize,
      aspectRatio,
      thumbnailScale,
      showClientInfo,
      ...updates,
    };

    if (onAppearanceChange) {
      onAppearanceChange(updatedAppearance);
    }

    startTransition(async () => {
      await updatePortfolioAction(portfolioId, {
        appearance: updatedAppearance,
      });
      showFlash("Appearance preferences saved to database!");
    });
  };

  return (
    <section className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#f6f3ec]">
          <Sliders className="size-3.5 text-[#f5551d]" />
          <span>Appearance Controls (Auto-Saves to Database)</span>
        </div>
        <span className="text-[11px] text-[#71717a] font-mono">
          Directly updates public visitor layout
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        {/* Card Size: S / M / L */}
        <div className="space-y-1.5">
          <span className="text-[#8e8e93] font-medium block">Card size</span>
          <div className="inline-flex rounded-lg bg-[#0c0c0e] p-0.5 border border-white/10">
            {(["S", "M", "L"] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  setCardSize(sz);
                  persistAppearance({ cardSize: sz });
                }}
                className={`px-3 py-1 rounded-md font-mono text-xs font-semibold transition-all cursor-pointer ${
                  cardSize === sz
                    ? "bg-[#f5551d] text-black shadow-sm"
                    : "text-[#8e8e93] hover:text-white"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio: 16:9 / 9:16 / 1:1 / 4:3 */}
        <div className="space-y-1.5">
          <span className="text-[#8e8e93] font-medium block">Aspect ratio</span>
          <div className="inline-flex rounded-lg bg-[#0c0c0e] p-0.5 border border-white/10">
            {(["16:9", "9:16", "1:1", "4:3"] as const).map((ar) => (
              <button
                key={ar}
                type="button"
                onClick={() => {
                  setAspectRatio(ar);
                  persistAppearance({ aspectRatio: ar });
                }}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold transition-all cursor-pointer ${
                  aspectRatio === ar
                    ? "bg-white/20 text-[#f6f3ec]"
                    : "text-[#8e8e93] hover:text-white"
                }`}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>

        {/* Thumbnail Scale: Fit / Fill */}
        <div className="space-y-1.5">
          <span className="text-[#8e8e93] font-medium block">Thumbnail scale</span>
          <div className="inline-flex rounded-lg bg-[#0c0c0e] p-0.5 border border-white/10">
            {(["fit", "fill"] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => {
                  setThumbnailScale(sc);
                  persistAppearance({ thumbnailScale: sc });
                }}
                className={`px-3 py-1 rounded-md font-mono text-xs capitalize font-semibold transition-all cursor-pointer ${
                  thumbnailScale === sc
                    ? "bg-white/20 text-[#f6f3ec]"
                    : "text-[#8e8e93] hover:text-white"
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>

        {/* Show Client Info: Toggle */}
        <div className="space-y-1.5 flex flex-col justify-between">
          <span className="text-[#8e8e93] font-medium block">Show client info</span>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={showClientInfo}
              onCheckedChange={(val) => {
                setShowClientInfo(val);
                persistAppearance({ showClientInfo: val });
              }}
              className="data-[state=checked]:bg-[#f5551d]"
            />
            <span className="text-[11px] text-[#71717a] font-mono">
              {showClientInfo ? "Visible" : "Hidden"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

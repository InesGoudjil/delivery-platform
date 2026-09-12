"use client";

import React, { useRef } from "react";
import {
  Image as ImageIcon,
  Check,
  Trash2,
  Eye,
  Camera,
  Upload,
} from "lucide-react";
import { COVER_PRESETS } from "./constants";

interface CoverBannerSectionProps {
  coverUrl: string;
  isCustomCover: boolean;
  brandName: string;
  handle: string;
  accent: string;
  onSelectPreset: (url: string) => void;
  onCustomUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveCover: () => void;
}

export function CoverBannerSection({
  coverUrl,
  isCustomCover,
  brandName,
  handle,
  accent,
  onSelectPreset,
  onCustomUpload,
  onRemoveCover,
}: CoverBannerSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials =
    brandName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PC";

  return (
    <section className="space-y-4">
      <div>
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-0.5">
          Storefront Visuals
        </div>
        <h2 className="text-xl font-bold font-heading text-foreground tracking-tight">
          COVER BANNER &amp; SHOWCASE HERO
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose a cinematic preset or upload your own 16:9 / 21:9 key visual to display across the top of your public portfolio.
        </p>
      </div>

      <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 shadow-sm space-y-6">
        {/* Live Cover Preview Stage */}
        <div className="relative rounded-2xl overflow-hidden aspect-[21/9] sm:aspect-[24/8] border border-white/10 shadow-2xl bg-black/60 group">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Storefront Cover Preview"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center text-zinc-600">
              <ImageIcon className="size-12 opacity-40" />
            </div>
          )}

          {/* Cinematic Gradient Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />

          {/* Top Badge: Active Cover Status */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="bg-black/60 backdrop-blur-md border border-white/15 text-white font-mono text-[10px] uppercase font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
              <Eye className="size-3 text-[#f5551d]" />
              Live Preview
            </span>
            {isCustomCover && (
              <span className="bg-[#f5551d]/20 border border-[#f5551d]/40 text-[#f5551d] font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded-full shadow-lg">
                Custom Upload
              </span>
            )}
          </div>

          {/* Overlaid Filmmaker Profile Identity */}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-black font-extrabold text-base shadow-xl border border-white/20 backdrop-blur-md"
                style={{ backgroundColor: accent }}
              >
                {initials}
              </div>
              <div className="drop-shadow-md">
                <div className="font-heading font-extrabold text-base sm:text-lg text-white leading-tight">
                  {brandName}
                </div>
                <div className="text-[11px] font-mono text-zinc-300 mt-0.5">
                  cinespace.film/p/{handle}
                </div>
              </div>
            </div>

            {/* Reset or Change Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-3.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Camera className="size-3 text-[#f5551d]" />
                <span>Change Image</span>
              </button>
              {isCustomCover && (
                <button
                  type="button"
                  onClick={onRemoveCover}
                  className="rounded-full bg-rose-500/20 hover:bg-rose-500/30 backdrop-blur-md border border-rose-500/30 text-rose-300 text-[11px] font-bold px-3 py-1.5 transition-all flex items-center gap-1 cursor-pointer shadow-lg"
                  title="Reset to preset"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preset Covers Grid & Upload Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#f6f3ec] uppercase tracking-wider font-mono">
              Select from Cinematic Presets
            </span>
            <span className="text-[11px] text-muted-foreground">
              Or upload high-res stills below
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {COVER_PRESETS.map((preset) => {
              const isSelected = coverUrl === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.url)}
                  className={`relative rounded-xl overflow-hidden aspect-[16/9] border-2 transition-all group cursor-pointer text-left shadow-sm ${
                    isSelected
                      ? "border-[#f5551d] scale-[1.02] shadow-[#f5551d]/20 shadow-lg"
                      : "border-white/10 hover:border-white/30 opacity-75 hover:opacity-100"
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-mono font-bold text-white truncate drop-shadow">
                    {preset.title}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 bg-[#f5551d] rounded-full p-0.5 shadow-md">
                      <Check className="size-2.5 text-black stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Upload Trigger */}
          <div className="pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onCustomUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-dashed border-white/20 hover:border-[#f5551d]/60 bg-[#0c0c0e]/60 hover:bg-white/[0.03] p-4 text-center cursor-pointer transition-all flex items-center justify-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#f5551d]">
                <Upload className="size-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#f6f3ec]">
                  Upload Custom Cover Visual
                </div>
                <div className="text-[11px] text-muted-foreground">
                  PNG, JPG, or WebP up to 10MB (recommended 2560×1080 or 1920×1080)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

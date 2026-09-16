"use client";

import React, { useRef } from "react";
import { MessageCircle, Palette, Check, Camera, Trash2, Upload, Film, Briefcase, MapPin, User } from "lucide-react";
import { ACCENTS } from "./constants";
import { PortfolioStats } from "@/core/entities/portfolio";

interface StorefrontIdentitySectionProps {
  brandName: string;
  onBrandNameChange: (val: string) => void;
  handle: string;
  onHandleChange: (val: string) => void;
  whatsapp: string;
  onWhatsappChange: (val: string) => void;
  accent: string;
  onAccentChange: (val: string) => void;
  logoUrl?: string | null;
  onProfileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveProfile: () => void;
  stats: PortfolioStats;
  onStatsChange: (val: PortfolioStats) => void;
}

export function StorefrontIdentitySection({
  brandName,
  onBrandNameChange,
  handle,
  onHandleChange,
  whatsapp,
  onWhatsappChange,
  accent,
  onAccentChange,
  logoUrl,
  onProfileUpload,
  onRemoveProfile,
  stats,
  onStatsChange,
}: StorefrontIdentitySectionProps) {
  const profileInputRef = useRef<HTMLInputElement>(null);

  const initials =
    brandName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PC";

  return (
    <section id="branding" className="space-y-4">
      <div>
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-0.5">
          Storefront Identity
        </div>
        <h2 className="text-xl font-bold font-heading text-foreground tracking-tight">
          BRAND &amp; URL SETTINGS
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure how your name, profile photo, link, and accent styling appear to prospective clients.
        </p>
      </div>

      <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 shadow-sm space-y-6">
        {/* Profile Image & Avatar Upload Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-black/40 border border-white/10">
          <input
            type="file"
            ref={profileInputRef}
            onChange={onProfileUpload}
            accept="image/*"
            className="hidden"
          />

          <div className="relative group/avatar shrink-0">
            <div
              onClick={() => profileInputRef.current?.click()}
              className="size-16 sm:size-20 rounded-2xl overflow-hidden flex items-center justify-center text-black font-extrabold text-xl shadow-xl border-2 border-white/20 relative cursor-pointer group"
              style={{ backgroundColor: accent }}
              title="Upload new profile photo"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-extrabold text-xl sm:text-2xl">{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                <Camera className="size-5 text-[#f5551d]" />
                <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Change</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <User className="size-4 text-[#f5551d]" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Profile Photo &amp; Avatar
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload your director portrait, logo, or headshot. Displayed in your public portfolio header, about card, and client delivery rooms.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                className="rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-4 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Upload className="size-3 text-[#f5551d]" />
                <span>{logoUrl ? "Replace Photo" : "Upload Profile Photo"}</span>
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={onRemoveProfile}
                  className="rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold px-3 py-1.5 transition-all flex items-center gap-1 cursor-pointer"
                  title="Remove custom photo and use initials"
                >
                  <Trash2 className="size-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Brand Name & Public Handle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Brand / Filmmaker Name
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => onBrandNameChange(e.target.value)}
              placeholder="e.g. Pedro Concreato"
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Public Showcase Handle
            </label>
            <div className="flex items-center bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
              <span className="font-mono text-xs">cinespace.film/p/</span>
              <input
                type="text"
                required
                value={handle}
                onChange={(e) => onHandleChange(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none ml-1 font-bold w-full text-sm"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp & Accent Palette */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageCircle className="size-3.5 text-[#f5551d]" />
              WhatsApp Direct Booking Number
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => onWhatsappChange(e.target.value)}
              placeholder="+971501234567"
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Powers one-click WhatsApp client inquiries and rapid review links across the Gulf.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="size-3.5 text-[#f5551d]" />
              Player &amp; Button Accent Color
            </label>
            <div className="flex items-center gap-3 pt-1">
              {ACCENTS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => onAccentChange(c)}
                  style={{ backgroundColor: c }}
                  className={`size-9 rounded-full flex items-center justify-center transition-all border-2 cursor-pointer ${
                    accent === c
                      ? "border-white scale-110 shadow-lg"
                      : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  {accent === c && <Check className="size-4 text-black font-bold" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filmmaker Showcase Stats Card */}
        <div className="pt-2 border-t border-white/10 space-y-3">
          <div>
            <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Film className="size-3.5 text-[#f5551d]" />
              Filmmaker Showcase Stats &amp; Badges
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              These 3 counter badges appear prominently on your public About section to communicate scale and experience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Film className="size-3 text-[#f5551d]" />
                Films Delivered
              </label>
              <input
                type="text"
                value={stats.projects || "80+"}
                onChange={(e) => onStatsChange({ ...stats, projects: e.target.value })}
                placeholder="e.g. 80+"
                className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Briefcase className="size-3 text-[#f5551d]" />
                Industry Experience
              </label>
              <input
                type="text"
                value={stats.years || "6 YRS"}
                onChange={(e) => onStatsChange({ ...stats, years: e.target.value })}
                placeholder="e.g. 6 YRS"
                className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3 text-[#f5551d]" />
                Based / Region
              </label>
              <input
                type="text"
                value={stats.location || "UAE"}
                onChange={(e) => onStatsChange({ ...stats, location: e.target.value })}
                placeholder="e.g. Dubai, UAE"
                className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

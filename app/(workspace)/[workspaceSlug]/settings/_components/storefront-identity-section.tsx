"use client";

import React, { useRef } from "react";
import { MessageCircle, Palette, Check, Camera, Trash2, Upload, Film, Briefcase, MapPin, User } from "lucide-react";
import { ACCENTS } from "./constants";
import { PortfolioStats } from "@/core/entities/portfolio";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";

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
  canBranding?: boolean;
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
  canBranding = true,
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
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="orange" className="font-mono text-[10px] tracking-wider uppercase">
            Storefront Identity
          </Badge>
        </div>
        <TypographyH2 className="text-xl font-bold font-heading text-foreground tracking-tight border-none pb-0">
          BRAND &amp; URL SETTINGS
        </TypographyH2>
        <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
          Configure how your name, profile photo, link, and accent styling appear to prospective clients.
        </TypographyMuted>
      </div>

      <Card className="rounded-2xl bg-card/90 border border-border p-5 md:p-6 shadow-sm space-y-6 hover:translate-y-0">
        {/* Profile Image & Avatar Upload Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-muted/40 border border-border">
          <input
            type="file"
            ref={profileInputRef}
            onChange={onProfileUpload}
            accept="image/*"
            className="hidden"
          />

          <div className="relative group/avatar shrink-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => profileInputRef.current?.click()}
                    className="relative shrink-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
                  />
                }
              >
                <Avatar
                  className="size-16 sm:size-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl border-2 border-border cursor-pointer relative"
                  style={{ backgroundColor: accent }}
                >
                  {logoUrl && (
                    <AvatarImage
                      src={logoUrl}
                      alt={brandName}
                      className="rounded-2xl object-cover"
                    />
                  )}
                  <AvatarFallback
                    className="rounded-2xl font-extrabold text-xl sm:text-2xl text-black bg-transparent select-none"
                  >
                    {initials}
                  </AvatarFallback>
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity rounded-2xl">
                    <Camera className="size-5 text-[#f5551d]" />
                    <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Change</span>
                  </div>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top">
                Click to upload new director avatar or studio portrait
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <User className="size-4 text-[#f5551d]" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Profile Photo &amp; Avatar
              </h3>
            </div>
            <TypographyMuted className="text-xs text-muted-foreground leading-relaxed">
              Upload your director portrait, logo, or headshot. Displayed in your public portfolio header, about card, and client delivery rooms.
            </TypographyMuted>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => profileInputRef.current?.click()}
                      className="rounded-full bg-muted hover:bg-muted/80 border-border text-foreground text-xs font-semibold px-4 h-8 gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Upload className="size-3 text-[#f5551d]" />
                      <span>{logoUrl ? "Replace Photo" : "Upload Profile Photo"}</span>
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  JPG, PNG or WebP up to 10MB
                </TooltipContent>
              </Tooltip>
              {logoUrl && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={onRemoveProfile}
                        className="rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold px-3 h-8 gap-1 cursor-pointer"
                      >
                        <Trash2 className="size-3" />
                        <span>Remove</span>
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom">
                    Remove custom photo and use initials
                  </TooltipContent>
                </Tooltip>
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
            <Input
              type="text"
              required
              value={brandName}
              onChange={(e) => onBrandNameChange(e.target.value)}
              placeholder="e.g. Pedro Concreato"
              className="h-10 rounded-xl bg-muted/50 border-border text-foreground text-sm px-4"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Public Showcase Handle
            </label>
            <div className="flex items-center bg-muted/50 border border-border rounded-xl px-4 h-10 text-sm text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-colors">
              <span className="font-mono text-xs select-none">cinespace.film/p/</span>
              <input
                type="text"
                required
                value={handle}
                onChange={(e) => onHandleChange(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none ml-1 font-bold w-full text-sm font-mono"
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
            <Input
              type="text"
              value={whatsapp}
              onChange={(e) => onWhatsappChange(e.target.value)}
              placeholder="+971501234567"
              className="h-10 rounded-xl bg-muted/50 border-border text-foreground text-sm font-mono px-4"
            />
            <TypographyMuted className="text-[11px] text-muted-foreground">
              Powers one-click WhatsApp client inquiries and rapid review links across the Gulf.
            </TypographyMuted>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="size-3.5 text-[#f5551d]" />
                Player &amp; Button Accent Color
              </label>
              {!canBranding && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[9px] font-mono font-bold">
                  PRO+
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 pt-1">
              {ACCENTS.map((c) => (
                <Tooltip key={c}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => onAccentChange(c)}
                        style={{ backgroundColor: c }}
                        className={`size-9 rounded-full flex items-center justify-center transition-all border-2 cursor-pointer ${
                          accent === c
                            ? "border-white scale-110 shadow-lg"
                            : "border-transparent opacity-80 hover:opacity-100"
                        } ${!canBranding ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {accent === c && <Check className="size-4 text-black font-bold" />}
                      </button>
                    }
                  />
                  <TooltipContent side="top">
                    {!canBranding ? "Custom accent colors require Pro, Studio, or Enterprise" : `Select ${c}`}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        {/* Filmmaker Showcase Stats Card */}
        <div className="pt-2 border-t border-border space-y-3">
          <div>
            <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Film className="size-3.5 text-[#f5551d]" />
              Filmmaker Showcase Stats &amp; Badges
            </div>
            <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
              These 3 counter badges appear prominently on your public About section to communicate scale and experience.
            </TypographyMuted>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Film className="size-3 text-[#f5551d]" />
                Films Delivered
              </label>
              <Input
                type="text"
                value={stats.projects || "80+"}
                onChange={(e) => onStatsChange({ ...stats, projects: e.target.value })}
                placeholder="e.g. 80+"
                className="h-9 rounded-xl bg-muted/50 border-border text-xs text-foreground font-mono px-3.5"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Briefcase className="size-3 text-[#f5551d]" />
                Industry Experience
              </label>
              <Input
                type="text"
                value={stats.years || "6 YRS"}
                onChange={(e) => onStatsChange({ ...stats, years: e.target.value })}
                placeholder="e.g. 6 YRS"
                className="h-9 rounded-xl bg-muted/50 border-border text-xs text-foreground font-mono px-3.5"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3 text-[#f5551d]" />
                Based / Region
              </label>
              <Input
                type="text"
                value={stats.location || "UAE"}
                onChange={(e) => onStatsChange({ ...stats, location: e.target.value })}
                placeholder="e.g. Dubai, UAE"
                className="h-9 rounded-xl bg-muted/50 border-border text-xs text-foreground font-mono px-3.5"
              />
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

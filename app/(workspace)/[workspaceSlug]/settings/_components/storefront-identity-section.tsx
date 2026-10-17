"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Palette,
  Check,
  Camera,
  Trash2,
  Upload,
  Film,
  Briefcase,
  MapPin,
  User,
  Sparkles,
  Crop,
  Shield,
  Building2,
} from "lucide-react";
import { ACCENTS } from "./constants";
import { getContrastForeground } from "@/lib/theme-utils";
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

  // 1. Studio Brand Logo
  logoUrl?: string | null;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditLogo?: () => void;
  onRemoveLogo: () => void;

  // 2. Director / Filmmaker Profile Photo
  avatarUrl?: string | null;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditAvatar?: () => void;
  onRemoveAvatar: () => void;

  stats: PortfolioStats;
  onStatsChange: (val: PortfolioStats) => void;
  canBranding?: boolean;
  canWhatsapp?: boolean;
  workspaceSlug?: string;
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
  onLogoUpload,
  onEditLogo,
  onRemoveLogo,
  avatarUrl,
  onAvatarUpload,
  onEditAvatar,
  onRemoveAvatar,
  stats,
  onStatsChange,
  canBranding = true,
  canWhatsapp = true,
  workspaceSlug,
}: StorefrontIdentitySectionProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
          Configure your studio brand mark, personal profile photo, showcase link, and accent colors.
        </TypographyMuted>
      </div>

      <Card className="rounded-2xl bg-card/90 border border-border p-5 md:p-6 shadow-sm space-y-6 hover:translate-y-0">
        {!canBranding && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400 shrink-0" />
              <span>
                Custom studio branding (logo, profile avatar, and custom accent colors) requires a Pro or Studio plan.
              </span>
            </div>
            {workspaceSlug && (
              <Link
                href={`/${workspaceSlug}/subscription`}
                className="text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1 shrink-0 text-[11px]"
              >
                Upgrade to Pro
              </Link>
            )}
          </div>
        )}

        {/* 🌟 TWO DISTINCT VISUAL IDENTITIES: BRAND LOGO & PROFILE PICTURE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Studio Brand Logo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <input
              type="file"
              ref={logoInputRef}
              onChange={onLogoUpload}
              accept="image/*"
              disabled={!canBranding}
              className="hidden"
            />

            <div className="relative group/logo shrink-0">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!canBranding}
                      onClick={() => logoInputRef.current?.click()}
                      className="relative shrink-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background cursor-pointer disabled:cursor-not-allowed p-0 h-auto hover:bg-transparent"
                    />
                  }
                >
                  <div className="size-16 sm:size-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-md border-2 border-border/80 bg-zinc-950 p-1.5 cursor-pointer relative">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Brand Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-zinc-900 border border-white/5 flex flex-col items-center justify-center text-zinc-500">
                        <Building2 className="size-5 text-primary mb-0.5" />
                        <span className="text-[9px] font-mono font-bold uppercase">LOGO</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity rounded-2xl">
                      <Camera className="size-5 text-primary" />
                      <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Change</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {!canBranding
                    ? "Custom logo requires Pro or Studio plan"
                    : "Upload studio logo mark (PNG, SVG, JPG)"}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary shrink-0" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
                  Brand Logo
                </h3>
                <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0 border-white/10">
                  Header &amp; Rooms
                </Badge>
              </div>
              <TypographyMuted className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                Appears in your public portfolio header, client delivery rooms, and invoices.
              </TypographyMuted>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canBranding}
                        onClick={() => logoInputRef.current?.click()}
                        className="rounded-full bg-muted hover:bg-muted/80 border-border text-foreground text-xs font-semibold px-3 h-7 gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <Upload className="size-3 text-primary" />
                        <span>{logoUrl ? "Replace Logo" : "Upload Logo"}</span>
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom">
                    PNG, SVG, or JPG with transparent or dark backdrop
                  </TooltipContent>
                </Tooltip>

                {logoUrl && onEditLogo && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canBranding}
                          onClick={onEditLogo}
                          className="rounded-full bg-muted hover:bg-muted/80 border-border text-foreground text-xs font-semibold px-2.5 h-7 gap-1 cursor-pointer shadow-sm"
                        >
                          <Crop className="size-3 text-primary" />
                          <span>Crop</span>
                        </Button>
                      }
                    />
                    <TooltipContent side="bottom">Frame or adjust brand logo</TooltipContent>
                  </Tooltip>
                )}

                {logoUrl && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={onRemoveLogo}
                          className="rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold px-2.5 h-7 gap-1 cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                          <span>Remove</span>
                        </Button>
                      }
                    />
                    <TooltipContent side="bottom">Remove custom logo</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Filmmaker Profile Photo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <input
              type="file"
              ref={avatarInputRef}
              onChange={onAvatarUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="relative group/avatar shrink-0">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => avatarInputRef.current?.click()}
                      className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background cursor-pointer p-0 h-auto hover:bg-transparent"
                    />
                  }
                >
                  <Avatar
                    className="size-16 sm:size-20 rounded-full overflow-hidden flex items-center justify-center shadow-md border-2 border-border cursor-pointer relative"
                    style={{ backgroundColor: accent }}
                  >
                    {avatarUrl ? (
                      <AvatarImage
                        src={avatarUrl}
                        alt="Filmmaker Profile Photo"
                        className="rounded-full object-cover"
                      />
                    ) : null}
                    <AvatarFallback
                      className="rounded-full font-extrabold text-lg sm:text-xl text-black bg-transparent select-none"
                    >
                      {initials}
                    </AvatarFallback>
                    <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity rounded-full">
                      <Camera className="size-5 text-primary" />
                      <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Photo</span>
                    </div>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Click to upload filmmaker headshot or director portrait
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="size-4 text-primary shrink-0" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
                  Profile Picture
                </h3>
                <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0 border-white/10">
                  About Bio
                </Badge>
              </div>
              <TypographyMuted className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                Appears in your public &ldquo;About the Filmmaker&rdquo; bio card and director credits.
              </TypographyMuted>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => avatarInputRef.current?.click()}
                        className="rounded-full bg-muted hover:bg-muted/80 border-border text-foreground text-xs font-semibold px-3 h-7 gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Upload className="size-3 text-primary" />
                        <span>{avatarUrl ? "Replace Photo" : "Upload Portrait"}</span>
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom">
                    Square or portrait headshot (JPG, PNG, WebP)
                  </TooltipContent>
                </Tooltip>

                {avatarUrl && onEditAvatar && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={onEditAvatar}
                          className="rounded-full bg-muted hover:bg-muted/80 border-border text-foreground text-xs font-semibold px-2.5 h-7 gap-1 cursor-pointer shadow-sm"
                        >
                          <Crop className="size-3 text-primary" />
                          <span>Crop</span>
                        </Button>
                      }
                    />
                    <TooltipContent side="bottom">Frame or adjust profile portrait</TooltipContent>
                  </Tooltip>
                )}

                {avatarUrl && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={onRemoveAvatar}
                          className="rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold px-2.5 h-7 gap-1 cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                          <span>Remove</span>
                        </Button>
                      }
                    />
                    <TooltipContent side="bottom">Reset to initials</TooltipContent>
                  </Tooltip>
                )}
              </div>
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
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="size-3.5 text-primary" />
                WhatsApp Direct Booking Number
              </label>
              {!canWhatsapp && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[9px] font-mono font-bold">
                  BASIC+
                </Badge>
              )}
            </div>
            <Input
              type="text"
              disabled={!canWhatsapp}
              value={whatsapp}
              onChange={(e) => onWhatsappChange(e.target.value)}
              placeholder="+971501234567"
              className="h-10 rounded-xl bg-muted/50 border-border text-foreground text-sm font-mono px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <TypographyMuted className="text-[11px] text-muted-foreground">
              {!canWhatsapp
                ? "WhatsApp client inquiries & rapid review links require Basic, Pro, or Studio plan."
                : "Powers one-click WhatsApp client inquiries and rapid review links across the Gulf."}
            </TypographyMuted>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="size-3.5 text-primary" />
                Player &amp; Button Accent Color
              </label>
              {!canBranding && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[9px] font-mono font-bold">
                  PRO+
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {ACCENTS.map((preset) => {
                const isSelected = accent.toLowerCase() === preset.color.toLowerCase();
                const textColor = getContrastForeground(preset.color);
                return (
                  <Tooltip key={preset.color}>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          onClick={() => onAccentChange(preset.color)}
                          style={{ backgroundColor: preset.color }}
                          className={`size-8 sm:size-9 rounded-full flex items-center justify-center transition-all border-2 cursor-pointer p-0 ${
                            isSelected
                              ? "border-white scale-110 shadow-lg ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                              : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                          } ${!canBranding ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          {isSelected && <Check className="size-4 font-bold" style={{ color: textColor }} />}
                        </Button>
                      }
                    />
                    <TooltipContent side="top">
                      {!canBranding
                        ? "Custom accent colors require Pro, Studio, or Enterprise"
                        : `${preset.name} (${preset.color})`}
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Custom Color Picker & Hex Input */}
              <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-border">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <label
                        className="size-8 sm:size-9 rounded-full cursor-pointer relative overflow-hidden border-2 border-border hover:border-primary transition-all flex items-center justify-center shadow-inner shrink-0"
                        style={{ backgroundColor: accent }}
                      >
                        <input
                          type="color"
                          disabled={!canBranding}
                          value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#F5551D"}
                          onChange={(e) => onAccentChange(e.target.value)}
                          className="opacity-0 absolute inset-0 size-full cursor-pointer"
                        />
                      </label>
                    }
                  />
                  <TooltipContent side="top">Custom color picker</TooltipContent>
                </Tooltip>
                <div className="flex items-center bg-muted/60 border border-border rounded-xl px-2.5 h-8 text-xs font-mono text-muted-foreground focus-within:border-ring">
                  <span className="select-none font-bold text-muted-foreground mr-0.5">#</span>
                  <input
                    type="text"
                    disabled={!canBranding}
                    value={accent.replace(/^#/, "").toUpperCase()}
                    maxLength={6}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                      onAccentChange("#" + v);
                    }}
                    placeholder="F5551D"
                    className="bg-transparent text-foreground uppercase focus:outline-none w-14 font-mono font-bold text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filmmaker Showcase Stats Card */}
        <div className="pt-2 border-t border-border space-y-3">
          <div>
            <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Film className="size-3.5 text-primary" />
              Filmmaker Showcase Stats &amp; Badges
            </div>
            <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
              These 3 counter badges appear prominently on your public About section to communicate scale and experience.
            </TypographyMuted>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Film className="size-3 text-primary" />
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
                <Briefcase className="size-3 text-primary" />
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
                <MapPin className="size-3 text-primary" />
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

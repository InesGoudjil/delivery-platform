"use client";

import React from "react";
import { Film, Image as ImageIcon, FolderKanban, Video, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TypographySpan } from "@/components/ui/typography";
import type { MediaCardType } from "./types";

export interface MediaBadgeProps {
  type?: MediaCardType;
  label?: string;
  className?: string;
}

export function MediaBadge({ type = "film", label, className = "" }: MediaBadgeProps) {
  if (type === "still" || type === "photo") {
    return (
      <Badge
        variant="outline"
        className={`bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white uppercase tracking-wider gap-1.5 px-2 py-0.5 rounded-md shadow-md ${className}`}
      >
        <ImageIcon className="size-3 text-zinc-300" />
        <TypographySpan>{label || (type === "photo" ? "PHOTO" : "STILL")}</TypographySpan>
      </Badge>
    );
  }

  if (type === "project") {
    return (
      <Badge
        variant="outline"
        className={`bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white uppercase tracking-wider gap-1.5 px-2 py-0.5 rounded-md shadow-md ${className}`}
      >
        <FolderKanban className="size-3 text-zinc-300" />
        <TypographySpan>{label || "PROJECT"}</TypographySpan>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white uppercase tracking-wider gap-1.5 px-2 py-0.5 rounded-md shadow-md ${className}`}
    >
      {type === "video" ? (
        <Video className="size-3 text-zinc-300" />
      ) : (
        <Film className="size-3 text-zinc-300" />
      )}
      <TypographySpan>{label || (type === "video" ? "VIDEO" : "FILM")}</TypographySpan>
    </Badge>
  );
}

export function AssetCountBadge({
  count,
  className = "",
}: {
  count: number | string;
  className?: string;
}) {
  const display = typeof count === "number" ? `${count} assets` : count.includes("assets") ? count : `${count} assets`;
  return (
    <Badge
      variant="outline"
      className={`bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-medium text-zinc-200 px-2.5 py-0.5 rounded-full shadow-md ${className}`}
    >
      <TypographySpan>{display}</TypographySpan>
    </Badge>
  );
}

export function FeaturedBadge({ className = "" }: { className?: string }) {
  return (
    <Badge
      className={`bg-primary text-primary-foreground text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 border-none ${className}`}
    >
      <Star className="size-2.5 fill-current" />
      <TypographySpan>FEATURED</TypographySpan>
    </Badge>
  );
}

export function HeroBadge({ className = "" }: { className?: string }) {
  return (
    <Badge
      className={`bg-primary text-primary-foreground text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 border-none ${className}`}
    >
      <Sparkles className="size-2.5 fill-current" />
      <TypographySpan>HERO</TypographySpan>
    </Badge>
  );
}

export function VersionBadge({
  versionNumber = 1,
  totalVersions,
  className = "",
}: {
  versionNumber?: number;
  totalVersions?: number;
  className?: string;
}) {
  return (
    <div
      className={`px-2 h-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-[10px] font-bold text-white tracking-wider shadow-md ${className}`}
    >
      V{versionNumber}
      {totalVersions && totalVersions > 1 && (
        <TypographySpan className="text-[9px] text-primary ml-1 font-semibold">
          ({totalVersions})
        </TypographySpan>
      )}
    </div>
  );
}

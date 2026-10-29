"use client";

import React from "react";
import { Play, Maximize2 } from "lucide-react";
import { TypographyH4, TypographyMuted } from "@/components/ui/typography";

export interface PlayButtonOverlayProps {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
}

export function PlayButtonOverlay({
  className = "",
  iconClassName = "",
  size = "md",
}: PlayButtonOverlayProps) {
  const sizeClasses =
    size === "sm"
      ? "size-8"
      : size === "lg"
      ? "size-12"
      : "size-9 sm:size-10";

  const iconSizes =
    size === "sm"
      ? "size-3.5 ml-0.5"
      : size === "lg"
      ? "size-5 ml-0.5"
      : "size-4 ml-0.5";

  return (
    <div
      className={`${sizeClasses} rounded-full bg-black/55 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary/50 ${className}`}
    >
      <Play className={`${iconSizes} fill-current ${iconClassName}`} />
    </div>
  );
}

export function ZoomButtonOverlay({
  className = "",
  iconClassName = "",
  size = "md",
}: {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses =
    size === "sm"
      ? "size-8"
      : size === "lg"
      ? "size-12"
      : "size-9 sm:size-10";

  const iconSizes =
    size === "sm"
      ? "size-3.5"
      : size === "lg"
      ? "size-5"
      : "size-4 stroke-[2.2]";

  return (
    <div
      className={`${sizeClasses} rounded-full bg-black/55 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary/50 ${className}`}
    >
      <Maximize2 className={`${iconSizes} ${iconClassName}`} />
    </div>
  );
}

export interface CardBottomOverlayProps {
  title?: string;
  subtitle?: string;
  textAlign?: "center" | "left";
  showSubtitle?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function CardBottomOverlay({
  title,
  subtitle,
  textAlign = "center",
  showSubtitle = true,
  className = "",
  children,
}: CardBottomOverlayProps) {
  const isCenter = textAlign === "center";

  return (
    <div
      className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pt-12 pb-3.5 px-3.5 sm:px-4 pointer-events-none flex flex-col justify-end ${
        isCenter ? "items-center text-center" : "items-start text-left"
      } space-y-0.5 ${className}`}
    >
      {title && (
        <TypographyH4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug truncate font-heading group-hover:text-primary transition-colors max-w-full drop-shadow-sm">
          {title}
        </TypographyH4>
      )}
      {showSubtitle && subtitle && (
        <TypographyMuted className="text-[10px] sm:text-[11px] text-zinc-300/80 truncate max-w-full font-sans leading-tight">
          {subtitle}
        </TypographyMuted>
      )}
      {children}
    </div>
  );
}

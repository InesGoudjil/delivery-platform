"use client";

import React from "react";
import type { MediaGridProps } from "./types";

export function parseItemAspectRatio(ar?: string | number | null): number | null {
  if (!ar) return null;
  if (typeof ar === "number") return ar > 0 && isFinite(ar) ? ar : null;
  if (typeof ar === "string") {
    if (ar.includes(":")) {
      const [w, h] = ar.split(":").map(Number);
      if (w && h && !isNaN(w) && !isNaN(h) && h > 0) return w / h;
    }
    const val = parseFloat(ar);
    if (!isNaN(val) && val > 0 && isFinite(val)) return val;
  }
  return null;
}

export function getMediaGridClasses(isMasonry: boolean, cardSize: "S" | "M" | "L" = "M"): string {
  if (isMasonry) {
    switch (cardSize) {
      case "S":
        return "columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3.5";
      case "L":
        return "columns-1 sm:columns-2 lg:columns-3 gap-6";
      case "M":
      default:
        return "columns-1 sm:columns-2 md:columns-3 lg:columns-3 xl:columns-4 gap-4 sm:gap-5";
    }
  }

  switch (cardSize) {
    case "S":
      return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5";
    case "L":
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
    case "M":
    default:
      return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5";
  }
}

export function MediaGrid({
  children,
  isMasonry = false,
  cardSize = "M",
  className = "",
  ...props
}: MediaGridProps) {
  const layoutClass = getMediaGridClasses(isMasonry, cardSize);
  return (
    <div className={`${layoutClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

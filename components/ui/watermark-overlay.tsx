"use client";

import { useId } from "react";
import { Shield } from "lucide-react";

export interface WatermarkOverlayProps {
  /**
   * Main text to display in the watermark pattern (e.g. Workspace or Studio name).
   * Defaults to "CONFIDENTIAL REVIEW"
   */
  text?: string;
  /**
   * Secondary text to display staggered in the pattern.
   * Defaults to "FOR REVIEW ONLY"
   */
  subtext?: string;
  /**
   * Density and size variant.
   * "card" for thumbnail cards, "player" for full review player, "subtle" for lighter display.
   */
  variant?: "card" | "player" | "subtle";
  /**
   * Optional opacity override (between 0.05 and 0.9).
   */
  opacity?: number;
  /**
   * Optional custom className.
   */
  className?: string;
  /**
   * Whether to display a small status badge (e.g. "PREVIEW WATERMARK ACTIVE") in the corner.
   */
  showBadge?: boolean;
}

export function WatermarkOverlay({
  text = "CONFIDENTIAL REVIEW",
  subtext = "FOR REVIEW ONLY",
  variant = "player",
  opacity,
  className = "",
  showBadge = false,
}: WatermarkOverlayProps) {
  const rawId = useId();
  const patternId = `wm-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const isCard = variant === "card";
  const isSubtle = variant === "subtle";

  // Sizing and density based on context
  const patternWidth = isCard ? 230 : 360;
  const patternHeight = isCard ? 75 : 110;
  const fontSize = isCard ? 9.5 : 12.5;

  const defaultOpacity = isSubtle ? 0.16 : isCard ? 0.28 : 0.22;
  const activeOpacity = opacity !== undefined ? opacity : defaultOpacity;

  const primaryText = (text || "CONFIDENTIAL REVIEW").trim().toUpperCase();
  const secondaryText = (subtext || "FOR REVIEW ONLY").trim().toUpperCase();

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none z-20 overflow-hidden ${className}`}
      aria-hidden="true"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={patternId}
            width={patternWidth}
            height={patternHeight}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-24)"
          >
            {/* Primary Row */}
            <text
              x="16"
              y={patternHeight * 0.38}
              fill={`rgba(255, 255, 255, ${activeOpacity})`}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              fontSize={fontSize}
              fontWeight="800"
              letterSpacing="0.16em"
              style={{
                textTransform: "uppercase",
                filter: "drop-shadow(0px 1px 3px rgba(0,0,0,0.85))",
              }}
            >
              {primaryText}
            </text>

            {/* Staggered Secondary Row */}
            <text
              x={patternWidth / 2 + 10}
              y={patternHeight * 0.88}
              fill={`rgba(255, 255, 255, ${activeOpacity * 0.85})`}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              fontSize={fontSize * 0.88}
              fontWeight="700"
              letterSpacing="0.14em"
              style={{
                textTransform: "uppercase",
                filter: "drop-shadow(0px 1px 3px rgba(0,0,0,0.85))",
              }}
            >
              {secondaryText}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* Optional Corner Security Pill */}
      {showBadge && (
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white/90 shadow-lg">
          <Shield className="size-3 text-[#f5551d]" />
          <span>PREVIEW WATERMARK ACTIVE</span>
        </div>
      )}
    </div>
  );
}

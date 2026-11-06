"use client";

import React, { useMemo } from "react";
import { generateAccentVariables } from "@/lib/theme-utils";

interface AmbientBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  variant?: "full" | "hero" | "subtle";
  animated?: boolean;
  showNoise?: boolean;
  accentColor?: string;
}

/**
 * Production-ready ambient cinematic glow background.
 *
 * Dynamically retints to the workspace or portfolio accent color via CSS variables
 * (--acc-rgb, --acc2-rgb) with high-gamut color blending and hardware-accelerated drift.
 */
export function AmbientBackground({
  children,
  className = "",
  variant = "full",
  animated = true,
  showNoise = true,
  accentColor,
}: AmbientBackgroundProps) {
  const isHero = variant === "hero";
  const isSubtle = variant === "subtle";

  const inlineStyles: React.CSSProperties = useMemo(() => {
    if (!accentColor) return {};
    return generateAccentVariables(accentColor) as React.CSSProperties;
  }, [accentColor]);

  const renderGlowElements = () => (
    <>
      {/* Single Composited Soft Radial Mesh (Zero Real-Time Gaussian Blur Filter Pass) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-out ${
          isHero ? "opacity-80" : isSubtle ? "opacity-40" : "opacity-75"
        }`}
        style={{
          background: [
            "radial-gradient(650px 500px at 12% 18%, rgba(var(--acc-rgb, 245, 85, 29), 0.32) 0%, rgba(223, 24, 116, 0.16) 45%, transparent 75%)",
            "radial-gradient(680px 520px at 88% 28%, rgba(136, 23, 159, 0.28) 0%, rgba(var(--acc-rgb, 245, 85, 29), 0.18) 48%, transparent 78%)",
            "radial-gradient(700px 380px at 50% 95%, rgba(var(--acc-rgb, 245, 85, 29), 0.22) 0%, rgba(223, 24, 116, 0.1) 50%, transparent 80%)",
          ].join(", "),
        }}
      />

      {/* High-Fidelity SVG Film Grain / Noise Overlay to eliminate gradient banding */}
      {showNoise && (
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}
    </>
  );

  if (!children) {
    return (
      <div
        className={`pointer-events-none fixed inset-0 z-0 overflow-hidden select-none ${className}`}
        aria-hidden="true"
        style={inlineStyles}
      >
        {renderGlowElements()}
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={inlineStyles}>
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
        aria-hidden="true"
      >
        {renderGlowElements()}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default AmbientBackground;

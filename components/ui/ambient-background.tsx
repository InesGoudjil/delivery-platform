"use client";

import React from "react";

interface AmbientBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  variant?: "full" | "hero" | "subtle";
  animated?: boolean;
  showNoise?: boolean;
}

/**
 * Production-ready ambient cinematic glow background.
 *
 * Replaces low-resolution stretched raster images with pure CSS vector gradients,
 * high-gamut color blending, hardware-accelerated GPU drift, and SVG noise
 * to eliminate dark-mode gradient banding.
 */
export function AmbientBackground({
  children,
  className = "",
  variant = "full",
  animated = true,
  showNoise = true,
}: AmbientBackgroundProps) {
  const isHero = variant === "hero";
  const isSubtle = variant === "subtle";

  const renderGlowElements = () => (
    <>
      {/* Left Glowing Fluid Ribbon */}
      <div
        className={`absolute rounded-full transition-opacity duration-1000 ${
          animated ? "animate-aura-drift-left" : ""
        } ${
          isHero
            ? "-top-24 -left-40 h-[700px] w-[500px] opacity-85 blur-[90px]"
            : isSubtle
            ? "-top-32 -left-48 h-[750px] w-[520px] opacity-45 blur-[120px]"
            : "-top-24 -left-44 h-[900px] w-[600px] opacity-80 blur-[95px]"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at 35% 45%, rgba(245, 85, 29, 0.75) 0%, rgba(223, 24, 116, 0.55) 42%, rgba(136, 23, 159, 0.35) 75%, transparent 100%)",
          transform: "rotate(-18deg) translate3d(0, 0, 0)",
          willChange: animated ? "transform" : "auto",
        }}
      />

      {/* Right Glowing Fluid Ribbon */}
      <div
        className={`absolute rounded-full transition-opacity duration-1000 ${
          animated ? "animate-aura-drift-right" : ""
        } ${
          isHero
            ? "top-12 -right-32 h-[750px] w-[520px] opacity-80 blur-[90px]"
            : isSubtle
            ? "top-1/4 -right-44 h-[800px] w-[540px] opacity-40 blur-[120px]"
            : "top-16 -right-40 h-[950px] w-[620px] opacity-75 blur-[100px]"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at 65% 45%, rgba(136, 23, 159, 0.65) 0%, rgba(245, 85, 29, 0.55) 45%, rgba(255, 138, 69, 0.3) 78%, transparent 100%)",
          transform: "rotate(24deg) translate3d(0, 0, 0)",
          willChange: animated ? "transform" : "auto",
        }}
      />

      {/* Center-Bottom Subtle Warm Core */}
      <div
        className={`absolute -bottom-28 left-1/2 -translate-x-1/2 rounded-full blur-[110px] ${
          isSubtle
            ? "h-[350px] w-[600px] opacity-30"
            : "h-[450px] w-[800px] opacity-50"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(245, 85, 29, 0.5) 0%, rgba(223, 24, 116, 0.25) 45%, transparent 80%)",
          transform: "translate3d(-50%, 0, 0)",
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
      >
        {renderGlowElements()}
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
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

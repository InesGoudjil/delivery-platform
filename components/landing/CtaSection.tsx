"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { TypographyH2, TypographyLead } from "@/components/ui/typography";

interface CtaSectionProps {
  onStartTrial: () => void;
}

export function CtaSection({ onStartTrial }: CtaSectionProps) {
  return (
    <section className="py-20">
      <div
        className="relative overflow-hidden rounded-[32px] bg-cover bg-center bg-no-repeat p-10 shadow-2xl sm:p-16 border border-white/10"
        style={{
          backgroundImage: "url('/images/cta.jpg')",
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Orange Gradient Glow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff9a4e]/20 via-[#f5551d]/20 to-[#7a2109]/60" />

        {/* Grain */}
        <div className="grain absolute inset-0 opacity-10" />

        {/* Content */}
        <div className="relative z-10 text-center">
          <TypographyH2 className="text-3xl sm:text-5xl font-black text-white leading-tight font-display">
            Ready to elevate your video delivery?
          </TypographyH2>

          <TypographyLead className="mx-auto mt-4 max-w-xl text-base sm:text-lg font-medium text-white/90 font-sans">
            Join top filmmakers in Dubai, Abu Dhabi, and across the Gulf sending
            polished cuts today.
          </TypographyLead>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onStartTrial}
              className="glass-btn btn-glass-layer cursor-pointer px-8 py-4 text-base font-bold"
            >
              Start Your 7-Day Free Trial
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

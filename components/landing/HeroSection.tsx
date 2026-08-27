"use client";

import React from "react";
import { Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  TypographyH1,
  TypographyLead,
  Typography,
} from "@/components/ui/typography";

interface HeroSectionProps {
  onOpenDemo: () => void;
  onStartTrial: () => void;
}

export function HeroSection({ onOpenDemo, onStartTrial }: HeroSectionProps) {
  return (
    <section className="relative my-6 rounded-[28px] overflow-hidden liquid-glass p-8 sm:p-14 text-center flex flex-col items-center justify-center shadow-2xl max-w-6xl mx-auto">
      {/* Subtle Ambient Glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#f5551d]/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Target Audience Badge */}
      <div className="relative z-10 glass-badge gap-2 px-4 py-1.5 mb-6">
        <span className="w-2 h-2 rounded-full bg-[#f5551d] animate-pulse" />
        Built for Filmmakers & Video Creators in the Gulf
      </div>

      {/* Main Value Proposition Title */}
      <TypographyH1 className="relative z-10 max-w-4xl font-display">
        Deliver video cuts <br className="hidden sm:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f5551d] via-[#ff8a45] to-[#f6f3ec]">
          like a high-end studio.
        </span>
      </TypographyH1>

      {/* Subtitle */}
      <TypographyLead className="relative z-10 mt-6 max-w-2xl text-[#aeaeb4] font-sans">
        Your video portfolio, frame-accurate client review room, and instant
        WhatsApp delivery — built to eliminate client friction and sign off cuts
        faster.
      </TypographyLead>

      {/* Action Buttons */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 mt-8">
        <button
          onClick={onStartTrial}
          className="glass-btn btn-glass-layer cursor-pointer px-7 py-3.5 text-base flex items-center gap-2"
        >
          Start Free Trial <ArrowRight className="size-5" />
        </button>
        <button
          onClick={onOpenDemo}
          className="glass-btn-ghost btn-glass-layer cursor-pointer px-7 py-3.5 text-base flex items-center gap-2"
        >
          <Play className="size-4 fill-current text-[#f5551d]" />
          See Live Client Room Demo
        </button>
      </div>

      {/* Interactive Hero Preview Card Mockup */}
      <div
        className="relative z-10 mt-12 w-full max-w-3xl group cursor-pointer"
        onClick={onOpenDemo}
      >
        <div className="relative rounded-2xl overflow-hidden glass-card p-2 shadow-2xl transition-all duration-300 group-hover:border-[#f5551d]/50 group-hover:shadow-[#f5551d]/20">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-[#3a1a10] to-[#7a2f18] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative z-10 w-16 h-16 rounded-full bg-[#101012]/80 border border-white/30 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-[#f5551d] group-hover:border-[#f5551d] transition-all">
              <Play className="size-7 fill-current text-[#f6f3ec] group-hover:text-[#160a03] ml-1 transition-colors" />
            </div>
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="glass-badge font-mono text-[11px]">
                LIVE CLIENT ROOM DEMO
              </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between text-xs text-[#aeaeb4]">
              <Typography
                as="span"
                variant="small"
                className="font-mono bg-black/60 px-2.5 py-1 rounded text-[#f6f3ec]"
              >
                Omakase Teaser — V2
              </Typography>
              <Typography
                as="span"
                variant="small"
                className="font-mono bg-black/60 px-2.5 py-1 rounded text-[#aeaeb4]"
              >
                00:47 / 1080p 60fps
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import { Play, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface HeroSectionProps {
  onOpenDemo: () => void;
  onStartTrial: () => void;
}

export function HeroSection({ onOpenDemo, onStartTrial }: HeroSectionProps) {
  return (
    <section className="relative my-6 rounded-[28px] overflow-hidden border border-white/10 bg-gradient-to-b from-[#18181c] via-[#141416] to-[#0a0a0b] p-8 sm:p-14 text-center flex flex-col items-center justify-center shadow-2xl max-w-6xl mx-auto">
      {/* Subtle Ambient Glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#f5551d]/15 blur-[120px] rounded-full pointer-events-none" />

      <Badge variant="orange" className="relative z-10 gap-2 px-3.5 py-1.5 rounded-full mb-6 font-semibold">
        <span className="w-2 h-2 rounded-full bg-[#f5551d] animate-pulse" />
        Built for Filmmakers & Video Creators in the Gulf
      </Badge>

      <h1 className="disp relative z-10 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#f6f3ec] leading-[1.02] max-w-4xl">
        Deliver video cuts <br className="hidden sm:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f5551d] via-[#ff8a45] to-[#f6f3ec]">
          like a high-end studio.
        </span>
      </h1>

      <p className="relative z-10 mt-6 text-base sm:text-lg text-[#9a9a9f] max-w-2xl leading-relaxed">
        Your video portfolio, frame-accurate client review room, and instant WhatsApp delivery — built to eliminate client friction and sign off cuts faster.
      </p>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 mt-8">
        <Button
          onClick={onStartTrial}
          size="lg"
          className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-[#160a03] font-bold px-7 py-3.5 text-base shadow-xl shadow-[#f5551d]/25 transition-all hover:-translate-y-0.5 flex items-center gap-2"
        >
          Start Free Trial <ArrowRight className="size-5" />
        </Button>
        <Button
          onClick={onOpenDemo}
          variant="outline"
          size="lg"
          className="rounded-full border-white/20 text-[#f6f3ec] hover:bg-white/10 hover:border-white/40 px-7 py-3.5 text-base transition-all flex items-center gap-2"
        >
          <Play className="size-4 fill-current text-[#f5551d]" />
          See Live Client Room Demo
        </Button>
      </div>

      {/* Interactive Hero Preview Card Mockup */}
      <div className="relative z-10 mt-12 w-full max-w-3xl group cursor-pointer" onClick={onOpenDemo}>
        <Card className="relative rounded-2xl overflow-hidden border-white/15 bg-[#141416] p-2 shadow-2xl transition-all duration-300 group-hover:border-[#f5551d]/50 group-hover:shadow-[#f5551d]/10">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-[#3a1a10] to-[#7a2f18] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative z-10 w-16 h-16 rounded-full bg-[#101012]/80 border border-white/30 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-[#f5551d] group-hover:border-[#f5551d] transition-all">
              <Play className="size-7 fill-current text-[#f6f3ec] group-hover:text-[#160a03] ml-1 transition-colors" />
            </div>
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <Badge variant="orange" className="font-mono text-[11px]">
                LIVE CLIENT ROOM DEMO
              </Badge>
            </div>
            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between text-xs text-[#9a9a9f]">
              <span className="font-mono bg-black/60 px-2 py-1 rounded text-[#f6f3ec]">Omakase Teaser — V2</span>
              <span className="font-mono bg-black/60 px-2 py-1 rounded">00:47 / 1080p 60fps</span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

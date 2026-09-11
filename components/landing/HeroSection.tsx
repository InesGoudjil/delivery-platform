"use client";

import React from "react";
import { Star, ArrowRight } from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  onOpenDemo: () => void;
  onStartTrial: () => void;
}

export function HeroSection({ onOpenDemo, onStartTrial }: HeroSectionProps) {
  return (
    <section className="relative pt-8 pb-16 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#f5551d]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-purple-900/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Partner Program Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5551d]/40 bg-[#f5551d]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#ff7948]">
              <Star className="size-3.5 fill-current" />
              <span>PARTNER PROGRAM — APPLICATIONS OPEN</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-extrabold text-white tracking-tight leading-[1.05] font-display">
              DELIVER FILMS <br />
              LIKE A STUDIO.
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-[#b4b4bb] max-w-xl font-normal leading-relaxed">
              Your portfolio, client feedback, and delivery — in one place, built for elite filmmakers, videographers, and production agencies.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f5551d] to-[#df430f] px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-xl shadow-[#f5551d]/30 transition-all hover:scale-[1.02] hover:shadow-[#f5551d]/50"
              >
                START FOR FREE <ArrowRight className="size-4" />
              </Link>
              <button
                onClick={onOpenDemo}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-white/10 hover:border-white/40 transition-all"
              >
                SEE A DELIVERY
              </button>
            </div>
          </div>

          {/* Right Column: High-Fidelity UI Mockup with Orange Glow Backdrop */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-[32px] p-4 sm:p-8 bg-gradient-to-tr from-[#cf3808] via-[#e64713] to-[#88179f] shadow-2xl overflow-hidden border border-white/10 group">
              {/* Outer glow container */}
              <div className="absolute inset-0 bg-radial from-amber-500/20 via-transparent to-transparent opacity-60 pointer-events-none" />

              {/* Main Mockup Screen Container */}
              <div className="relative rounded-2xl bg-[#0f0f13] border border-white/15 p-4 shadow-2xl space-y-4 transform transition-transform duration-500 group-hover:scale-[1.01]">
                {/* Header bar of mockup */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    MERCEDES-AMG GT — CineSpace Review
                  </span>
                  <div className="flex gap-1.5">
                    <span className="text-[10px] bg-[#f5551d] text-white px-2 py-0.5 rounded font-bold">LIVE</span>
                  </div>
                </div>

                {/* Content area: Video preview & sidebar comments */}
                <div className="grid grid-cols-12 gap-3">
                  {/* Left sub-box: Comments drawer */}
                  <div className="col-span-4 bg-[#16161b] rounded-xl p-2.5 space-y-2 border border-white/5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-300 uppercase">FEEDBACK</span>
                      <span className="text-[9px] text-[#f5551d] font-mono">00:24.12</span>
                    </div>
                    <div className="bg-[#202028] p-2 rounded-lg text-[10px] text-zinc-300">
                      <span className="font-semibold text-white block">Client Note:</span>
                      "Intro grading looks stunning! Can we trim frame 12?"
                    </div>
                    <div className="bg-[#202028] p-2 rounded-lg text-[10px] text-zinc-300">
                      <span className="font-semibold text-[#86b98f] block">✓ Sign-off locked</span>
                      "Final cut approved for export."
                    </div>
                  </div>

                  {/* Right sub-box: Video player preview */}
                  <div className="col-span-8 bg-black rounded-xl overflow-hidden border border-white/10 relative aspect-video flex flex-col justify-between p-3">
                    <img
                      src="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80"
                      alt="Mercedes AMG GT"
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                    <div className="relative z-10 flex justify-between">
                      <span className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-mono">
                        MERCEDES-AMG GT
                      </span>
                      <span className="bg-[#86b98f] text-black px-2 py-0.5 rounded text-[10px] font-bold">
                        APPROVED
                      </span>
                    </div>
                    <div className="relative z-10 flex justify-between items-end">
                      <div className="flex gap-1">
                        <span className="bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">V1</span>
                        <span className="bg-[#f5551d] text-white px-1.5 py-0.5 rounded text-[9px] font-bold">FINAL</span>
                      </div>
                      <span className="bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-zinc-300">4K PRORES</span>
                    </div>
                  </div>
                </div>

                {/* Bottom sub-box: Project Files Grid */}
                <div className="border-t border-white/10 pt-3 text-left">
                  <span className="text-[11px] font-bold text-white tracking-wider uppercase block mb-2">
                    PROJECT FILES
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=300&q=80",
                      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=300&q=80",
                      "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=300&q=80",
                      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=300&q=80",
                    ].map((url, i) => (
                      <div key={i} className="aspect-video rounded-lg overflow-hidden border border-white/10 relative bg-zinc-900 group/img">
                        <img src={url} alt="file" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" />
                        <span className="absolute bottom-1 right-1 bg-black/70 text-[8px] text-white px-1 rounded font-mono">4K</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subhead transition text below hero */}
        <div className="mt-16 text-center">
          <p className="text-sm sm:text-base text-[#8e8e96] font-medium">
            Stop sending “Boring links” and send something worthy of your work
          </p>
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface CtaSectionProps {
  onStartTrial: () => void;
}

export function CtaSection({ onStartTrial }: CtaSectionProps) {
  return (
    <section className="py-16">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#ce3a09] via-[#df4510] to-[#7f1307] p-12 sm:p-20 text-center shadow-2xl border border-white/10">
        {/* Ambient Dark Image & Glow Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-black/40 to-black/80 pointer-events-none" />
        <div
          className="absolute inset-0 opacity-25 bg-cover bg-center mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80')",
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight uppercase font-display">
            START DELIVERING <br />
            LIKE A STUDIO.
          </h2>

          <div>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f5551d] to-[#e0430e] px-8 py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-white shadow-2xl shadow-[#f5551d]/50 hover:scale-105 transition-all active:scale-95"
            >
              GET STARTED <ArrowRight className="size-4 sm:size-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

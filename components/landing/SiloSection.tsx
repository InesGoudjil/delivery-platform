"use client";

import React from "react";
import { Lock, Film, Clock } from "lucide-react";

export function SiloSection() {
  return (
    <section id="silo" className="py-20 text-center space-y-12">
      {/* Top Badge */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#f5551d]/40 bg-[#f5551d]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#ff7948]">
          <Lock className="size-3.5" />
          <span>SECURE ARCHIVE</span>
        </div>
      </div>

      {/* Main Title & Description */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <h2 className="text-5xl sm:text-7xl font-black text-[#f5551d] tracking-tight font-display">
          THE SILO
        </h2>
        <p className="text-base sm:text-lg text-[#aeaeb4] leading-relaxed">
          Delivered a project? Move it to The Silo — secure cold storage that frees up your active space, and pulls back the moment a client returns.
        </p>
        <div className="pt-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-white font-display">
            1 TB · <span className="text-[#f5551d]">$79/YR</span>
          </span>
        </div>
      </div>

      {/* 3 Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {[
          {
            icon: Film,
            title: "Free up your space",
            description:
              "Archive finished, client-approved work so your active storage stays clear for new projects.",
          },
          {
            icon: Lock,
            title: "Safe for the long haul",
            description:
              "Your deliverables sit in secure long-term storage — nothing lost, nothing expiring.",
          },
          {
            icon: Clock,
            title: "Restore anytime",
            description:
              "Need it back? Pull a project out of The Silo in 24-48 hours, ready to re-deliver.",
          },
        ].map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-[#121217] p-8 shadow-xl space-y-4 hover:border-white/20 transition-all"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#2a1b18] text-[#f5551d] border border-[#f5551d]/20">
                <IconComponent className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">
                {card.title}
              </h3>
              <p className="text-sm text-[#aeaeb4] leading-relaxed">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Subtext */}
      <p className="text-xs italic text-[#71717a]">
        On Pro & Studio · $79/yr per TB · restore in 24-48h.
      </p>
    </section>
  );
}

"use client";

import React from "react";
import { Film, Briefcase, MapPin, MessageSquare } from "lucide-react";
import { FilmmakerProfile } from "@/lib/portfolio-data";
import { usePortfolioModal } from "./portfolio-context";
import { useImageColor } from "@/hooks/use-image-color";

interface PortfolioAboutProps {
  profile: FilmmakerProfile;
}

function formatExperienceDisplay(exp?: string | null): string {
  if (!exp || !exp.trim()) return "6 YRS";
  const val = exp.trim();
  const lower = val.toLowerCase();

  const numMatch = val.match(/^([\d.]+\+?|\+?[\d.]+)/);
  if (numMatch) {
    const num = numMatch[1];
    if (lower.includes("month") || lower.includes("mo")) {
      return `${num} MOS`;
    }
    return `${num} YRS`;
  }

  return val.toUpperCase();
}

export function PortfolioAbout({ profile }: PortfolioAboutProps) {
  const { setIsContactOpen } = usePortfolioModal();
  const extracted = useImageColor(profile.avatar, "#d24e02");

  return (
    <section className="relative rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 overflow-hidden bg-[#0a0a0b] shadow-2xl">
      {/* 🎨 Ambient Color Glow Layers */}
      {/* Desktop horizontal glow: Extracted color on left -> deep black in middle */}
      <div
        className="hidden lg:block absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `linear-gradient(90deg, rgba(${extracted.rgbString}, 0.85) 0%, rgba(${extracted.rgbString}, 0.45) 22%, rgba(${extracted.rgbString}, 0.12) 38%, rgba(10, 10, 11, 0.95) 48%, #0a0a0b 58%, #0a0a0b 100%)`,
        }}
      />

      {/* Mobile vertical glow: Extracted color at top -> deep black down */}
      <div
        className="lg:hidden absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `linear-gradient(180deg, rgba(${extracted.rgbString}, 0.8) 0%, rgba(${extracted.rgbString}, 0.3) 30%, #0a0a0b 55%, #0a0a0b 100%)`,
        }}
      />

      {/* Radial ambient glow behind subject */}
      <div
        className="absolute -left-16 top-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full blur-3xl pointer-events-none opacity-40 transition-all duration-700"
        style={{
          background: extracted.hex,
        }}
      />

      {/* 👤 Left Portrait: Desktop (Anchored flush to bottom and left with seamless fade) */}
      <div className="hidden lg:block absolute inset-y-0 left-0 w-[45%] overflow-hidden pointer-events-none select-none">
        <img
          src={profile.avatar}
          alt={profile.name}
          className="w-full h-full object-cover object-[center_12%]"
          style={{
            maskImage:
              "linear-gradient(to right, black 40%, rgba(0, 0, 0, 0.45) 70%, transparent 95%)",
            WebkitMaskImage:
              "linear-gradient(to right, black 40%, rgba(0, 0, 0, 0.45) 70%, transparent 95%)",
          }}
        />
      </div>

      {/* 👤 Left Portrait: Mobile (Stacked on top with downward fade) */}
      <div className="lg:hidden relative w-full h-[360px] sm:h-[420px] overflow-hidden pointer-events-none select-none">
        <img
          src={profile.avatar}
          alt={profile.name}
          className="w-full h-full object-cover object-[center_15%]"
          style={{
            maskImage:
              "linear-gradient(to bottom, black 50%, rgba(0, 0, 0, 0.3) 80%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 50%, rgba(0, 0, 0, 0.3) 80%, transparent 100%)",
          }}
        />
      </div>

      {/* 📄 Right Content Column */}
      <div className="relative z-10 lg:ml-[42%] p-6 sm:p-10 lg:py-12 lg:pr-14 lg:pl-6 space-y-6">
        {/* Eyebrow & Name */}
        <div className="space-y-2">
          <span
            className="text-xs sm:text-sm font-bold uppercase tracking-widest inline-block transition-colors duration-500"
            style={{ color: extracted.hex }}
          >
            About
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight uppercase">
            {profile.name}
          </h2>
        </div>

        {/* Bio Paragraph */}
        <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed max-w-xl">
          {profile.bio}
        </p>

        {/* 3 Stat Badges */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl">
          {/* Stat 1: Films delivered */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-start gap-1 backdrop-blur-sm">
            <Film
              className="size-4 mb-0.5 transition-colors duration-500"
              style={{ color: extracted.hex }}
            />
            <div className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight">
              {profile.stats.filmsDelivered}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-400 font-sans">
              Films delivered
            </div>
          </div>

          {/* Stat 2: Experience */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-start gap-1 backdrop-blur-sm">
            <Briefcase
              className="size-4 mb-0.5 transition-colors duration-500"
              style={{ color: extracted.hex }}
            />
            <div className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight">
              {formatExperienceDisplay(profile.stats.experienceYears)}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-400 font-sans">
              Experience
            </div>
          </div>

          {/* Stat 3: Based */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-start gap-1 backdrop-blur-sm">
            <MapPin
              className="size-4 mb-0.5 transition-colors duration-500"
              style={{ color: extracted.hex }}
            />
            <div className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight">
              {profile.stats.based}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-400 font-sans">
              Based
            </div>
          </div>
        </div>

        {/* 💬 Action Button: Opens Contact Modal */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsContactOpen(true)}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-white text-xs sm:text-sm font-black tracking-wider uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border"
            style={{
              background: `linear-gradient(135deg, rgba(${extracted.rgbString}, 0.85) 0%, rgba(${extracted.rgbString}, 0.5) 100%)`,
              borderColor: `rgba(${extracted.rgbString}, 0.45)`,
              boxShadow: `0 8px 24px -4px rgba(${extracted.rgbString}, 0.35)`,
            }}
          >
            <MessageSquare className="size-4 text-white fill-white/20" />
            <span>GET IN TOUCH</span>
          </button>
        </div>
      </div>
    </section>
  );
}

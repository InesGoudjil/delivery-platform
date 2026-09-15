import React from "react";
import { FilmmakerProfile } from "@/lib/portfolio-data";
import { ContactButton } from "./portfolio-buttons";

interface PortfolioCtaProps {
  profile: FilmmakerProfile;
}

export function PortfolioCta({ profile }: PortfolioCtaProps) {
  return (
    <section className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${profile.cta.image})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/30" />

      <div className="relative z-10 p-8 sm:p-14 lg:p-16 max-w-2xl space-y-6">
        <h2 className="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight uppercase whitespace-pre-line">
          {profile.cta.title}
        </h2>
        <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed">
          {profile.cta.subtitle}
        </p>
        <div>
          <ContactButton
            label="Start A Project"
            className="px-8 py-3.5 rounded-full bg-[#c85332] hover:bg-[#d95d3a] active:scale-95 text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-xl hover:shadow-[#c85332]/25 cursor-pointer"
          />
        </div>
      </div>
    </section>
  );
}

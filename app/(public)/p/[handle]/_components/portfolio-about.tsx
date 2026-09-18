import React from "react";
import Image from "next/image";
import { Film, Briefcase, MapPin } from "lucide-react";
import { FilmmakerProfile } from "@/lib/portfolio-data";
import { ContactButton } from "./portfolio-buttons";

interface PortfolioAboutProps {
  profile: FilmmakerProfile;
}

export function PortfolioAbout({ profile }: PortfolioAboutProps) {
  return (
    <section className="relative rounded-[2.5rem] bg-[#121214] border border-white/10 overflow-hidden shadow-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center p-6 sm:p-10 lg:p-12">
        {/* Left portrait with warm rim lighting */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-sm aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right details & bio */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#f5551d]">
              About
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight uppercase">
              {profile.name}
            </h2>
          </div>

          <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed">
            {profile.bio}
          </p>

          {/* 3 Stat Badges */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg">
            <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 text-center space-y-1">
              <div className="flex justify-center text-[#f5551d]">
                <Film className="size-4" />
              </div>
              <div className="font-heading font-black text-xl sm:text-2xl text-white">
                {profile.stats.filmsDelivered}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                Films delivered
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 text-center space-y-1">
              <div className="flex justify-center text-[#f5551d]">
                <Briefcase className="size-4" />
              </div>
              <div className="font-heading font-black text-xl sm:text-2xl text-white">
                {profile.stats.experienceYears}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                Experience
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 text-center space-y-1">
              <div className="flex justify-center text-[#f5551d]">
                <MapPin className="size-4" />
              </div>
              <div className="font-heading font-black text-xl sm:text-2xl text-white">
                {profile.stats.based}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                Based
              </div>
            </div>
          </div>

          {/* Experience Highlights */}
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
              Career Highlights &amp; Credentials
            </div>
            <div className="space-y-3">
              {profile.experience.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-start justify-between gap-4 text-xs pb-2 border-b border-white/5 last:border-0"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white font-sans">
                        {exp.role}
                      </span>
                      {exp.category && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30 font-medium">
                          {exp.category}
                        </span>
                      )}
                    </div>
                    <div className="text-zinc-400 font-sans flex items-center gap-1.5">
                      <span>{exp.company}</span>
                      {exp.location && (
                        <span className="text-zinc-500">· {exp.location}</span>
                      )}
                    </div>
                    {exp.description && (
                      <p className="text-[11px] text-zinc-400 pt-0.5 leading-relaxed">
                        {exp.description}
                      </p>
                    )}
                  </div>
                  <span className="text-zinc-500 font-mono shrink-0">
                    {exp.period}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Get in touch button */}
          <div className="pt-2">
            <ContactButton
              label="Get In Touch"
              icon={true}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#c85332] hover:bg-[#d95d3a] active:scale-95 text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-lg hover:shadow-[#c85332]/25 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

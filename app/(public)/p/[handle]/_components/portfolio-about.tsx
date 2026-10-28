import React from "react";
import Image from "next/image";
import { Film, Briefcase, MapPin } from "lucide-react";
import { FilmmakerProfile } from "@/lib/portfolio-data";
import { TypographySpan } from "@/components/ui/typography";
import { ContactButton } from "./portfolio-buttons";

interface PortfolioAboutProps {
  profile: FilmmakerProfile;
}

function formatExperienceDisplay(exp?: string | null): string {
  if (!exp || !exp.trim()) return "6 Years";
  const val = exp.trim();
  const lower = val.toLowerCase();

  // If already contains months / mo / mos
  if (lower.includes("month") || lower.includes("mos") || lower.includes("mo")) {
    const numMatch = val.match(/^([\d.]+\+?|\+?[\d.]+)/);
    if (numMatch) {
      const num = numMatch[1];
      return `${num} ${num === "1" ? "Month" : "Months"}`;
    }
    return val;
  }

  // If contains years / yr / yrs
  if (lower.includes("year") || lower.includes("yr")) {
    const numMatch = val.match(/^([\d.]+\+?|\+?[\d.]+)/);
    if (numMatch) {
      const num = numMatch[1];
      return `${num} ${num === "1" ? "Year" : "Years"}`;
    }
    return val;
  }

  // If just a raw number e.g. "6" or "18"
  const rawNumMatch = val.match(/^([\d.]+\+?|\+?[\d.]+)/);
  if (rawNumMatch) {
    const num = rawNumMatch[1];
    return `${num} ${num === "1" ? "Year" : "Years"}`;
  }

  return val;
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
            <TypographySpan className="text-xs  font-bold uppercase tracking-wider text-primary">
              About
            </TypographySpan>
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
              <div className="flex justify-center text-primary">
                <Film className="size-4" />
              </div>
              <div className="font-heading font-black text-xl sm:text-2xl text-white">
                {profile.stats.filmsDelivered}
              </div>
              <div className="text-[11px] text-zinc-400 ">
                Films delivered
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 text-center space-y-1">
              <div className="flex justify-center text-primary">
                <Briefcase className="size-4" />
              </div>
              <div className="font-heading font-black text-xl sm:text-2xl text-white">
                {formatExperienceDisplay(profile.stats.experienceYears)}
              </div>
              <div className="text-[11px] text-zinc-400 ">
                Industry Experience
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 text-center space-y-1">
              <div className="flex justify-center text-primary">
                <MapPin className="size-4" />
              </div>
              <div className="font-heading font-black text-xl sm:text-2xl text-white">
                {profile.stats.based}
              </div>
              <div className="text-[11px] text-zinc-400 ">
                Based
              </div>
            </div>
          </div>

          {/* Experience Highlights */}
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div className="text-xs  font-bold text-zinc-400 uppercase tracking-wider">
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
                      <TypographySpan className="font-bold text-white font-sans">
                        {exp.role}
                      </TypographySpan>
                      {exp.category && (
                        <TypographySpan className="text-[10px]  px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-medium">
                          {exp.category}
                        </TypographySpan>
                      )}
                    </div>
                    <div className="text-zinc-400 font-sans flex items-center gap-1.5">
                      <TypographySpan>{exp.company}</TypographySpan>
                      {exp.location && (
                        <TypographySpan className="text-zinc-500">· {exp.location}</TypographySpan>
                      )}
                    </div>
                    {exp.description && (
                      <p className="text-[11px] text-zinc-400 pt-0.5 leading-relaxed">
                        {exp.description}
                      </p>
                    )}
                  </div>
                  <TypographySpan className="text-zinc-500  shrink-0">
                    {exp.period}
                  </TypographySpan>
                </div>
              ))}
            </div>
          </div>

          {/* Get in touch button */}
          <div className="pt-2">
            <ContactButton
              label="Get In Touch"
              icon={true}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs font-extrabold tracking-wider uppercase transition-all shadow-lg hover:shadow-primary/25 cursor-pointer h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

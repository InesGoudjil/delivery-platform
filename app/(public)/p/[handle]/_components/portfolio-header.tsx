import React from "react";
import Link from "next/link";
import { FilmmakerProfile } from "@/lib/portfolio-data";
import { TypographySpan } from "@/components/ui/typography";
import { ShareButton, ContactButton } from "./portfolio-buttons";

interface PortfolioHeaderProps {
  profile: FilmmakerProfile;
}

export function PortfolioHeader({ profile }: PortfolioHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-white/5 transition-all">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2.5 sm:gap-4">
        <Link
          href={`/p/${profile.handle}`}
          className="group flex items-center min-w-0 focus:outline-none"
        >
          {profile.logoUrl ? (
            <div className="h-8 sm:h-10 max-w-[160px] sm:max-w-[220px] flex items-center shrink-0">
              <img
                src={profile.logoUrl}
                alt={profile.name}
                className="max-h-8 sm:max-h-10 w-auto object-contain transition-opacity group-hover:opacity-90"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              {/* {profile.avatar && (
                <div className="size-9 rounded-full overflow-hidden border border-white/20 shadow-md shrink-0 bg-black">
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )} */}
              <div className="flex items-baseline gap-1.5 min-w-0">
                <TypographySpan className="block truncate font-heading font-extrabold text-base sm:text-2xl tracking-tight text-white group-hover:text-zinc-200 transition-colors whitespace-nowrap">
                  {profile.name}
                </TypographySpan>
                <span className="inline-block size-1.5 sm:size-2 rounded-full bg-primary shrink-0" />
              </div>
            </div>
          )}
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ShareButton />
          <ContactButton label="Get In Touch" />
        </div>
      </div>
    </header>
  );
}

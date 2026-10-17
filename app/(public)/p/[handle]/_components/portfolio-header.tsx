import React from "react";
import Link from "next/link";
import { FilmmakerProfile } from "@/lib/portfolio-data";
import { ShareButton, ContactButton } from "./portfolio-buttons";

interface PortfolioHeaderProps {
  profile: FilmmakerProfile;
}

export function PortfolioHeader({ profile }: PortfolioHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-white/5 transition-all">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link
          href={`/p/${profile.handle}`}
          className="group flex items-center gap-3 focus:outline-none"
        >
          {profile.logoUrl ? (
            <div className="size-9 sm:size-10 rounded-xl overflow-hidden border border-white/15 shadow-md shrink-0 bg-black/60 p-1 flex items-center justify-center">
              <img
                src={profile.logoUrl}
                alt={profile.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : profile.avatar ? (
            <div className="size-9 rounded-full overflow-hidden border border-white/20 shadow-md shrink-0 bg-black">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-extrabold text-xl sm:text-2xl tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              {profile.name}
            </span>
            <span className="inline-block size-2 rounded-full bg-primary" />
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <ShareButton />
          <ContactButton label="Get In Touch" />
        </div>
      </div>
    </header>
  );
}

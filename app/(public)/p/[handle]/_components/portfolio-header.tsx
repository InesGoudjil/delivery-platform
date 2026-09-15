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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link
          href={`/p/${profile.handle}`}
          className="group flex items-center gap-1.5 focus:outline-none"
        >
          <span className="font-heading font-extrabold text-xl sm:text-2xl tracking-tight text-white group-hover:text-zinc-200 transition-colors">
            {profile.name}
          </span>
          <span className="inline-block size-2 rounded-full bg-[#f5551d]" />
        </Link>

        <div className="flex items-center gap-3">
          <ShareButton />
          <ContactButton label="Get In Touch" />
        </div>
      </div>
    </header>
  );
}

import React from "react";
import { FilmmakerProfile } from "@/lib/portfolio-data";

interface PortfolioFooterProps {
  profile: FilmmakerProfile;
}

export function PortfolioFooter({ profile }: PortfolioFooterProps) {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-zinc-500">
        <p>© {profile.name} — Films</p>
        <p>Made with CineSpace</p>
      </div>
    </footer>
  );
}

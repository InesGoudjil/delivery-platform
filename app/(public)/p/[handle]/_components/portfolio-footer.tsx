import React from "react";
import Link from "next/link";
import { FilmmakerProfile } from "@/lib/portfolio-data";
import { TypographySpan } from "@/components/ui/typography";

interface PortfolioFooterProps {
  profile: FilmmakerProfile;
  whiteLabel?: boolean;
}

export function PortfolioFooter({ profile, whiteLabel = false }: PortfolioFooterProps) {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-zinc-500">
        <p>© {profile.name} — Films</p>
        {!whiteLabel && (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <TypographySpan>Made with</TypographySpan>
            <img
              src="/images/logo.svg"
              alt="CineSpace"
              className="h-3.5 w-auto inline-block object-contain select-none"
            />
          </Link>
        )}
      </div>
    </footer>
  );
}

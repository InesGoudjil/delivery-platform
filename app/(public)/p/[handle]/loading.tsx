import React from "react";
import { cn } from "@/lib/utils";

/**
 * A studio's public portfolio while it loads, laid out like page.tsx: the sticky header, the hero
 * filling the first screen, then Latest Work. Without this, visitors got CineSpace's full-screen
 * loader (app/loading.tsx) on a studio's own page, white-label plans included.
 *
 * Neutral on purpose (the studio's accent and logo aren't known yet), and white-tinted because the
 * page is always dark, whatever the site theme. Same CSS variables as the page, so the hero
 * placeholder is exactly the hero's height.
 */
function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-white/[0.08]", className)} />;
}

export default function PublicPortfolioLoading() {
  return (
    <div
      className="min-h-screen bg-[#0a0a0b] text-[#f6f3ec] font-sans antialiased relative [--portfolio-header-h:4rem] sm:[--portfolio-header-h:5rem] [--portfolio-gap:1rem] sm:[--portfolio-gap:1.5rem] lg:[--portfolio-gap:2rem]"
      role="status"
      aria-label="Loading portfolio"
    >
      {/* Header (portfolio-header.tsx): avatar and studio name, Share and Get In Touch */}
      <div className="sticky top-0 z-40 bg-[#0a0a0b]/80 border-b border-white/5">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-(--portfolio-header-h) flex items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Bone className="size-9 rounded-full shrink-0" />
            <Bone className="h-5 sm:h-7 w-28 sm:w-48" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Bone className="h-9 sm:h-[38px] w-9 sm:w-24 rounded-full" />
            <Bone className="h-9 sm:h-[38px] w-28 sm:w-36 rounded-full" />
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 pt-(--portfolio-gap) pb-20">
        {/* Hero (portfolio-hero.tsx): the rest of the first screen, headline at its foot */}
        <div className="relative w-full h-[calc(100svh_-_var(--portfolio-header-h)_-_1px_-_2*var(--portfolio-gap))] min-h-48 rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-950">
          <div className="absolute inset-0 animate-pulse bg-white/[0.03]" />
          <div className="absolute bottom-5 left-5 right-5 sm:bottom-10 sm:left-10 sm:right-10 space-y-2.5 max-w-3xl">
            <Bone className="h-6 w-28 rounded-full" />
            <Bone className="h-8 sm:h-10 lg:h-12 w-3/4 max-w-xl rounded-xl" />
          </div>
        </div>

        {/* Latest Work (latest-work.tsx): centred heading, the tabs, then the grid */}
        <div className="mt-(--portfolio-gap) space-y-8">
          <div className="flex flex-col items-center gap-2 pt-4">
            <Bone className="h-3 w-24" />
            <Bone className="h-9 sm:h-10 md:h-12 w-56 sm:w-72 rounded-xl" />
          </div>
          <div className="flex justify-center">
            <div className="inline-flex p-1 rounded-full bg-[#18181b] border border-white/10 gap-1">
              <Bone className="h-[38px] w-24 sm:w-28 rounded-full bg-white/[0.12]" />
              <Bone className="h-[38px] w-20 sm:w-24 rounded-full bg-transparent" />
              <Bone className="h-[38px] w-20 sm:w-24 rounded-full bg-transparent" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-white/10 bg-[#0c0c0e]">
                <Bone className="aspect-video w-full rounded-none bg-white/[0.04]" />
                <div className="p-3.5 space-y-2">
                  <Bone className="h-3.5 w-3/4" />
                  <Bone className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading portfolio…</span>
    </div>
  );
}

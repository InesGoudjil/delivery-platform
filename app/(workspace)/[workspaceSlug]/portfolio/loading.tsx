import React from "react";
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { SKELETON_TEXT } from "../_components/skeleton-text";

/**
 * The portfolio editor while it loads: same order and boxes as portfolio-client.tsx (header,
 * Appearance card, Show Reel stage with its controls, the work grid), so nothing jumps when the
 * page arrives. The editor's panels are dark glass, not the theme's card colour; they're copied here.
 */
const PANEL = "rounded-2xl bg-[#141416]/75 backdrop-blur-2xl border border-white/10 shadow-xl hover:translate-y-0 hover:shadow-xl";

export default function PortfolioLoading() {
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* 1. Header (portfolio-hero.tsx): not a card */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-2 pb-2">
        <div className="space-y-2 min-w-0">
          <div className="h-6 flex items-center gap-3">
            <Skeleton className="size-6 rounded-full shrink-0" />
            <Skeleton className="h-[22px] w-28 rounded-full" />
            <Skeleton className="h-[22px] w-20 rounded-full" />
            <Skeleton className="h-3.5 w-24 rounded hidden sm:block" />
          </div>
          <SkeletonLine className={`${SKELETON_TEXT.pageTitleSm4xl} w-48 sm:w-56`} />
          <div className="max-w-xl">
            <SkeletonLine className="h-5 sm:h-[1.4rem] w-[30rem] max-w-full" />
            <SkeletonLine className="h-5 w-2/3 sm:hidden" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Skeleton className="h-10 w-52 rounded-full" />
          <Skeleton className="h-10 w-48 rounded-full" />
        </div>
      </div>

      {/* 2. Appearance card (appearance-toolbar.tsx): a header and one row per setting */}
      <Card className={`${PANEL} space-y-2`}>
        <CardHeader className="border-b border-white/[0.06] pb-3 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <SkeletonLine className={`${SKELETON_TEXT.smallTitle} w-28`} />
          </div>
          <Skeleton className="h-3.5 w-48 max-w-[45%] rounded" />
        </CardHeader>
        <CardContent className="divide-y divide-white/[0.05] pt-1">
          {[
            { label: "w-16", control: "h-[30px] w-[6.5rem] rounded-lg" },
            { label: "w-20", control: "h-[30px] w-36 rounded-lg" },
            { label: "w-24", control: "h-[30px] w-24 rounded-lg" },
            { label: "w-24", control: "h-[18px] w-8 rounded-full" },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <Skeleton className={`h-3.5 rounded ${row.label}`} />
              <Skeleton className={row.control} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Show Reel (cover-banner-section.tsx): header, stage, controls */}
      <Card className={`${PANEL} p-5 md:p-6 space-y-6`}>
        <CardContent className="p-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded" />
              <SkeletonLine className="h-5 w-28" />
              <Skeleton className="h-5 w-24 rounded-full ml-1" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          </div>

          {/* Stage: portrait on phones, cinematic from sm up, like the real one */}
          <div className="relative w-full min-h-[380px] sm:min-h-0 aspect-[4/5] sm:aspect-[21/9] rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-950">
            <Skeleton className="absolute inset-0 rounded-none bg-white/[0.03]" />
            <div className="absolute top-4 left-4 sm:top-5 sm:left-5 flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="absolute bottom-5 left-5 right-5 sm:bottom-10 sm:left-10 sm:right-10 space-y-2.5 max-w-3xl">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-8 sm:h-12 w-3/4 max-w-lg rounded-xl" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-white/[0.08]">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-3.5 w-36 rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-40 rounded" />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 rounded-xl" />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-36 rounded" />
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-9 rounded-xl" />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-32 rounded" />
                  <Skeleton className="h-[18px] w-8 rounded-full" />
                </div>
                <Skeleton className="h-9 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.08]">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-9 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Work grid (showcase-grid.tsx): title, Films/Stills/Projects pills, cards at size M */}
      <Card className={`${PANEL} space-y-4`}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-0">
          <div className="space-y-3">
            <Skeleton className="h-4 w-56 max-w-full rounded" />
            <div className="inline-flex items-center bg-[#0c0c0e]/90 p-1 rounded-full border border-white/10 gap-1">
              <Skeleton className="h-7 w-[4.25rem] rounded-full bg-primary/25" />
              <Skeleton className="h-7 w-[4.25rem] rounded-full bg-transparent" />
              <Skeleton className="h-7 w-[5.25rem] rounded-full bg-transparent" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-full self-start sm:self-auto" />
        </CardHeader>
        <CardContent className="pt-2">
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li
                key={i}
                className={`min-w-0 rounded-2xl overflow-hidden border border-white/10 bg-[#0c0c0e] ${i > 3 ? "hidden sm:block" : ""}`}
              >
                <Skeleton className="aspect-video w-full rounded-none bg-white/[0.04]" />
                <div className="p-3.5 border-t border-border/40 space-y-2">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

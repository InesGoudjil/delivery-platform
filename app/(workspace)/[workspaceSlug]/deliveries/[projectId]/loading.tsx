import React from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";
import { SKELETON_TEXT } from "../../_components/skeleton-text";

/**
 * A delivery room's page while it loads, in delivery-detail-client.tsx's order: back link, hero,
 * approval progress, Appearance, then the files. Phones get the hero's phone action row.
 */
// Rooms default to masonry, which hides the "Thumbnail scale" row, so four rows.
const APPEARANCE_ROWS = [
  "h-9 w-[6.75rem] rounded-xl", // Card size: S / M / L
  "h-9 w-40 rounded-xl", // Aspect ratio
  "h-[18px] w-8 rounded-full", // Show card info
  "h-[18px] w-8 rounded-full", // Watermark
];

export default function DeliveryDetailLoading() {
  return (
    <div className="w-full space-y-8 pb-16 animate-in fade-in duration-200 text-foreground">
      {/* Back to Projects */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <ArrowLeft className="size-4 text-muted-foreground/50" />
          <SkeletonLine className="h-4 sm:h-5 w-16" />
        </div>
      </div>

      <div className="space-y-8">
        {/* Hero banner (delivery-hero-banner.tsx) */}
        <Card className="relative rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-card hover:translate-y-0 hover:shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-muted/40 via-muted/10 to-transparent" />
          <CardContent className="relative z-10 p-6 sm:p-10 md:p-12 space-y-8">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary/40 animate-pulse" />
                <Skeleton className="h-3.5 w-36 rounded-full" />
              </div>
              <Skeleton className="h-10 sm:h-12 md:h-[3.75rem] w-3/4 max-w-xl rounded-2xl" />
            </div>

            <div className="flex flex-wrap items-center gap-8 pt-2 border-t border-border/40">
              {["w-20", "w-10", "w-14"].map((width, i) => (
                <div key={i} className="space-y-2 pt-2">
                  <Skeleton className="h-2.5 w-16 rounded" />
                  <Skeleton className={`h-5 rounded-md ${width}`} />
                </div>
              ))}
            </div>

            {/* Phones: share and WhatsApp side by side, then the menu */}
            <div className="flex sm:hidden items-center gap-2 pt-3 w-full">
              <Skeleton className="h-11 flex-1 rounded-full" />
              <Skeleton className="h-11 flex-1 rounded-full" />
              <Skeleton className="size-11 rounded-full shrink-0" />
            </div>

            <div className="hidden sm:flex flex-wrap items-center gap-3 pt-4">
              <Skeleton className="h-9 w-36 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-40 rounded-full" />
              <div className="flex items-center gap-2 ml-auto">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="size-9 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval progress (delivery-progress-bar.tsx) */}
        <Card className="rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg hover:translate-y-0 hover:shadow-lg">
          <CardContent className="p-0 flex-1 w-full space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-44 rounded" />
              <Skeleton className="h-3.5 w-8 rounded" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
            <Skeleton className="h-[34px] sm:h-[38px] w-full sm:w-36 rounded-full" />
            <Skeleton className="h-[34px] sm:h-[38px] w-full sm:w-36 rounded-full" />
          </div>
        </Card>

        {/* Appearance (delivery-appearance-card.tsx): a row per setting */}
        <Card className="rounded-2xl border border-border shadow-lg hover:translate-y-0 hover:shadow-lg">
          <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <Skeleton className="size-4 rounded shrink-0" />
              <div className="min-w-0">
                <SkeletonLine className={`${SKELETON_TEXT.cardTitle} w-36`} />
                <SkeletonLine className="h-4 w-72 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-4 sm:w-48 rounded shrink-0" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {APPEARANCE_ROWS.map((control, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-2 py-2 ${
                  i < APPEARANCE_ROWS.length - 1 ? "border-b border-border/40" : ""
                }`}
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  {i === APPEARANCE_ROWS.length - 1 && <Skeleton className="h-3 w-48 rounded" />}
                </div>
                <Skeleton className={control} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Files (delivery-assets-gallery.tsx) */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <SkeletonLine className="h-4 w-24" />
              {/* "PROJECT ASSETS": an h2 with text-3xl, 36px */}
              <SkeletonLine className="h-9 w-72 max-w-full" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-card/60 p-1 rounded-full border border-border/40">
                <Skeleton className="h-7 w-12 rounded-full bg-primary/25" />
                <Skeleton className="h-7 w-[4.25rem] rounded-full bg-foreground/[0.05]" />
                <Skeleton className="h-7 w-[4.25rem] rounded-full bg-foreground/[0.05]" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li
                key={i}
                className={`min-w-0 rounded-2xl overflow-hidden border border-border bg-card ${i > 3 ? "hidden sm:block" : ""}`}
              >
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-3.5 border-t border-border/40 space-y-2">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { cn } from "@/lib/utils";

/**
 * The client room while it loads (/deliver/<token> and /demo), laid out like delivery-room-client:
 * the header, then the cover banner filling the rest of the first screen with the title block at
 * its foot, then the approval bar and the first files.
 *
 * Neutral on purpose: the studio's accent colour and logo aren't known yet, and a white-label room
 * must not flash CineSpace's orange or name. The room is always dark, whatever the site theme, so
 * the placeholders are white-tinted rather than the theme's Skeleton colour.
 */
function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-white/[0.08]", className)} />;
}

export function DeliveryRoomSkeleton({ withDemoBanner = false }: { withDemoBanner?: boolean }) {
  return (
    <div
      className="min-h-screen bg-[#070709] text-[#f6f3ec] font-sans antialiased"
      role="status"
      aria-label="Loading the review room"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
        <div className="flex flex-col min-h-svh pt-4 sm:pt-6 gap-4 sm:gap-6 lg:gap-8 pb-4 sm:pb-6 lg:pb-8">
          {withDemoBanner && (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 flex-1">
                <Bone className="size-4 mt-0.5 shrink-0" />
                <div className="space-y-2 flex-1">
                  <Bone className="h-3.5 w-full max-w-xl" />
                  <Bone className="h-3.5 w-1/2 sm:hidden" />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Bone className="h-8 w-24 rounded-full" />
                <Bone className="h-8 w-28 rounded-full" />
              </div>
            </div>
          )}

          {/* Header: studio name or logo, and the "Private · expires" pill */}
          <div className="py-4 border-b border-white/10 flex items-center justify-between gap-2.5 sm:gap-4">
            <Bone className="h-6 sm:h-7 w-40 sm:w-52" />
            <Bone className="h-6 sm:h-8 w-32 sm:w-40 rounded-full shrink-0" />
          </div>

          {/* Cover banner: grows to fill the screen; the title block sits at its foot */}
          <div className="relative w-full flex-auto min-h-[22rem] rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.03] flex flex-col justify-end">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/40 to-transparent" />
            <div className="relative p-5 sm:p-7 md:p-10 lg:p-12 w-full">
              <Bone className="h-3.5 sm:h-4 w-44 sm:w-56" />
              <Bone className="h-7 sm:h-10 lg:h-12 xl:h-[3.75rem] w-3/4 max-w-2xl mt-2.5 sm:mt-3 rounded-xl" />
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-8 lg:gap-14 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/15">
                {["w-16", "w-12", "w-16", "w-8"].map((width, i) => (
                  <div key={i} className="flex flex-col gap-1.5 sm:gap-2">
                    <Bone className="h-2.5 w-14" />
                    <Bone className={`h-3.5 sm:h-5 ${width}`} />
                  </div>
                ))}
              </div>
              <Bone className="mt-5 sm:mt-6 h-11 w-full sm:w-56 rounded-full" />
            </div>
          </div>
        </div>

        {/* Below the first screen: approval bar, then the files */}
        <div className="space-y-4 sm:space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#141416]/90 p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <Bone className="flex-1 sm:flex-none sm:w-64 h-2 rounded-full" />
              <Bone className="h-3.5 w-24" />
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <Bone className="h-11 sm:h-10 flex-1 sm:flex-none sm:w-40 rounded-full" />
              <Bone className="h-11 sm:h-10 flex-1 sm:flex-none sm:w-36 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`rounded-2xl overflow-hidden border border-white/10 bg-[#0c0c0e] ${i > 1 ? "hidden sm:block" : ""}`}>
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
      <span className="sr-only">Loading the review room…</span>
    </div>
  );
}

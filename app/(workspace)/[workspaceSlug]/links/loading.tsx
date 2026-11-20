import React from "react";
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";
import { SKELETON_TEXT } from "../_components/skeleton-text";

/**
 * The Client Links page while it loads, in links-client.tsx's order: header, the four counters,
 * filters and search, then the table. Without this file the route fell back to the dashboard's
 * skeleton; page.tsx reuses it for its Suspense fallback.
 */
// All, Active, Expiring (this week), Expired, Turned off: one row on a 375px phone, as the real ones.
const FILTER_WIDTHS = [
  "w-9 sm:w-10",
  "w-[3.6rem] sm:w-[3.9rem]",
  "w-[4.4rem] sm:w-32",
  "w-[4.1rem] sm:w-[4.4rem]",
  "w-[5.1rem] sm:w-[5.4rem]",
];

/** Link, Delivery, Status, Access, Opens, Downloads, Last opened, copy. */
const COLUMNS = [
  { head: "w-8", cell: "w-28", grow: "flex-[1.4]" },
  { head: "w-14", cell: "w-32", grow: "flex-[1.4]" },
  { head: "w-12", cell: "w-20", grow: "flex-1" },
  { head: "w-12", cell: "w-[4.5rem]", grow: "flex-1" },
  { head: "w-10", cell: "w-5", grow: "flex-[0.6] flex justify-end" },
  { head: "w-16", cell: "w-5", grow: "flex-[0.7] flex justify-end" },
  { head: "w-20", cell: "w-16", grow: "flex-1" },
];

export default function LinksLoading() {
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <div className="space-y-1">
        <SkeletonLine className={`${SKELETON_TEXT.pageTitle} w-52 max-w-full`} />
        <div>
          <SkeletonLine className="h-5 w-[34rem] max-w-full" />
          <SkeletonLine className="h-5 w-1/2 sm:hidden" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card rounded-2xl px-4 py-3">
            <SkeletonLine className="h-8 w-10" />
            <SkeletonLine className="h-4 w-24 max-w-full" />
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="glass-pill self-start flex flex-wrap items-center gap-1 rounded-[1.25rem] p-1 max-w-full">
          {FILTER_WIDTHS.map((width, i) => (
            <Skeleton
              key={i}
              className={`h-7 rounded-full ${width} ${i === 0 ? "bg-primary/25" : "bg-foreground/[0.05]"}`}
            />
          ))}
        </div>
        <div className="glass-pill h-[30px] w-full lg:w-64 lg:shrink-0 rounded-full flex items-center gap-2 px-3">
          <Skeleton className="size-3.5 rounded-full shrink-0" />
          <Skeleton className="h-3 w-44 max-w-full rounded" />
        </div>
      </div>

      {/* The table scrolls sideways on phones; so does its skeleton (clipped instead). */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="min-w-[46rem]">
          <div className="flex items-center gap-4 border-b border-border px-4 py-3">
            {COLUMNS.map((column, i) => (
              <div key={i} className={column.grow}>
                <Skeleton className={`h-3 rounded ${column.head}`} />
              </div>
            ))}
            <div className="w-6 shrink-0" />
          </div>
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="flex items-center gap-4 border-b border-border/60 last:border-0 px-4 py-3">
              {COLUMNS.map((column, i) => (
                <div key={i} className={column.grow}>
                  {i === 3 ? (
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4].map((icon) => (
                        <Skeleton key={icon} className="size-3.5 rounded" />
                      ))}
                    </div>
                  ) : (
                    <Skeleton className={`h-3.5 rounded ${column.cell}`} />
                  )}
                </div>
              ))}
              <Skeleton className="size-6 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

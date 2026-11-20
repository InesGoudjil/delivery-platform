import React from "react";
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { SKELETON_TEXT } from "../_components/skeleton-text";

/**
 * The Client Deliveries list while it loads, in deliveries-client.tsx's order: header, then the
 * toolbar (status tabs, search and sort), then the room cards.
 */
const TAB_WIDTHS = ["w-[4.5rem]", "w-[7.75rem]", "w-[7rem]", "w-[6.5rem]", "w-[6.5rem]"];

export default function DeliveriesLoading() {
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* Header (deliveries-header.tsx) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="min-w-0 flex-1">
          <SkeletonLine className="h-4 w-40 mb-1" />
          <SkeletonLine className={`${SKELETON_TEXT.pageTitle} w-72 max-w-full`} />
          <SkeletonLine className={`${SKELETON_TEXT.leadLine} w-[40rem] max-w-full mt-1`} />
          {/* The subtitle wraps to three lines on phones */}
          <SkeletonLine className="h-5 w-full sm:hidden" />
          <SkeletonLine className="h-5 w-1/2 sm:hidden" />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Skeleton className="h-[30px] w-32 rounded-full hidden sm:block" />
          <Skeleton className="h-[38px] w-44 rounded-full" />
        </div>
      </div>

      {/* Toolbar: status tabs, then search and sort, which sit beside the tabs when the row has
          room (about 836px) and wrap onto their own line otherwise */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="glass-pill max-w-full rounded-[1.25rem] p-1 flex flex-wrap items-center gap-1">
          {TAB_WIDTHS.map((width, i) => (
            <Skeleton
              key={i}
              className={`h-7 rounded-full ${width} ${i === 0 ? "bg-primary/25" : "bg-foreground/[0.05]"}`}
            />
          ))}
        </div>
        <div className="flex grow basis-72 max-w-full sm:max-w-md items-center gap-2">
          <div className="glass-pill relative flex items-center rounded-full h-9 flex-1 min-w-0 overflow-hidden gap-2 px-3.5">
            <Skeleton className="size-3.5 rounded-full shrink-0" />
            <Skeleton className="h-3 w-40 max-w-full rounded" />
          </div>
          <div className="glass-pill rounded-full h-9 w-[9.75rem] shrink-0 flex items-center px-3.5">
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      </div>

      {/* Room cards (delivery-card-grid.tsx) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card
            key={i}
            className={`rounded-2xl border border-border justify-between shadow-sm hover:translate-y-0 hover:shadow-sm ${
              i > 3 ? "hidden md:flex" : ""
            }`}
          >
            <div>
              <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
                <Skeleton className="h-[21px] w-[5.5rem] rounded-full" />
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                <SkeletonLine className={`${SKELETON_TEXT.cardTitleXl} w-4/5`} />
                <SkeletonLine className="h-4 w-1/2" />
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Skeleton className="h-[26px] w-24 rounded-md" />
                  <Skeleton className="h-[26px] w-28 rounded-md" />
                  <Skeleton className="h-[26px] w-20 rounded-md" />
                </div>
                <div className="h-4 flex items-center gap-1.5">
                  <Skeleton className="size-3.5 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
              </CardContent>
            </div>
            <CardFooter className="pt-4 mt-6 border-t border-border flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-24 rounded" />
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-xl" />
                <Skeleton className="size-8 rounded-xl" />
                <Skeleton className="size-8 rounded-xl" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

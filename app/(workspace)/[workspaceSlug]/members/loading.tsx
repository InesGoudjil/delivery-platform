import React from "react";
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";
import { SKELETON_TEXT } from "../_components/skeleton-text";
import { Card, CardContent } from "@/components/ui/card";

export default function MembersLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="min-w-0 flex-1">
          <SkeletonLine className="h-4 w-72 max-w-full mb-1" />
          <SkeletonLine className={`${SKELETON_TEXT.pageTitleSm3xl} w-60 sm:w-72 max-w-full`} />
          <SkeletonLine className={`${SKELETON_TEXT.leadLine} w-[36rem] max-w-full mt-1`} />
          <SkeletonLine className="h-5 w-2/3 sm:hidden" />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>
      </div>

      {/* 2. Personal Workspace / Team Banner Skeleton */}
      <Card className="border border-border bg-card/60">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-4 w-48 rounded" />
            </div>
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
          <Skeleton className="h-9 w-44 rounded-full shrink-0" />
        </CardContent>
      </Card>

      {/* 3. Active Members List Skeleton */}
      <div className="space-y-3">
        <SkeletonLine className={`${SKELETON_TEXT.sectionLabel} w-44`} />
        <Card className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm hover:translate-y-0">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-4 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <Skeleton className="h-7 w-20 rounded-xl" />
                <Skeleton className="size-8 rounded-xl" />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* 4. Pending Invitations Skeleton */}
      <div className="space-y-3">
        <SkeletonLine className={`${SKELETON_TEXT.sectionLabel} w-52`} />
        <Card className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm hover:translate-y-0">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-xl shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-xl" />
                <Skeleton className="size-8 rounded-xl" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

import React from "react";
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";
import { SKELETON_TEXT } from "../_components/skeleton-text";
import { Card } from "@/components/ui/card";

export default function SecurityLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* 1. Header: "Security & Access Governance" takes two lines on phones */}
      <div className="pb-6 border-b border-border">
        <SkeletonLine className="h-4 w-32 mb-1" />
        <SkeletonLine className={`${SKELETON_TEXT.pageTitle} w-full sm:w-[28rem] max-w-full`} />
        <SkeletonLine className={`${SKELETON_TEXT.pageTitle} w-40 sm:hidden`} />
        <SkeletonLine className={`${SKELETON_TEXT.leadLine} w-[40rem] max-w-full mt-1`} />
        <SkeletonLine className="h-5 w-2/3 sm:hidden" />
      </div>

      {/* 2. Account: two-factor, then email address and password (account-credentials.tsx) */}
      <Card className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-8 shadow-sm hover:translate-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="size-[34px] rounded-xl shrink-0" />
              <SkeletonLine className={`${SKELETON_TEXT.cardTitle} w-72 max-w-full`} />
            </div>
            <SkeletonLine className="h-4 w-full max-w-md" />
            <SkeletonLine className="h-4 w-2/3 max-w-xs" />
          </div>
          <Skeleton className="h-8 w-28 rounded-xl shrink-0" />
        </div>

        {[
          { title: "w-44", fields: 1 },
          { title: "w-64", fields: 3 },
        ].map((section, index) => (
          <div key={index} className={`space-y-4 ${index === 0 ? "pb-6 border-b border-border" : ""}`}>
            <div className="space-y-1">
              <SkeletonLine className={`${SKELETON_TEXT.cardTitle} ${section.title} max-w-full`} />
              <SkeletonLine className="h-4 w-80 max-w-full" />
            </div>
            <div className="space-y-4 max-w-md pt-2">
              {Array.from({ length: section.fields }, (_, field) => (
                <div key={field} className="space-y-1">
                  <SkeletonLine className="h-4 w-28" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
              <Skeleton className="h-9 w-36 rounded-xl" />
            </div>
          </div>
        ))}
      </Card>

      {/* 3. Link Expiration Defaults Card Skeleton */}
      <Card className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-sm hover:translate-y-0">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-xl shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-56 rounded" />
            <Skeleton className="h-3 w-80 max-w-full rounded" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-xl" />
          ))}
        </div>
      </Card>

      {/* 4. Active Sessions Card Skeleton */}
      <Card className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 shadow-sm hover:translate-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-xl shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-64 rounded" />
              <Skeleton className="h-3 w-80 max-w-full rounded" />
            </div>
          </div>
          <Skeleton className="h-9 w-40 rounded-xl shrink-0" />
        </div>

        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-xl shrink-0" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-36 rounded" />
                    {i === 1 && <Skeleton className="h-4 w-20 rounded-full" />}
                  </div>
                  <Skeleton className="h-3 w-56 rounded" />
                </div>
              </div>
              {i !== 1 && <Skeleton className="h-8 w-20 rounded-xl" />}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

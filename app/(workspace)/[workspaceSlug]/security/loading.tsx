import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function SecurityLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Skeleton */}
      <div className="pb-6 border-b border-border space-y-2">
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-9 w-80 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>

      {/* 2. Account Authentication (2FA & Password) Card Skeleton */}
      <Card className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-8 shadow-sm hover:translate-y-0">
        {/* 2FA Section Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-xl shrink-0" />
              <Skeleton className="h-5 w-56 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-4/5 max-w-md rounded" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl shrink-0" />
        </div>

        {/* Password Change Form Skeleton */}
        <div className="space-y-4 max-w-md">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-xl shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-44 rounded" />
              <Skeleton className="h-3 w-60 rounded" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-9 w-36 rounded-full" />
            </div>
          </div>
        </div>
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

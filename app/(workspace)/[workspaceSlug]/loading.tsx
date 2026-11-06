import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkspaceDashboardLoading() {
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-3 w-36 rounded-md" />
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>

      {/* 3 Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:translate-y-0">
            <CardContent className="p-0 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="size-8 rounded-xl" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Navigation Cards Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-32 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 rounded-2xl bg-card border border-border shadow-sm hover:translate-y-0 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="size-4 rounded" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-40 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Deliveries Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
          <Skeleton className="h-4 w-24 rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 rounded-2xl bg-card border border-border shadow-sm hover:translate-y-0 flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
              <Skeleton className="size-4 rounded shrink-0" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceDashboardLoading() {
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Hero Glass Banner Skeleton */}
      <div className="glass-panel relative rounded-3xl p-6 sm:p-8 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Skeleton className="size-12 rounded-2xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-8 w-64 rounded-xl" />
              </div>
            </div>
            <Skeleton className="h-4 w-96 max-w-full rounded-md" />
          </div>

          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-44 rounded-full" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
        </div>
      </div>

      {/* 2. 4 Glass Stat KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-stat-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="size-9 rounded-xl" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded" />
          </div>
        ))}
      </div>

      {/* 3. Studio Navigation / Workflow Cards Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-3 w-32 rounded hidden sm:block" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="size-4 rounded" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32 rounded-lg" />
                <Skeleton className="h-3.5 w-full rounded" />
              </div>
              <div className="pt-3 border-t border-white/5 flex gap-1.5">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Recent Deliveries Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-3.5 w-64 rounded" />
          </div>
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-full" />
                </div>
                <Skeleton className="h-3 w-12 rounded" />
              </div>
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-7 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export default function SettingsLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-200 pb-16">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-44 rounded-full shrink-0" />
      </div>

      {/* 1. Cover Banner Section Skeleton */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-56 rounded-lg" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>

        <Card className="rounded-2xl bg-card/90 border border-border p-5 md:p-6 space-y-6 hover:translate-y-0">
          {/* Stage Skeleton */}
          <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/20">
            <AspectRatio ratio={24 / 8} className="flex items-end justify-between p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-28 rounded-full" />
            </AspectRatio>
          </div>

          {/* Presets Grid Skeleton */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <AspectRatio ratio={16 / 9}>
                    <Skeleton className="size-full rounded-xl" />
                  </AspectRatio>
                </div>
              ))}
            </div>
            <Skeleton className="h-16 rounded-xl border border-dashed border-border" />
          </div>
        </Card>
      </div>

      {/* 2. Brand Identity Section Skeleton */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-52 rounded-lg" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>

        <Card className="rounded-2xl bg-card/90 border border-border p-5 md:p-6 space-y-5 hover:translate-y-0">
          {/* Avatar row */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <Skeleton className="size-16 sm:size-20 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-72 max-w-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-36" />
              <div className="flex gap-3 pt-1">
                {[1, 2, 3, 4, 5].map((c) => (
                  <Skeleton key={c} className="size-9 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Bio Section Skeleton */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </div>
        <Card className="rounded-2xl bg-card/90 border border-border p-5 md:p-6 space-y-4 hover:translate-y-0">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </Card>
      </div>

      {/* 4. Experience Section Skeleton */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-56 rounded-lg" />
        </div>
        <Card className="rounded-2xl bg-card/90 border border-border p-5 md:p-6 space-y-4 hover:translate-y-0">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export default function PortfolioLoading() {
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* 1. Hero Banner Skeleton */}
      <Card className="rounded-3xl bg-card border border-border p-6 md:p-8 space-y-4 shadow-sm hover:translate-y-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Skeleton className="size-20 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 rounded-xl" />
              <Skeleton className="h-4 w-96 max-w-full rounded-md" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-9 w-36 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        </div>
      </Card>

      {/* 2. Appearance Toolbar Skeleton */}
      <Card className="rounded-2xl bg-card border border-border p-4 shadow-sm hover:translate-y-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-28 rounded" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </Card>

      {/* 3. Cover Banner Section Skeleton */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-6 w-56 rounded-lg" />
        </div>

        <Card className="rounded-2xl bg-card border border-border p-5 md:p-6 space-y-5 hover:translate-y-0 shadow-sm">
          {/* Banner Stage Preview Skeleton */}
          <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30">
            <AspectRatio ratio={21 / 9} className="flex items-end justify-between p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
              <Skeleton className="h-8 w-28 rounded-full" />
            </AspectRatio>
          </div>

          {/* Presets Gallery Skeleton */}
          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-36 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
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
          </div>
        </Card>
      </div>

      {/* 4. Showcase Grid Skeleton */}
      <Card className="rounded-2xl bg-card border border-border p-6 space-y-5 shadow-sm hover:translate-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-44 rounded-lg" />
            <Skeleton className="h-3 w-36 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-48 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="rounded-2xl bg-muted/20 border border-border overflow-hidden p-0 shadow-none hover:translate-y-0">
              <div className="aspect-video w-full bg-muted/60 relative animate-pulse flex items-center justify-center" />
              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3.5 w-10 rounded-full" />
                </div>
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}

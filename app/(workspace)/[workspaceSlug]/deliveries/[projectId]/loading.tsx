import React from "react";
import { ArrowLeft, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeliveryDetailLoading() {
  return (
    <div className="w-full space-y-8 pb-16 animate-in fade-in duration-200 text-foreground">
      {/* 1. Navigation Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <ArrowLeft className="size-4 text-muted-foreground/50" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
      </div>

      {/* 2. Hero Banner Skeleton */}
      <Card className="relative rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-card hover:translate-y-0">
        <div className="absolute inset-0 bg-muted/20 backdrop-blur-md" />
        <CardContent className="relative z-10 p-6 sm:p-10 md:p-12 space-y-8">
          <div className="space-y-3 max-w-3xl">
            {/* Small status pill */}
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary/40 animate-pulse" />
              <Skeleton className="h-3.5 w-36 rounded-full" />
            </div>

            {/* Title */}
            <Skeleton className="h-10 sm:h-12 w-3/4 max-w-lg rounded-2xl" />
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-8 pt-2 border-t border-border/40">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-14 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-14 rounded" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-24 rounded" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-36 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full ml-auto" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Client Approval Progress Bar Skeleton */}
      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4 hover:translate-y-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </Card>

      {/* 4. Appearance Settings Skeleton Card */}
      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4 hover:translate-y-0">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-3 w-64 rounded" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </Card>

      {/* 5. Deliverables & Project Assets Gallery Skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-44 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="rounded-2xl bg-card border border-border/80 overflow-hidden shadow-sm space-y-3 p-4 hover:translate-y-0"
            >
              <div className="aspect-video w-full rounded-xl bg-muted flex items-center justify-center relative overflow-hidden animate-pulse">
                <Play className="size-8 text-muted-foreground/30" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

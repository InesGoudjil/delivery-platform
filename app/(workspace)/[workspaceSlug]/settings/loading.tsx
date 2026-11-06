import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200 pb-20">
      {/* 1. Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2 pb-6 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-3 w-36 rounded-md" />
          <Skeleton className="h-8 w-60 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-36 rounded-full shrink-0" />
      </div>

      {/* 2. Storefront Identity Section Skeleton */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-6 w-52 rounded-lg" />
          <Skeleton className="h-3.5 w-72 max-w-full rounded" />
        </div>

        <Card className="rounded-2xl bg-card border border-border p-5 md:p-6 space-y-6 shadow-sm hover:translate-y-0">
          {/* Dual Upload Cards: Brand Logo & Filmmaker Avatar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center gap-4">
              <Skeleton className="size-16 sm:size-20 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-44 rounded" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center gap-4">
              <Skeleton className="size-16 sm:size-20 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-44 rounded" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
            </div>
          </div>

          {/* Form Fields: Brand Name, Handle, WhatsApp */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-36 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-36 rounded" />
              <div className="flex gap-3 pt-1">
                {[1, 2, 3, 4, 5].map((c) => (
                  <Skeleton key={c} className="size-9 rounded-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Stats Counters Grid Skeleton */}
          <div className="pt-2 border-t border-border space-y-3">
            <Skeleton className="h-3 w-44 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Bio & About Section Skeleton */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </div>
        <Card className="rounded-2xl bg-card border border-border p-5 md:p-6 space-y-4 shadow-sm hover:translate-y-0">
          <Skeleton className="h-32 w-full rounded-xl" />
        </Card>
      </div>
    </div>
  );
}

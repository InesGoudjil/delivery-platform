import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DocsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-200">
      {/* 1. Header Skeleton */}
      <div className="pb-6 border-b border-border space-y-2">
        <Skeleton className="h-3 w-40 rounded" />
        <Skeleton className="h-9 w-80 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>

      {/* 2. Delivery Pipeline Steps Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-6 w-60 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        <Skeleton className="h-3.5 w-80 max-w-full rounded" />

        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card
              key={i}
              className="p-6 rounded-2xl bg-card border border-border flex items-start gap-4 shadow-sm hover:translate-y-0"
            >
              <Skeleton className="size-11 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-14 rounded" />
                  <Skeleton className="h-4 w-52 rounded" />
                </div>
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Security Architecture Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-6 w-56 rounded-lg" />
        </div>
        <Skeleton className="h-3.5 w-72 rounded" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-sm hover:translate-y-0"
            >
              <Skeleton className="size-8 rounded-xl" />
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function HelpLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-200">
      {/* 1. Header Skeleton */}
      <div className="pb-6 border-b border-border space-y-2">
        <Skeleton className="h-3 w-36 rounded" />
        <Skeleton className="h-9 w-72 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>

      {/* 2. Quick Navigation Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-sm hover:translate-y-0">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </Card>
        ))}
      </div>

      {/* 3. Keyboard Shortcuts Section Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-6 w-64 rounded-lg" />
        </div>
        <Skeleton className="h-3.5 w-80 max-w-full rounded" />

        <Card className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm hover:translate-y-0">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 px-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-20 rounded-lg" />
                <Skeleton className="h-4 w-52 rounded" />
              </div>
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </Card>
      </div>

      {/* 4. FAQ Section Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-6 w-52 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-sm hover:translate-y-0">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded-full shrink-0" />
                <Skeleton className="h-4 w-60 rounded" />
              </div>
              <Skeleton className="h-3 w-4/5 max-w-xl rounded ml-6" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

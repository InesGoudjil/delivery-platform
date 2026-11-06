import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function NotificationsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Skeleton */}
      <div className="pb-6 border-b border-border space-y-2">
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-9 w-72 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>

      {/* 2. Notification Preferences Card Skeleton */}
      <Card className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm hover:translate-y-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-44 rounded" />
              <Skeleton className="h-3 w-4/5 max-w-md rounded" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full shrink-0" />
          </div>
        ))}
      </Card>

      {/* 3. WhatsApp Gateway Integration Card Skeleton */}
      <Card className="rounded-2xl border border-border bg-card p-6 space-y-6 shadow-sm hover:translate-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="size-2.5 rounded-full" />
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-72 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-44 rounded-xl" />
            <Skeleton className="h-9 w-16 rounded-xl" />
          </div>
        </div>

        {/* Audit Logs List Skeleton */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-56 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-xl shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-28 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function MembersLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-36 rounded" />
          </div>
          <Skeleton className="h-9 w-60 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      </div>

      {/* 2. Personal Workspace / Team Banner Skeleton */}
      <Card className="border border-border bg-card/60">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-4 w-48 rounded" />
            </div>
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
          <Skeleton className="h-9 w-44 rounded-full shrink-0" />
        </CardContent>
      </Card>

      {/* 3. Active Members List Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-36 rounded" />
        <Card className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm hover:translate-y-0">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-4 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <Skeleton className="h-7 w-20 rounded-xl" />
                <Skeleton className="size-8 rounded-xl" />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* 4. Pending Invitations Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-40 rounded" />
        <Card className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm hover:translate-y-0">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-xl shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-xl" />
                <Skeleton className="size-8 rounded-xl" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

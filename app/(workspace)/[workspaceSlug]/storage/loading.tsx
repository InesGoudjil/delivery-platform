import React from "react";
import { HardDrive } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StorageLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="pb-6 border-b border-border space-y-2">
        <Skeleton className="h-4 w-36 rounded-full" />
        <Skeleton className="h-9 w-56 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      {/* Main Active Storage Meter Skeleton */}
      <Card className="rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-sm hover:translate-y-0">
        <CardHeader className="p-0 flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <HardDrive className="size-6" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-64 rounded-lg" />
              <Skeleton className="h-3.5 w-48 rounded-md" />
            </div>
          </div>
          <div className="space-y-2 sm:text-right">
            <Skeleton className="h-7 w-32 rounded-lg sm:ml-auto" />
            <Skeleton className="h-4 w-20 rounded-md sm:ml-auto" />
          </div>
        </CardHeader>

        <CardContent className="p-0 space-y-6">
          {/* Progress Bar Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>

          {/* Breakdown Items Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 hover:translate-y-0 shadow-none">
                <CardContent className="p-0 space-y-2">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-6 w-16 rounded" />
                  <Skeleton className="h-3 w-36 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* The Silo Skeleton */}
      <Card className="rounded-2xl border border-border p-6 sm:p-8 space-y-5 shadow-sm hover:translate-y-0">
        <CardHeader className="p-0 flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-4 w-80 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-full" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

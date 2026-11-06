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
        <Skeleton className="h-4 w-full max-w-96 rounded-md" />
      </div>

      {/* Main Active Storage Meter Skeleton */}
      <Card className="rounded-2xl border border-border p-4 sm:p-6 md:p-8 gap-5 sm:gap-6 shadow-sm hover:translate-y-0">
        <CardHeader className="p-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <HardDrive className="size-5 sm:size-6" />
            </div>
            <div className="space-y-2 min-w-0 flex-1">
              <Skeleton className="h-5 w-44 sm:w-64 rounded-lg" />
              <Skeleton className="h-3.5 w-36 sm:w-48 rounded-md" />
            </div>
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-2 pt-3 sm:pt-0 border-t border-border/50 sm:border-t-0">
            <Skeleton className="h-6 sm:h-7 w-28 sm:w-32 rounded-lg" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </CardHeader>

        <CardContent className="p-0 space-y-5 sm:space-y-6">
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
              <Card key={i} className="p-3.5 rounded-xl bg-muted/40 border border-border gap-2 hover:translate-y-0 shadow-none">
                <CardContent className="p-0 space-y-2">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-6 w-16 rounded" />
                  <Skeleton className="h-3 w-36 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>

        <div className="pt-4 sm:pt-5 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Skeleton className="h-4 w-56 rounded-md mx-auto sm:mx-0" />
          <Skeleton className="h-9 sm:h-10 w-full sm:w-52 rounded-full" />
        </div>
      </Card>

      {/* The Silo Skeleton */}
      <Card className="rounded-2xl border border-border p-4 sm:p-6 md:p-8 space-y-5 shadow-sm hover:translate-y-0">
        <CardHeader className="p-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Skeleton className="size-12 rounded-xl shrink-0" />
            <div className="space-y-2 min-w-0 flex-1">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-4 w-full max-w-80 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-9 w-full sm:w-32 rounded-full" />
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

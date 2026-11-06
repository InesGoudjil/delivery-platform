import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

export default function DeliveriesLoading() {
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-3 w-36 rounded-md" />
          <Skeleton className="h-9 w-60 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-28 rounded-full hidden sm:inline-block" />
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-10 w-72 bg-muted/60 border border-border/40 rounded-full p-1 inline-flex items-center gap-1.5 animate-pulse">
        <div className="h-8 w-24 bg-card rounded-full" />
        <div className="h-8 w-28 bg-muted rounded-full" />
        <div className="h-8 w-16 bg-muted rounded-full" />
      </div>

      {/* Delivery Cards Grid Skeleton (6 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card
            key={i}
            className="rounded-2xl border border-border bg-card p-0 flex flex-col justify-between shadow-sm overflow-hidden hover:translate-y-0"
          >
            <div>
              <CardHeader className="flex-row items-center justify-between gap-2 p-5 pb-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-12 rounded" />
              </CardHeader>

              <CardContent className="space-y-3 p-5 pt-1">
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-4/5 rounded-lg" />
                  <Skeleton className="h-3.5 w-1/2 rounded" />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Skeleton className="h-6 w-24 rounded-md" />
                  <Skeleton className="h-6 w-24 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                </div>
              </CardContent>
            </div>

            <CardFooter className="p-5 pt-3 mt-4 border-t border-border flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-xl" />
                <Skeleton className="size-8 rounded-xl" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

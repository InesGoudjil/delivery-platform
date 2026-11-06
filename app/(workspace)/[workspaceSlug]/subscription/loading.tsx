import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";

export default function SubscriptionLoading() {
  return (
    <PageContainer maxWidth="7xl" className="animate-in fade-in duration-200">
      <div className="flex flex-col gap-10">
        {/* 1. Subscription Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-9 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>

        {/* 2. Active Subscription Hero Card Skeleton */}
        <Card className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm hover:translate-y-0">
          <CardHeader className="p-0 flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-36 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-48 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-32 rounded-full" />
              <Skeleton className="h-9 w-36 rounded-full" />
            </div>
          </CardHeader>

          <CardContent className="p-0 space-y-4 pt-2">
            {/* Storage Quota Progress Skeleton */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Available Plans Comparison Grid Skeleton */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-3.5 w-72 rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card
                key={i}
                className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between space-y-6 shadow-sm hover:translate-y-0"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24 rounded-lg" />
                    {i === 3 && <Skeleton className="h-5 w-20 rounded-full" />}
                  </div>

                  <div className="space-y-1">
                    <Skeleton className="h-8 w-28 rounded-xl" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-border">
                    {[1, 2, 3, 4, 5].map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <Skeleton className="size-3.5 rounded-full shrink-0" />
                        <Skeleton className="h-3 w-40 rounded" />
                      </div>
                    ))}
                  </div>
                </div>

                <Skeleton className="h-10 w-full rounded-full mt-4" />
              </Card>
            ))}
          </div>
        </div>

        {/* 4. Invoices History Card Skeleton */}
        <Card className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm hover:translate-y-0">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

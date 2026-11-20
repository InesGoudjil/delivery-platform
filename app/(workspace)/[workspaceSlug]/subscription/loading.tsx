import React from "react";
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";

export default function SubscriptionLoading() {
  return (
    <PageContainer maxWidth="7xl" className="animate-in fade-in duration-200">
      <div className="flex flex-col gap-10">
        {/* 1. Subscription Header Skeleton */}
        {/* PageHeader: kicker badge, title ("text-2xl md:text-3xl": 32 / 36px), one muted line (two on
            phones). No buttons. */}
        <div className="pb-6 border-b border-border">
          <div className="space-y-1.5">
            <Skeleton className="h-[21px] w-40 rounded-full mb-1" />
            <SkeletonLine className="h-8 md:h-9 w-64 sm:w-80 max-w-full" />
            <div>
              <SkeletonLine className="h-[23px] w-[38rem] max-w-full" />
              <SkeletonLine className="h-[23px] w-1/2 sm:hidden" />
            </div>
          </div>
        </div>

        {/* 2. The current plan (active-subscription-card.tsx): status badge, the plan's name (an h2 with
            text-2xl, 32px), a description, then storage beside three limit tiles, then the feature pills */}
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden hover:translate-y-0">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5 min-w-0">
                <Skeleton className="h-[22px] w-28 rounded-full" />
                <SkeletonLine className="h-8 w-48 max-w-full" />
                <SkeletonLine className="h-4 w-[34rem] max-w-full" />
              </div>
              <Skeleton className="size-[50px] rounded-2xl shrink-0 self-start sm:self-auto" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="h-px w-full bg-border" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-7 p-4 rounded-xl border border-border bg-background/70 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <div className="lg:col-span-5 grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-xl border border-border bg-background/60 space-y-3">
                    <Skeleton className="size-7 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-12 rounded" />
                      <Skeleton className="h-3 w-16 max-w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-3 w-48 rounded" />
              <div className="flex flex-wrap gap-2">
                {["w-32", "w-28", "w-36", "w-24", "w-32", "w-28", "w-36", "w-24"].map((width, i) => (
                  <Skeleton key={i} className={`h-[30px] ${width} rounded-lg`} />
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border">
            <Skeleton className="h-4 w-56 rounded" />
            <Skeleton className="h-9 w-40 rounded-full" />
          </CardFooter>
        </Card>

        {/* 3. Available Plans Comparison Grid Skeleton */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SkeletonLine className="h-7 w-72 max-w-full" />
                <Skeleton className="h-5 w-32 rounded-full hidden sm:block" />
              </div>
              <SkeletonLine className="h-4 w-96 max-w-full" />
            </div>
            {/* Monthly / Yearly switch (plan-comparison-grid.tsx) */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-full border border-border self-start sm:self-auto">
              <Skeleton className="h-7 w-[4.5rem] rounded-full bg-background/70" />
              <Skeleton className="h-7 w-24 rounded-full bg-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card
                key={i}
                className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between space-y-6 shadow-sm hover:translate-y-0"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <SkeletonLine className="h-7 w-24" />
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

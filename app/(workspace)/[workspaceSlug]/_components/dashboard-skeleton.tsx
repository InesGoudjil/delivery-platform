import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";

export function DashboardBodySkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-stat-card rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="size-9 rounded-xl" />
            </div>
            <SkeletonLine className="h-9 w-16" />
            <SkeletonLine className="h-4 w-32 max-w-full mt-1" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 space-y-4">
          <Skeleton className="h-5 w-44 rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/2 rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-1.5 w-full rounded" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </div>
      {/* Recent deliveries: heading, then up to four room cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonLine className="h-7 w-48" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`glass-card rounded-2xl p-5 flex flex-col justify-between gap-4 ${i > 2 ? "hidden md:flex" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-[22px] w-20 rounded-full" />
                  <Skeleton className="h-[22px] w-24 rounded-full" />
                </div>
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <div>
                <SkeletonLine className="h-6 w-1/2" />
                <SkeletonLine className="h-4 w-3/4 mt-0.5" />
              </div>
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-12 rounded" />
                  <Skeleton className="h-3 w-14 rounded" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-7 w-20 rounded-lg" />
                  <Skeleton className="h-7 w-14 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

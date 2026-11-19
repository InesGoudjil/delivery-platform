import { Skeleton } from "@/components/ui/skeleton";

export function DashboardBodySkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-stat-card rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="size-9 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-5 space-y-4">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="h-5 w-3/4 rounded-lg" />
            <Skeleton className="h-3 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardBodySkeleton } from "./_components/dashboard-skeleton";

export default function WorkspaceDashboardLoading() {
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      <div className="glass-panel relative rounded-3xl p-6 sm:p-8 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-2xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-8 w-64 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      </div>
      <DashboardBodySkeleton />
    </div>
  );
}

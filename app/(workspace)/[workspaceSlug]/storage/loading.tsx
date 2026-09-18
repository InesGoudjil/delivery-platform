import React from "react";
import { HardDrive } from "lucide-react";

export default function StorageLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="pb-6 border-b border-white/10 space-y-2">
        <div className="h-3 w-24 bg-white/10 rounded-md animate-pulse" />
        <div className="h-8 w-48 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-4 w-96 bg-white/5 rounded-md animate-pulse" />
      </div>

      {/* Main Active Storage Meter Skeleton */}
      <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30 shrink-0">
              <HardDrive className="size-6" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-64 bg-white/10 rounded-lg animate-pulse" />
              <div className="h-3 w-48 bg-white/5 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 text-right">
            <div className="h-7 w-32 bg-white/10 rounded-lg animate-pulse ml-auto" />
            <div className="h-3 w-20 bg-white/5 rounded-md animate-pulse ml-auto" />
          </div>
        </div>

        {/* Progress Bar Skeleton */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-[#0c0c0e] rounded-full overflow-hidden p-0.5 border border-white/10">
            <div className="h-full w-1/3 bg-[#f5551d]/40 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-3 w-12 bg-white/5 rounded" />
            <div className="h-3 w-24 bg-white/5 rounded" />
            <div className="h-3 w-16 bg-white/5 rounded" />
          </div>
        </div>

        {/* Breakdown Items Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-[#0c0c0e] border border-white/10 space-y-2">
              <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
              <div className="h-6 w-16 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-36 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

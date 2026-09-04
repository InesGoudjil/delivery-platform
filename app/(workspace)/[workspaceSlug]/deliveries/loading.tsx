import React from "react";

export default function DeliveriesLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-white/10 rounded-md animate-pulse" />
          <div className="h-8 w-56 bg-white/10 rounded-xl animate-pulse" />
          <div className="h-4 w-80 bg-white/5 rounded-md animate-pulse" />
        </div>
        <div className="h-10 w-44 bg-white/10 rounded-xl animate-pulse" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-10 w-72 bg-[#141416] border border-white/10 rounded-full animate-pulse" />

      {/* Delivery Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 bg-white/10 rounded-full animate-pulse" />
              <div className="h-5 w-24 bg-white/10 rounded-full animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="h-6 w-3/4 bg-white/10 rounded-lg animate-pulse" />
              <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
            </div>

            <div className="flex gap-2 pt-2">
              <div className="h-6 w-20 bg-white/5 rounded-md animate-pulse" />
              <div className="h-6 w-24 bg-white/5 rounded-md animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

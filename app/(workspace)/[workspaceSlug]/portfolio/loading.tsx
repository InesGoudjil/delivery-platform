import React from "react";

export default function PortfolioLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Hero Banner Skeleton */}
      <div className="rounded-3xl bg-[#141416] border border-white/10 p-6 md:p-8 space-y-4 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="size-20 rounded-2xl bg-white/10 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-8 w-64 bg-white/10 rounded-xl animate-pulse" />
              <div className="h-4 w-96 bg-white/5 rounded-md animate-pulse" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
                <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
          <div className="h-10 w-36 bg-white/10 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Showcase Grid Skeleton */}
      <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-8 w-64 bg-white/10 rounded-xl animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-video rounded-2xl bg-[#0c0c0e] border border-white/10 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

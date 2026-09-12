import React from "react";

export default function SettingsLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-200 pb-16">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div className="space-y-2">
          <div className="h-3 w-40 bg-white/10 rounded-md animate-pulse" />
          <div className="h-8 w-64 bg-white/10 rounded-xl animate-pulse" />
          <div className="h-4 w-96 max-w-full bg-white/5 rounded-md animate-pulse" />
        </div>
        <div className="h-10 w-44 bg-white/10 rounded-full animate-pulse shrink-0" />
      </div>

      {/* 1. Cover Banner Section Skeleton */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-white/10 rounded-md animate-pulse" />
          <div className="h-6 w-56 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-3.5 w-80 max-w-full bg-white/5 rounded-md animate-pulse" />
        </div>

        <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 space-y-6">
          {/* Stage Skeleton */}
          <div className="relative rounded-2xl overflow-hidden aspect-[21/9] sm:aspect-[24/8] bg-white/5 border border-white/10 animate-pulse flex items-end p-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-28 bg-white/10 rounded-full animate-pulse" />
          </div>

          {/* Presets Grid Skeleton */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-3 w-36 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-xl aspect-[16/9] bg-white/5 border border-white/10 animate-pulse"
                />
              ))}
            </div>
            <div className="h-16 rounded-xl bg-white/5 border border-dashed border-white/10 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 2. Brand Identity Section Skeleton */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-white/10 rounded-md animate-pulse" />
          <div className="h-6 w-52 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-3.5 w-72 max-w-full bg-white/5 rounded-md animate-pulse" />
        </div>

        <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-10 w-full bg-white/5 rounded-xl border border-white/[0.08] animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-10 w-full bg-white/5 rounded-xl border border-white/[0.08] animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-2">
              <div className="h-3 w-36 bg-white/10 rounded animate-pulse" />
              <div className="h-10 w-full bg-white/5 rounded-xl border border-white/[0.08] animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-36 bg-white/10 rounded animate-pulse" />
              <div className="flex gap-3 pt-1">
                {[1, 2, 3, 4, 5].map((c) => (
                  <div key={c} className="size-9 rounded-full bg-white/10 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bio Section Skeleton */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-white/10 rounded-md animate-pulse" />
          <div className="h-6 w-48 bg-white/10 rounded-lg animate-pulse" />
        </div>
        <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 space-y-4">
          <div className="h-28 w-full bg-white/5 rounded-xl border border-white/[0.08] animate-pulse" />
          <div className="h-14 w-full bg-white/5 rounded-xl border border-white/[0.06] animate-pulse" />
        </div>
      </div>

      {/* 4. Experience Section Skeleton */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-white/10 rounded-md animate-pulse" />
          <div className="h-6 w-56 bg-white/10 rounded-lg animate-pulse" />
        </div>
        <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-8 w-32 bg-white/10 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl border border-white/[0.06] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

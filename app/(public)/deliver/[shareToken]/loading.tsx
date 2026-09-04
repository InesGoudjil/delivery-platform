import React from "react";
import { Play } from "lucide-react";

export default function DeliverRoomLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f6f3ec] font-sans antialiased p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between h-16 border-b border-white/10 pb-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="h-8 w-28 bg-white/10 rounded-full animate-pulse" />
      </div>

      {/* Video Player Stage Skeleton */}
      <div className="aspect-video w-full rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-center relative overflow-hidden">
        <div className="size-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center animate-pulse">
          <Play className="size-6 text-[#f5551d] ml-1" />
        </div>
        <div className="absolute bottom-4 left-4 right-4 h-2 bg-white/10 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

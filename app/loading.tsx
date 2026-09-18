import React from "react";
import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-[#f6f3ec]">
      <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-300">
        <div className="relative size-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#f5551d]/20 border-t-[#f5551d] animate-spin" />
          <Loader2 className="size-5 text-[#f5551d] animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <span className="text-xs font-mono text-[#f5551d] uppercase tracking-widest font-semibold block">
            CINESPACE
          </span>
          <p className="text-xs text-[#8e8e93]">Loading studio workspace...</p>
        </div>
      </div>
    </div>
  );
}

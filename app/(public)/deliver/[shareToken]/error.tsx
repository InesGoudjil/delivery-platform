"use client";

import React, { useEffect } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeliverRoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Delivery Room Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 text-[#f6f3ec]">
      <div className="max-w-md w-full rounded-3xl bg-[#141416] border border-white/10 p-8 text-center space-y-5 shadow-2xl">
        <div className="size-14 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive flex items-center justify-center mx-auto">
          <Lock className="size-7" />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-[#f5551d] uppercase tracking-widest font-semibold block">
            CLIENT REVIEW ROOM
          </span>
          <h3 className="text-xl font-bold font-heading text-[#f6f3ec]">
            Unable to Access Delivery Cut
          </h3>
          <p className="text-xs text-[#8e8e93]">
            {error.message || "This review link may be invalid, passcode-protected, or no longer available."}
          </p>
        </div>
        <Button
          onClick={() => reset()}
          className="rounded-xl bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] cursor-pointer h-10 px-6"
        >
          <RefreshCw className="size-3.5 mr-2" /> Try Accessing Again
        </Button>
      </div>
    </div>
  );
}

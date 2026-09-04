"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-[#f6f3ec]">
      <div className="max-w-md w-full rounded-3xl bg-[#141416] border border-white/10 p-8 shadow-2xl space-y-6 text-center animate-in fade-in duration-200">
        <div className="size-14 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono text-[#f5551d] uppercase tracking-widest font-semibold block">
            System Alert
          </span>
          <h2 className="text-2xl font-bold font-heading text-[#f6f3ec]">
            Something Went Wrong
          </h2>
          <p className="text-xs text-[#8e8e93] leading-relaxed">
            {error.message || "An unexpected error occurred while rendering this page."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto rounded-xl bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] cursor-pointer h-10 px-5"
          >
            <RefreshCw className="size-3.5 mr-2" /> Try Again
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold h-10 px-5 cursor-pointer"
          >
            <Link href="/">
              <Home className="size-3.5 mr-2 text-[#8e8e93]" /> Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

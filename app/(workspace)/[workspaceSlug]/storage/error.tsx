"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StorageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storage Error Boundary:", error);
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 text-[#f6f3ec]">
      <div className="rounded-3xl bg-[#141416] border border-destructive/30 p-8 text-center space-y-5 shadow-2xl">
        <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold font-heading text-[#f6f3ec]">
            Failed to Load Storage Metrics
          </h3>
          <p className="text-xs text-[#8e8e93]">
            {error.message || "An error occurred while connecting to storage database services."}
          </p>
        </div>
        <Button
          onClick={() => reset()}
          className="rounded-xl bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] cursor-pointer h-9 px-5"
        >
          <RefreshCw className="size-3.5 mr-2" /> Reload Storage Data
        </Button>
      </div>
    </div>
  );
}

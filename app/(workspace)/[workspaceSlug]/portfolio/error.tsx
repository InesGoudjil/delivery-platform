"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypographyH3, TypographyMuted } from "@/components/ui/typography";

export default function PortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portfolio Error Boundary:", error);
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 text-foreground">
      <div className="rounded-3xl bg-card border border-destructive/30 p-8 text-center space-y-5 shadow-2xl">
        <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <TypographyH3 className="text-xl font-bold font-heading text-foreground">
            Failed to Load Portfolio
          </TypographyH3>
          <TypographyMuted className="text-xs text-muted-foreground">
            {error.message || "An error occurred while rendering your creator portfolio."}
          </TypographyMuted>
        </div>
        <Button
          onClick={() => reset()}
          className="rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 cursor-pointer h-9 px-5"
        >
          <RefreshCw className="size-3.5 mr-2" /> Reload Portfolio
        </Button>
      </div>
    </div>
  );
}

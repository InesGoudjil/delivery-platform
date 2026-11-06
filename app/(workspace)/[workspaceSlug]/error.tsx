"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TypographyH3, TypographyMuted } from "@/components/ui/typography";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace Error Boundary:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-foreground">
      <div className="rounded-3xl bg-card border border-destructive/30 p-8 text-center space-y-5 shadow-2xl">
        <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <TypographyH3 className="text-xl font-bold font-heading text-foreground">
            Something went wrong loading this workspace
          </TypographyH3>
          <TypographyMuted className="text-xs text-muted-foreground max-w-md mx-auto">
            {error.message || "An unexpected error occurred while loading your workspace dashboard."}
          </TypographyMuted>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 cursor-pointer h-9 px-5 shadow-sm"
          >
            <RefreshCw className="size-3.5 mr-2" /> Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full text-xs border-border hover:bg-muted cursor-pointer h-9 px-5"
          >
            <Link href="/">
              <LayoutDashboard className="size-3.5 mr-2" /> Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

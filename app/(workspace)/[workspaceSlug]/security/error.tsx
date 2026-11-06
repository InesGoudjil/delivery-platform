"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TypographyH3, TypographyMuted } from "@/components/ui/typography";

export default function SecurityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";

  useEffect(() => {
    console.error("Security Error Boundary:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-foreground">
      <div className="rounded-3xl bg-card border border-destructive/30 p-8 text-center space-y-5 shadow-2xl">
        <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <TypographyH3 className="text-xl font-bold font-heading text-foreground">
            Failed to Load Security Settings
          </TypographyH3>
          <TypographyMuted className="text-xs text-muted-foreground max-w-md mx-auto">
            {error.message || "We encountered an issue loading your security and session settings."}
          </TypographyMuted>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 cursor-pointer h-9 px-5 shadow-sm"
          >
            <RefreshCw className="size-3.5 mr-2" /> Retry
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full text-xs border-border hover:bg-muted cursor-pointer h-9 px-5"
          >
            <Link href={`/${workspaceSlug}`}>
              <LayoutDashboard className="size-3.5 mr-2" /> Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

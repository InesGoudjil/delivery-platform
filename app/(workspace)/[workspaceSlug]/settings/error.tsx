"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TiltCard } from "@/components/ui/motion";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Settings Error Boundary:", error);
  }, [error]);

  return (
    <TooltipProvider delay={150}>
      <div className="max-w-2xl mx-auto py-16 px-4 text-foreground">
        <TiltCard
          tiltIntensity={2}
          glareIntensity={0.06}
          className="rounded-3xl bg-card border border-destructive/30 p-8 text-center space-y-5 shadow-2xl"
        >
          <div className="flex justify-center">
            <Badge variant="destructive" className="font-mono text-[10px] tracking-wider uppercase gap-1.5">
              <AlertCircle className="size-3.5" />
              Settings Error
            </Badge>
          </div>

          <div className="space-y-1.5">
            <TypographyH2 className="text-xl font-bold font-heading text-foreground border-none pb-0">
              Failed to Load Brand Settings
            </TypographyH2>
            <TypographyMuted className="text-xs text-muted-foreground max-w-md mx-auto">
              {error.message || "An unexpected error occurred while loading your brand and customization settings."}
            </TypographyMuted>
          </div>

          <div className="flex justify-center pt-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    onClick={() => reset()}
                    className="rounded-full bg-[#f5551d] text-black font-extrabold text-xs hover:bg-[#ff8a45] cursor-pointer h-10 px-6 uppercase tracking-wider shadow-lg shadow-[#f5551d]/20"
                  >
                    <RefreshCw className="size-3.5 mr-2" />
                    <span>Reload Brand Settings</span>
                  </Button>
                }
              />
              <TooltipContent side="bottom">
                Re-attempt fetching workspace branding state
              </TooltipContent>
            </Tooltip>
          </div>
        </TiltCard>
      </div>
    </TooltipProvider>
  );
}

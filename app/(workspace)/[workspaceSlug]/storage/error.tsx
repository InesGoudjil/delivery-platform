"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { TiltCard } from "@/components/ui/motion";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

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
    <TooltipProvider delay={150}>
      <div className="max-w-4xl mx-auto py-12 px-4 text-foreground">
        <TiltCard tiltIntensity={2} glareIntensity={0.05} className="rounded-3xl">
          <Card className="rounded-3xl border border-destructive/30 p-8 text-center space-y-5 shadow-2xl hover:translate-y-0 bg-card/90 backdrop-blur-md">
            <CardHeader className="p-0 space-y-4">
              <div className="size-14 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="size-7" />
              </div>
              <div className="space-y-2">
                <Badge variant="destructive" className="font-mono text-xs uppercase tracking-wider">
                  Service Interruption
                </Badge>
                <TypographyH2 className="text-xl font-bold font-heading text-foreground">
                  Failed to Load Storage Metrics
                </TypographyH2>
                <TypographyMuted className="text-xs text-muted-foreground max-w-md mx-auto">
                  {error.message || "An error occurred while connecting to storage database services."}
                </TypographyMuted>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      onClick={() => reset()}
                      className="rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 cursor-pointer h-9 px-5 shadow-md shadow-primary/20"
                    >
                      <RefreshCw className="size-3.5 mr-2" /> Reload Storage Data
                    </Button>
                  }
                />
                <TooltipContent>Re-fetch storage usage and quota from R2</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        </TiltCard>
      </div>
    </TooltipProvider>
  );
}

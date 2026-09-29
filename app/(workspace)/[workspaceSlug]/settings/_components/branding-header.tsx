"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypographyH1, TypographyLead } from "@/components/ui/typography";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface BrandingHeaderProps {
  workspaceSlug: string;
  isPending: boolean;
  onSave: (e: React.FormEvent) => void;
}

export function BrandingHeader({
  workspaceSlug,
  isPending,
  onSave,
}: BrandingHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2 border-b border-border pb-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="orange"
            className="text-xs font-mono uppercase tracking-wider font-semibold"
          >
            Public Identity &amp; Storefront
          </Badge>
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={`/p/${workspaceSlug}`}
                  target="_blank"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors font-mono"
                >
                  <Badge variant="outline" className="text-[10px] font-mono hover:border-primary/40 flex items-center gap-1 cursor-pointer">
                    <span>Live Preview</span>
                    <ExternalLink className="size-2.5" />
                  </Badge>
                </Link>
              }
            />
            <TooltipContent>Open your public portfolio showcase in a new tab</TooltipContent>
          </Tooltip>
        </div>
        <TypographyH1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight uppercase font-heading">
          BRAND &amp; CUSTOMIZATION
        </TypographyH1>
        <TypographyLead className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
          Configure your storefront cover banner, public handle, filmmaker biography, accent palette, and verified client credentials.
        </TypographyLead>
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              onClick={onSave}
              disabled={isPending}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-6 py-2.5 shadow-lg shadow-primary/25 transition-all uppercase tracking-wider h-auto shrink-0 cursor-pointer"
            >
              <Sparkles className="size-4 mr-1.5" />
              <span>{isPending ? "Saving..." : "SAVE BRAND SETTINGS"}</span>
            </Button>
          }
        />
        <TooltipContent>Apply brand identity, colors, and showcase changes</TooltipContent>
      </Tooltip>
    </div>
  );
}

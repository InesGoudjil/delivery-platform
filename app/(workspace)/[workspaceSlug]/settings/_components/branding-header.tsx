"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypographyH1, TypographyLead, TypographySpan } from "@/components/ui/typography";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BrandingHeaderProps {
  workspaceSlug: string;
  isPending: boolean;
  isDirty?: boolean;
  onSave: (e?: React.FormEvent) => void;
}

export function BrandingHeader({
  workspaceSlug,
  isPending,
  isDirty = false,
  onSave,
}: BrandingHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2 border-b border-border pb-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="orange"
            className="text-xs font-mono uppercase tracking-wider font-semibold"
          >
            Public Identity &amp; Storefront
          </Badge>

          {isDirty ? (
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-amber-500/40 text-amber-400 bg-amber-500/10 flex items-center gap-1.5 px-2 py-0.5"
            >
              <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
              <TypographySpan>Unsaved Changes</TypographySpan>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1 px-2 py-0.5"
            >
              <Check className="size-2.5 text-emerald-400" />
              <TypographySpan>All Saved</TypographySpan>
            </Badge>
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={`/p/${workspaceSlug}`}
                  target="_blank"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors font-mono"
                >
                  <Badge variant="outline" className="text-[10px] font-mono hover:border-primary/40 flex items-center gap-1 cursor-pointer">
                    <TypographySpan>Live Preview</TypographySpan>
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
          Configure your studio brand mark, public handle, filmmaker biography, and accent palette.
        </TypographyLead>
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              onClick={(e) => onSave(e)}
              disabled={isPending}
              className={cn(
                "rounded-full font-extrabold text-xs px-6 py-2.5 shadow-lg transition-all uppercase tracking-wider h-auto shrink-0 cursor-pointer flex items-center gap-1.5",
                isDirty
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25 ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                  : "bg-muted/80 hover:bg-muted text-muted-foreground border border-border shadow-none"
              )}
            >
              {isPending ? (
                <>
                  <Sparkles className="size-4 animate-spin text-primary" />
                  <TypographySpan>Saving...</TypographySpan>
                </>
              ) : isDirty ? (
                <>
                  <Sparkles className="size-4" />
                  <TypographySpan>Save Changes</TypographySpan>
                  <kbd className="hidden sm:inline-block ml-1 font-mono text-[10px] bg-black/30 px-1 py-0.5 rounded text-white/90">
                    ⌘S
                  </kbd>
                </>
              ) : (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <TypographySpan>Saved</TypographySpan>
                </>
              )}
            </Button>
          }
        />
        <TooltipContent>
          {isDirty ? "Save pending brand changes (⌘S)" : "All brand identity changes are saved"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

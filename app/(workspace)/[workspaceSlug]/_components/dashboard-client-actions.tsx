"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CopyReviewLinkButtonProps {
  shareToken: string;
  projectTitle?: string;
  className?: string;
}

export function CopyReviewLinkButton({
  shareToken,
  projectTitle,
  className = "",
}: CopyReviewLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/deliver/${shareToken}`;

    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(
        projectTitle
          ? `Review link copied for "${projectTitle}"`
          : "Review link copied to clipboard"
      );
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all cursor-pointer ${className}`}
            >
              {copied ? (
                <>
                  <Check className="size-3 text-emerald-500 mr-1" />
                  <span className="text-emerald-500 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3 mr-1 opacity-70" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>
          }
        />
        <TooltipContent side="top" className="text-xs">
          Copy client review link
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

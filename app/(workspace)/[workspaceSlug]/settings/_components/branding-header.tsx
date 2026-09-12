"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#f5551d] uppercase tracking-wider font-semibold">
            Public Identity &amp; Storefront
          </span>
          <Link
            href={`/p/${workspaceSlug}`}
            target="_blank"
            className="text-xs text-zinc-500 hover:text-[#f5551d] flex items-center gap-1 transition-colors font-mono"
          >
            <span>Preview</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight uppercase font-heading">
          BRAND &amp; CUSTOMIZATION
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
          Configure your storefront cover banner, public handle, filmmaker biography, accent palette, and verified client credentials.
        </p>
      </div>

      <Button
        onClick={onSave}
        disabled={isPending}
        className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs px-6 py-2.5 shadow-lg shadow-[#f5551d]/20 transition-all uppercase tracking-wider h-auto shrink-0 cursor-pointer"
      >
        <Sparkles className="size-4 mr-1.5" />
        <span>{isPending ? "Saving..." : "SAVE BRAND SETTINGS"}</span>
      </Button>
    </div>
  );
}

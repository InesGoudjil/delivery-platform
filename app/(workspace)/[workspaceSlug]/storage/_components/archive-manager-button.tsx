"use client";

import React from "react";
import { Upload, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import Link from "next/link";

interface ArchiveManagerButtonProps {
  canSiloArchive?: boolean;
  workspaceSlug?: string;
}

export function ArchiveManagerButton({
  canSiloArchive = false,
  workspaceSlug,
}: ArchiveManagerButtonProps) {
  const handleArchive = (e: React.MouseEvent) => {
    if (!canSiloArchive) {
      toast.error("The Silo Cold Storage Archive requires a Studio or Enterprise subscription.");
      return;
    }
    e.preventDefault();
    toast.info("Opening The Silo Archive Manager...");
  };

  if (!canSiloArchive) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link href={workspaceSlug ? `/${workspaceSlug}/settings` : "#"}>
              <Button
                variant="outline"
                onClick={handleArchive}
                className="rounded-full text-xs font-semibold cursor-pointer shrink-0 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 gap-1.5"
              >
                <Lock className="size-3.5 text-blue-400" />
                <span>Unlock Silo</span>
                <Badge
                  variant="outline"
                  className="text-[9px] font-mono uppercase bg-blue-500/20 text-blue-400 border-blue-500/30 px-1.5 py-0.5 font-bold"
                >
                  Studio+
                </Badge>
              </Button>
            </Link>
          }
        />
        <TooltipContent>
          Upgrade to Studio or Enterprise to access long-term cold archives
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            onClick={handleArchive}
            className="rounded-full text-xs font-semibold cursor-pointer shrink-0 border-border bg-muted/40 hover:bg-muted text-foreground"
          >
            <Upload className="size-3.5 mr-1.5" /> Manage Archive
          </Button>
        }
      />
      <TooltipContent>
        Archive or restore completed client projects from deep storage
      </TooltipContent>
    </Tooltip>
  );
}

"use client";

import React from "react";
import { Upload, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <Link href={workspaceSlug ? `/${workspaceSlug}/settings` : "#"}>
        <Button
          variant="outline"
          onClick={handleArchive}
          className="rounded-full text-xs font-semibold cursor-pointer shrink-0 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 gap-1.5"
        >
          <Lock className="size-3.5 text-blue-400" />
          <span>Unlock Silo</span>
          <span className="text-[9px] font-mono uppercase bg-blue-500/20 px-1.5 py-0.5 rounded font-bold">
            Studio+
          </span>
        </Button>
      </Link>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleArchive}
      className="rounded-full text-xs font-semibold cursor-pointer shrink-0 border-border bg-muted/40 hover:bg-muted text-foreground"
    >
      <Upload className="size-3.5 mr-1.5" /> Manage Archive
    </Button>
  );
}

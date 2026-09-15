"use client";

import React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ArchiveManagerButton() {
  const handleArchive = () => {
    toast.info("Opening The Silo Archive Manager...");
  };

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

"use client";

import React from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";

export function StorageUpgradeButton() {
  const handleUpgrade = () => {
    toast.success("Storage upgrade checkout opened!");
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            onClick={handleUpgrade}
            className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-md shadow-primary/20 text-xs cursor-pointer h-9 px-4.5"
          >
            <Zap className="size-3.5 mr-1.5" /> Add +1 TB Storage ($15/mo)
          </Button>
        }
      />
      <TooltipContent>
        Instantly add 1 TB high-speed Cloudflare R2 edge capacity to your workspace
      </TooltipContent>
    </Tooltip>
  );
}

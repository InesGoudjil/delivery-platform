"use client";

import React, { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface StorageUpgradeButtonProps {
  workspaceId?: string;
  workspaceSlug?: string;
}

export function StorageUpgradeButton({
  workspaceId,
  workspaceSlug,
}: StorageUpgradeButtonProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    if (!workspaceId) {
      toast.error("Workspace identifier missing.");
      return;
    }

    try {
      setIsUpgrading(true);
      toast.info("Preparing Stripe storage upgrade session...");

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          workspaceSlug,
          type: "storage_addon",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to open Stripe checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to retrieve checkout URL from Stripe.");
      }
    } catch (err: any) {
      console.error("[StorageUpgradeButton] Error:", err);
      toast.error(err.message || "Could not launch Stripe checkout.");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-md shadow-primary/20 text-xs cursor-pointer h-9 px-4.5 disabled:opacity-50"
          >
            {isUpgrading ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Zap className="size-3.5 mr-1.5" />
            )}
            {isUpgrading ? "Opening Checkout..." : "Add +1 TB Storage ($15/mo)"}
          </Button>
        }
      />
      <TooltipContent>
        Instantly add 1 TB high-speed Cloudflare R2 edge capacity to your workspace
      </TooltipContent>
    </Tooltip>
  );
}

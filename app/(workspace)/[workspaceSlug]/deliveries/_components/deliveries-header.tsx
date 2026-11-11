"use client";

import React from "react";
import { Plus } from "lucide-react";
import { useOptionalEntitlements } from "@/components/providers/entitlements-provider";
import { Button } from "@/components/ui/button";
import {
  TypographyH1,
  TypographyLead,
  TypographyKicker,
  TypographySpan,
} from "@/components/ui/typography";
import { useModals } from "@/components/modals";

interface DeliveriesHeaderProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  features?: Record<string, any>;
  activeCount?: number;
}

export function DeliveriesHeader({
  workspace,
  features,
  activeCount = 0,
}: DeliveriesHeaderProps) {
  const { setShowNewDeliveryModal } = useModals();

  const entitlements = useOptionalEntitlements();
  const clientLinksLimit = entitlements?.limits.clientLinksMax ?? features?.client_links ?? 1;
  const isUnlimited = clientLinksLimit === -1;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
      <div>
        <TypographyKicker className="text-xs text-primary uppercase tracking-wider mb-1 font-semibold block">
          WORKSPACE DASHBOARD
        </TypographyKicker>
        <TypographyH1 className="text-3xl font-bold font-heading text-foreground">
          Client Deliveries
        </TypographyH1>
        <TypographyLead className="text-sm text-muted-foreground mt-1 font-sans">
          Your projects and client review links with video streaming, timecoded feedback, and WhatsApp delivery.
        </TypographyLead>
      </div>

      <div className="flex items-center gap-3">
        {!isUnlimited && (
          <TypographySpan className="text-xs text-muted-foreground hidden sm:inline px-3 py-1.5 rounded-full border border-border bg-card/60">
            {activeCount} / {clientLinksLimit} active links
          </TypographySpan>
        )}
        <Button
          onClick={() => setShowNewDeliveryModal(true)}
          className="bg-primary hover:bg-primary/90 text-black font-bold text-xs px-5 py-2.5 h-auto rounded-full shadow-md flex items-center gap-2 cursor-pointer"
        >
          <Plus className="size-4" /> New Delivery Room
        </Button>
      </div>
    </div>
  );
}

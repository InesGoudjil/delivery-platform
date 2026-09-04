"use client";

import React, { useState } from "react";
import { CreditCard, Loader2, ShieldCheck, Zap, HardDrive, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ActiveSubscriptionCardProps {
  workspaceId: string;
  currentPlanName: string;
  currentPlanSlug: string;
  subStatus: string;
  periodEnd?: string | null;
  storageGb: number;
  clientLinksLimit: number;
  whatsappDelivery: boolean;
  whiteLabel: boolean;
  onOpenPortal: () => Promise<void>;
  isLoadingPortal: boolean;
}

export function ActiveSubscriptionCard({
  workspaceId,
  currentPlanName,
  currentPlanSlug,
  subStatus,
  periodEnd,
  storageGb,
  clientLinksLimit,
  whatsappDelivery,
  whiteLabel,
  onOpenPortal,
  isLoadingPortal,
}: ActiveSubscriptionCardProps) {
  const isTrial = subStatus === "trialing";
  const isActive = subStatus === "active";

  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <Badge
                variant={isActive ? "default" : "secondary"}
                className="uppercase font-mono text-xs font-bold tracking-wider"
              >
                {subStatus} PLAN
              </Badge>
              {periodEnd && (
                <span className="text-xs text-muted-foreground font-mono">
                  Renews on {new Date(periodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
            <CardTitle className="text-2xl font-bold font-heading capitalize text-foreground">
              {currentPlanName} Tier
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground max-w-xl">
              Currently active subscription for your workspace with assigned storage and feature inclusions.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="p-3 rounded-2xl bg-background border border-border text-foreground">
              <Zap className="size-6 text-primary" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <Separator />

        {/* Feature inclusions checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <HardDrive className="size-4 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">{storageGb} GB</span>
              <span className="text-[10px] text-muted-foreground">Storage Allocation</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <CheckCircle2 className="size-4 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {clientLinksLimit === -1 ? "Unlimited" : `${clientLinksLimit} Active`}
              </span>
              <span className="text-[10px] text-muted-foreground">Client Delivery Links</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <CheckCircle2 className={`size-4 shrink-0 ${whatsappDelivery ? "text-emerald-500" : "text-muted-foreground/40"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {whatsappDelivery ? "Enabled" : "Disabled"}
              </span>
              <span className="text-[10px] text-muted-foreground">WhatsApp Delivery</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <CheckCircle2 className={`size-4 shrink-0 ${whiteLabel ? "text-emerald-500" : "text-muted-foreground/40"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {whiteLabel ? "White Label" : "Standard"}
              </span>
              <span className="text-[10px] text-muted-foreground">Branding</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border bg-background/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
          <span>Payments are end-to-end encrypted with Stripe 256-bit SSL security.</span>
        </div>

        <Button
          onClick={onOpenPortal}
          disabled={isLoadingPortal}
          className="rounded-full shadow-md text-xs font-bold shrink-0 cursor-pointer"
        >
          {isLoadingPortal ? (
            <>
              <Loader2 data-icon="inline-start" className="animate-spin" />
              Opening Stripe Portal...
            </>
          ) : (
            <>
              <CreditCard data-icon="inline-start" />
              Manage Billing &amp; Payment Methods
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

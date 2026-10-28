"use client";

import React from "react";
import {
  CreditCard,
  Loader2,
  ShieldCheck,
  Zap,
  HardDrive,
  Share2,
  Film,
  Users,
  Sparkles,
  ArrowDownCircle,
  Check,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographyH2, TypographyMuted, TypographySmall, TypographySpan } from "@/components/ui/typography";
import { WorkspaceFeatureConfig } from "@/core/entities/workspace";

interface ActiveSubscriptionCardProps {
  workspaceId: string;
  currentPlanName: string;
  currentPlanSlug: string;
  subStatus: string;
  periodEnd?: string | null;
  features: WorkspaceFeatureConfig;
  storageUsedBytes?: number;
  canManageBilling?: boolean;
  hasBillingHistory?: boolean;
  onOpenPortal: () => Promise<void>;
  isLoadingPortal: boolean;
  onScrollToPlans?: () => void;
}

export function ActiveSubscriptionCard({
  workspaceId,
  currentPlanName,
  currentPlanSlug,
  subStatus,
  periodEnd,
  features,
  storageUsedBytes = 0,
  canManageBilling = true,
  hasBillingHistory = false,
  onOpenPortal,
  isLoadingPortal,
  onScrollToPlans,
}: ActiveSubscriptionCardProps) {
  const isStarter = currentPlanSlug === "starter";
  const isActive = subStatus === "active";

  const storageGb = features?.storage_gb ?? 0;
  const clientLinks = features?.client_links ?? 1;
  const portfolioVideos = features?.portfolio_videos ?? 0;
  const teamSeats = features?.team_seats ?? 1;

  const whatsappDelivery = Boolean(features?.whatsapp_delivery);
  const branding = Boolean(features?.branding);
  const watermark = Boolean(features?.watermark);
  const passwordProtected = Boolean(features?.password_protected);
  const whiteLabel = Boolean(features?.white_label);
  const prioritySupport = Boolean(features?.priority_support);

  const usedGb = (storageUsedBytes / (1024 * 1024 * 1024)).toFixed(1);
  const totalGb = storageGb > 0 ? storageGb : 2;
  const remainingGb = Math.max(0, totalGb - Number(usedGb)).toFixed(1);
  const storagePercentage = Math.min(100, Math.round(((storageUsedBytes / (1024 * 1024 * 1024)) / totalGb) * 100));

  const featurePills = [
    { label: "WhatsApp Delivery", enabled: whatsappDelivery },
    { label: "Custom Studio Branding", enabled: branding },
    { label: "Burn-in Watermark", enabled: watermark },
    { label: "PIN & Password Protection", enabled: passwordProtected },
    { label: "White-Label Client View", enabled: whiteLabel, highlight: "Studio" },
    { label: "Priority VIP Support", enabled: prioritySupport, highlight: "Pro+" },
  ];

  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <Badge
                variant={isStarter ? "secondary" : isActive ? "default" : "outline"}
                className="uppercase  text-xs font-bold tracking-wider px-2.5 py-0.5"
              >
                {isStarter ? "FREE TIER" : `${subStatus} PLAN`}
              </Badge>
              {periodEnd ? (
                // <span className="text-xs text-muted-foreground ">
                // <TypographySmall>
                //   Renews on {new Date(periodEnd).toLocaleDateString()}
                // </TypographySmall>
                <></>
              ) : isStarter ? (
                <TypographySpan className="text-xs text-muted-foreground ">
                  No renewal fees • Free forever
                </TypographySpan>
              ) : null}
            </div>
            <CardTitle className="p-0 border-none">
              <TypographyH2 className="text-2xl font-bold font-heading capitalize text-foreground border-none pb-0">
                {currentPlanName} Plan
              </TypographyH2>
            </CardTitle>
            <TypographyMuted className="text-xs text-muted-foreground max-w-xl">
              {isStarter
                ? "Your workspace is currently running on the complimentary Starter quota. Upgrade to unlock expanded cloud storage and client delivery features."
                : "Active production subscription for your workspace with assigned cloud storage and client delivery features."}
            </TypographyMuted>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="p-3 rounded-2xl bg-background/80 border border-border text-foreground shadow-inner">
              <Zap className="size-6 text-primary" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <Separator />

        {/* 2-Column Split: Storage Allocation & Quick Quota KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Storage Usage Progress */}
          <div className="lg:col-span-7 flex flex-col justify-between p-4 rounded-xl bg-background/70 border border-border">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <HardDrive className="size-4" />
                  </div>
                  <TypographySpan className="font-semibold text-foreground">Workspace Cloud Storage</TypographySpan>
                </div>
                <div className="flex items-center gap-2">
                  <TypographySpan className=" text-muted-foreground text-xs">
                    <strong className="text-foreground">{usedGb} GB</strong> of {totalGb} GB
                  </TypographySpan>
                  <Badge
                    variant={storagePercentage > 90 ? "destructive" : storagePercentage > 75 ? "orange" : "sage"}
                    className="text-[10px]  px-2 py-0.5 font-bold"
                  >
                    {storagePercentage}%
                  </Badge>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden p-0.5 border border-border/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    storagePercentage > 90
                      ? "bg-destructive shadow-sm shadow-destructive/50"
                      : storagePercentage > 75
                      ? "bg-primary"
                      : "bg-gradient-to-r from-primary to-primary/80"
                  }`}
                  style={{ width: `${Math.max(2, storagePercentage)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/40 mt-3 ">
              <TypographySpan>{remainingGb} GB remaining</TypographySpan>
              <TypographySpan>Need more space? Upgrade to Pro for 500 GB</TypographySpan>
            </div>
          </div>

          {/* Right Column: Key Resource Limits (KPI Strip) */}
          <div className="lg:col-span-5 grid grid-cols-3 gap-3">
            {/* Delivery Links */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-background/60 border border-border">
              <div className="p-1.5 w-fit rounded-lg bg-primary/10 text-primary">
                <Share2 className="size-4" />
              </div>
              <div className="flex flex-col mt-2">
                <TypographySpan className="text-sm font-bold text-foreground">
                  {clientLinks === -1 ? "Unlimited" : clientLinks}
                </TypographySpan>
                <TypographySpan className="text-[10px] text-muted-foreground font-medium leading-tight">
                  Active Links
                </TypographySpan>
              </div>
            </div>

            {/* Portfolio Videos */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-background/60 border border-border">
              <div className="p-1.5 w-fit rounded-lg bg-primary/10 text-primary">
                <Film className="size-4" />
              </div>
              <div className="flex flex-col mt-2">
                <TypographySpan className="text-sm font-bold text-foreground">
                  {portfolioVideos === -1 ? "Unlimited" : portfolioVideos}
                </TypographySpan>
                <TypographySpan className="text-[10px] text-muted-foreground font-medium leading-tight">
                  Portfolio Films
                </TypographySpan>
              </div>
            </div>

            {/* Workspace Seats */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-background/60 border border-border">
              <div className="p-1.5 w-fit rounded-lg bg-primary/10 text-primary">
                <Users className="size-4" />
              </div>
              <div className="flex flex-col mt-2">
                <TypographySpan className="text-sm font-bold text-foreground">
                  {teamSeats === 1 ? "1 (Solo)" : `${teamSeats}`}
                </TypographySpan>
                <TypographySpan className="text-[10px] text-muted-foreground font-medium leading-tight">
                  Team Seats
                </TypographySpan>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Inclusions Status Badges */}
        <div className="flex flex-col gap-2.5">
          <TypographySpan className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current Tier Feature Inclusions
          </TypographySpan>
          <div className="flex flex-wrap gap-2">
            {featurePills.map((pill) => (
              <div
                key={pill.label}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  pill.enabled
                    ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/25"
                    : "bg-muted/40 text-muted-foreground/60 border-border/40"
                }`}
              >
                {pill.enabled ? (
                  <Check className="size-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <Lock className="size-3 shrink-0 text-muted-foreground/50" />
                )}
                <TypographySpan>{pill.label}</TypographySpan>
                {!pill.enabled && pill.highlight && (
                  <TypographySpan className="text-[10px]  font-semibold px-1 py-0.2 rounded bg-muted text-muted-foreground">
                    {pill.highlight}
                  </TypographySpan>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border bg-background/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
          <TypographySpan>Payments are end-to-end encrypted with Stripe 256-bit SSL security.</TypographySpan>
        </div>

        {canManageBilling ? (
          hasBillingHistory ? (
            <Button
              onClick={onOpenPortal}
              disabled={isLoadingPortal}
              variant="default"
              className="rounded-full shadow-md text-xs font-bold shrink-0 cursor-pointer"
            >
              {isLoadingPortal ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin size-3.5" />
                  Opening Stripe Portal...
                </>
              ) : (
                <>
                  <CreditCard data-icon="inline-start" className="size-3.5" />
                  Manage Billing &amp; Payment Methods
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={onScrollToPlans}
              variant="default"
              className="rounded-full shadow-md text-xs font-bold shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
            >
              <Sparkles className="size-3.5" />
              <TypographySpan>Upgrade Workspace Plan</TypographySpan>
              <ArrowDownCircle className="size-3.5" />
            </Button>
          )
        ) : (
          <Badge variant="secondary" className="text-xs font-normal text-muted-foreground py-1 px-3">
            Only workspace owners can modify billing
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}

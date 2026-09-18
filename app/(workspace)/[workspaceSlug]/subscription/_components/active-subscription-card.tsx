"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Loader2,
  ShieldCheck,
  Zap,
  HardDrive,
  CheckCircle2,
  XCircle,
  Share2,
  Film,
  Users,
  MessageSquare,
  Lock,
  Palette,
  Shield,
  Bell,
  Headphones,
  EyeOff,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
}: ActiveSubscriptionCardProps) {
  const isTrial = subStatus === "trialing";
  const isActive = subStatus === "active";

  const storageGb = features?.storage_gb ?? 0;
  const clientLinks = features?.client_links ?? 1;
  const portfolioVideos = features?.portfolio_videos ?? 0;
  const teamSeats = features?.team_seats ?? 1;
  const whatsappDelivery = Boolean(features?.whatsapp_delivery);
  const branding = Boolean(features?.branding);
  const watermark = Boolean(features?.watermark);
  const passwordProtected = Boolean(features?.password_protected);
  const downloadNotifications = Boolean(features?.download_notifications);
  const whiteLabel = Boolean(features?.white_label);
  const prioritySupport = Boolean(features?.priority_support);

  const usedGb = (storageUsedBytes / (1024 * 1024 * 1024)).toFixed(1);
  const totalGb = storageGb > 0 ? storageGb : 2;
  const storagePercentage = Math.min(100, Math.round(((storageUsedBytes / (1024 * 1024 * 1024)) / totalGb) * 100));

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

        {/* Storage Usage Progress */}
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-background/70 border border-border">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <HardDrive className="size-4 text-primary" />
              <span className="font-semibold text-foreground">Storage Allocation</span>
            </div>
            <span className="font-mono text-muted-foreground">
              <strong className="text-foreground">{usedGb} GB</strong> of {totalGb} GB used ({storagePercentage}%)
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                storagePercentage > 90 ? "bg-red-500" : storagePercentage > 75 ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${Math.max(2, storagePercentage)}%` }}
            />
          </div>
        </div>

        {/* Feature inclusions checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {/* Storage */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <HardDrive className="size-4 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">{storageGb} GB</span>
              <span className="text-[10px] text-muted-foreground">Storage Allocation</span>
            </div>
          </div>

          {/* Client Delivery Links */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <Share2 className="size-4 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {clientLinks === -1 ? "Unlimited" : `${clientLinks} Active`}
              </span>
              <span className="text-[10px] text-muted-foreground">Client Delivery Links</span>
            </div>
          </div>

          {/* Portfolio Videos */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <Film className="size-4 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {portfolioVideos === -1 ? "Unlimited" : `${portfolioVideos} Films`}
              </span>
              <span className="text-[10px] text-muted-foreground">Portfolio Showcase</span>
            </div>
          </div>

          {/* Team Seats */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <Users className="size-4 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {teamSeats === 1 ? "1 Member (Solo)" : `${teamSeats} Seats`}
              </span>
              <span className="text-[10px] text-muted-foreground">Workspace Seats</span>
            </div>
          </div>

          {/* WhatsApp Delivery */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <MessageSquare className={`size-4 shrink-0 ${whatsappDelivery ? "text-emerald-500" : "text-muted-foreground/40"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {whatsappDelivery ? "Instant Alerts" : "Not Included"}
              </span>
              <span className="text-[10px] text-muted-foreground">WhatsApp Delivery</span>
            </div>
          </div>

          {/* Custom Branding */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <Palette className={`size-4 shrink-0 ${branding ? "text-emerald-500" : "text-muted-foreground/40"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {branding ? "Colors & Logo" : "Default"}
              </span>
              <span className="text-[10px] text-muted-foreground">Custom Theme</span>
            </div>
          </div>

          {/* Watermark */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <Shield className={`size-4 shrink-0 ${watermark ? "text-emerald-500" : "text-muted-foreground/40"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {watermark ? "Burn-in Security" : "Disabled"}
              </span>
              <span className="text-[10px] text-muted-foreground">Watermark Protection</span>
            </div>
          </div>

          {/* Passcode Security */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <Lock className={`size-4 shrink-0 ${passwordProtected ? "text-emerald-500" : "text-muted-foreground/40"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {passwordProtected ? "PIN & Password" : "Open Links"}
              </span>
              <span className="text-[10px] text-muted-foreground">Delivery Security</span>
            </div>
          </div>

          {/* Download Notifications */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <Bell className={`size-4 shrink-0 ${downloadNotifications ? "text-emerald-500" : "text-muted-foreground/40"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {downloadNotifications ? "Real-time" : "Standard"}
              </span>
              <span className="text-[10px] text-muted-foreground">Download Notifications</span>
            </div>
          </div>

          {/* White-Label Branding */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <EyeOff className={`size-4 shrink-0 ${whiteLabel ? "text-emerald-500" : "text-muted-foreground/40"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {whiteLabel ? "White-Label" : "Standard"}
              </span>
              <span className="text-[10px] text-muted-foreground">Client View Branding</span>
            </div>
          </div>

          {/* Priority Support */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background/60 border border-border">
            <Headphones className={`size-4 shrink-0 ${prioritySupport ? "text-emerald-500" : "text-muted-foreground/40"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {prioritySupport ? "VIP Support" : "Standard"}
              </span>
              <span className="text-[10px] text-muted-foreground">Customer Support</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border bg-background/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
          <span>Payments are end-to-end encrypted with Stripe 256-bit SSL security.</span>
        </div>

        {canManageBilling ? (
          <Button
            onClick={onOpenPortal}
            disabled={isLoadingPortal || !hasBillingHistory}
            variant={hasBillingHistory ? "default" : "outline"}
            className="rounded-full shadow-md text-xs font-bold shrink-0 cursor-pointer"
            title={!hasBillingHistory ? "Subscribe to a paid plan first to manage billing profile" : undefined}
          >
            {isLoadingPortal ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Opening Stripe Portal...
              </>
            ) : hasBillingHistory ? (
              <>
                <CreditCard data-icon="inline-start" />
                Manage Billing &amp; Payment Methods
              </>
            ) : (
              <>
                <CreditCard data-icon="inline-start" className="opacity-50" />
                No Stripe Billing Profile Yet
              </>
            )}
          </Button>
        ) : (
          <Badge variant="secondary" className="text-xs font-normal text-muted-foreground py-1 px-3">
            Only workspace owners can modify billing
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}

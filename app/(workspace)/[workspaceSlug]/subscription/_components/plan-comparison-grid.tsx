"use client";

import React, { useState } from "react";
import { Check, Loader2, Sparkles, ArrowRight, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypographyH3, TypographyMuted } from "@/components/ui/typography";

export interface PlanItem {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  currency: string;
  billingInterval: string;
  stripePriceId?: string | null;
  features?: Record<string, any>;
}

interface PlanComparisonGridProps {
  currentPlanSlug: string;
  plans: PlanItem[];
  onCheckout: (plan: PlanItem) => Promise<void>;
  loadingPlanId: string | null;
  canManageBilling?: boolean;
}

export function PlanComparisonGrid({
  currentPlanSlug,
  plans,
  onCheckout,
  loadingPlanId,
  canManageBilling = true,
}: PlanComparisonGridProps) {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  return (
    <div id="available-plans" className="flex flex-col gap-6 scroll-mt-6">
      {/* Header & Monthly/Annual Billing Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <TypographyH3 className="text-xl font-bold font-heading text-foreground">
              Available Workspace Tiers
            </TypographyH3>
            <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wider">
              Instant Quota Upgrade
            </Badge>
          </div>
          <TypographyMuted className="text-xs text-muted-foreground">
            Upgrade or change your studio plan anytime. Prorated adjustments applied automatically.
          </TypographyMuted>
        </div>

        {/* Billing interval switch */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-full border border-border self-start sm:self-auto">
          <Button
            type="button"
            variant={billingInterval === "month" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setBillingInterval("month")}
            className={`rounded-full px-4 text-xs font-semibold transition-all cursor-pointer h-7 ${
              billingInterval === "month"
                ? "bg-background text-foreground shadow-sm font-bold hover:bg-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </Button>

          <Button
            type="button"
            variant={billingInterval === "year" ? "default" : "ghost"}
            size="sm"
            onClick={() => setBillingInterval("year")}
            className={`rounded-full px-4 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 h-7 ${
              billingInterval === "year"
                ? "bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Annual</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
              Save 20%
            </Badge>
          </Button>
        </div>
      </div>

      {billingInterval === "year" && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span>
              <strong>Annual Discount Active:</strong> Save 20% across all paid tiers when billed annually.
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">2 months free</span>
        </div>
      )}

      {/* Grid of Plan Cards - Aligned Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentPlanSlug;
          // const isPopular = plan.slug === "pro";
          const isPopular = false
          const basePrice = plan.priceCents / 100;
          const displayPrice =
            billingInterval === "year"
              ? basePrice > 0
                ? Math.round(basePrice * 0.8)
                : 0
              : basePrice;
          const isCheckoutLoading = loadingPlanId === plan.id;

          const f = plan.features || {};
          const storageGb = f.storage_gb ?? 0;
          const clientLinks = f.client_links;
          const portfolioVideos = f.portfolio_videos;
          const teamSeats = f.team_seats ?? 1;
          const whatsapp = Boolean(f.whatsapp_delivery);
          const branding = Boolean(f.branding);
          const watermark = Boolean(f.watermark);
          const whiteLabel = Boolean(f.white_label);
          const prioritySupport = Boolean(f.priority_support);

          // Standardized 9-feature comparison matrix
          const matrixRows = [
            {
              label: `${storageGb >= 1024 ? `${(storageGb / 1024).toFixed(0)} TB` : `${storageGb} GB`} Cloud Storage`,
              included: storageGb > 0,
            },
            {
              label:
                clientLinks === -1
                  ? "Unlimited client delivery links"
                  : `${clientLinks ?? 1} active delivery link${(clientLinks ?? 1) > 1 ? "s" : ""}`,
              included: true,
            },
            {
              label:
                portfolioVideos === -1
                  ? "Unlimited portfolio showcase"
                  : `${portfolioVideos ?? 4} portfolio film${(portfolioVideos ?? 4) > 1 ? "s" : ""}`,
              included: true,
            },
            {
              label: teamSeats === 1 ? "1 Member (Solo studio)" : `${teamSeats} Team Seats`,
              included: true,
            },
            {
              label: "WhatsApp client delivery alerts",
              included: whatsapp,
            },
            {
              label: "Custom studio branding & logo",
              included: branding,
            },
            {
              label: "Burn-in watermark & PIN security",
              included: watermark,
            },
            {
              label: "100% White-label client view",
              included: whiteLabel,
            },
            {
              label: prioritySupport ? "VIP Priority Customer Support" : "Standard Community Support",
              included: prioritySupport,
              subtle: !prioritySupport,
            },
          ];

          return (
            <Card
              key={plan.id}
              className={`flex flex-col justify-between transition-all duration-200 relative ${
                isCurrent
                  ? "border-2 border-primary/70 shadow-lg ring-1 ring-primary/20 bg-card"
                  : isPopular
                  ? "border-2 border-primary shadow-xl ring-2 ring-primary/25 bg-card"
                  : "border-border hover:border-primary/40 bg-card/85"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <Badge
                    variant="default"
                    className="text-[10px] font-bold tracking-wider uppercase px-3 py-1 shadow-md bg-primary text-primary-foreground flex items-center gap-1"
                  >
                    <Sparkles className="size-3" />
                    <span>Most Popular</span>
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4 pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="p-0 border-none">
                    <TypographyH3 className="text-xl font-bold font-heading text-foreground">
                      {plan.name}
                    </TypographyH3>
                  </CardTitle>
                  {isCurrent && (
                    <Badge variant="default" className="text-[10px] font-mono px-2 py-0.5">
                      Active Plan
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col pt-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                      ${displayPrice}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">/month</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {basePrice === 0
                      ? "Free forever"
                      : billingInterval === "year"
                      ? "Billed annually"
                      : "Billed monthly"}
                  </span>
                </div>
              </CardHeader>

              {/* Standardized Aligned Feature Matrix */}
              <CardContent className="flex flex-col gap-2.5 py-2 flex-1">
                {matrixRows.map((row, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs min-h-[22px]">
                    {row.included ? (
                      <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <Minus className="size-3.5 text-muted-foreground/35 shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`leading-snug ${
                        row.included
                          ? "text-foreground/90 font-medium"
                          : "text-muted-foreground/45"
                      }`}
                    >
                      {row.label}
                    </span>
                  </div>
                ))}
              </CardContent>

              <CardFooter className="pt-6 pb-6 border-t border-border/40 mt-4">
                {isCurrent ? (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full text-xs font-semibold cursor-not-allowed opacity-75"
                  >
                    Current Plan
                  </Button>
                ) : plan.slug === "starter" ? (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full text-xs font-semibold opacity-60"
                  >
                    Free Tier
                  </Button>
                ) : !canManageBilling ? (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full text-xs font-semibold cursor-not-allowed opacity-60"
                    title="Only workspace owners or administrators can change subscription plans"
                  >
                    Owner Access Required
                  </Button>
                ) : (
                  <Button
                    onClick={() => onCheckout(plan)}
                    disabled={isCheckoutLoading}
                    variant={isPopular ? "default" : "secondary"}
                    className={`w-full text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      isPopular
                        ? "shadow-md hover:shadow-primary/20"
                        : "hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    {isCheckoutLoading ? (
                      <>
                        <Loader2 data-icon="inline-start" className="animate-spin size-3.5" />
                        Redirecting to Stripe...
                      </>
                    ) : (
                      <>
                        <span>Upgrade to {plan.name}</span>
                        <ArrowRight className="size-3.5" />
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

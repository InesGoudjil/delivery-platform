"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Sparkles, ArrowRight, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypographyH3, TypographyMuted, TypographySpan } from "@/components/ui/typography";
import {
  groupPlanTiers,
  planForInterval,
  planTier,
  yearlySavingsLabel,
  yearlySavingsPercent,
  type BillingInterval,
} from "@/core/entities/plan";
import { formatUsd, monthlyPriceCents } from "@/lib/billing/price";
import { shareLinksPerDelivery } from "@/lib/share-links/limits";

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
  /** Monthly plans and their yearly twins; the grid pairs them per tier. */
  plans: PlanItem[];
  onCheckout: (plan: PlanItem) => Promise<void>;
  loadingPlanId: string | null;
  canManageBilling?: boolean;
  /** The plan picked on the landing page before signing up: opened, scrolled to and marked. */
  chosenPlanSlug?: string | null;
  /** The workspace has a real Stripe customer, so its paid plan is a live Stripe subscription. */
  hasBillingHistory?: boolean;
}

export function PlanComparisonGrid({
  currentPlanSlug,
  plans,
  onCheckout,
  loadingPlanId,
  canManageBilling = true,
  chosenPlanSlug = null,
  hasBillingHistory = false,
}: PlanComparisonGridProps) {
  const tiers = groupPlanTiers(plans);
  const sellsYearly = tiers.some((tier) => tier.yearly);
  const savingsLabel = yearlySavingsLabel(tiers);

  const intervalOf = (slug: string | null): BillingInterval | null => {
    const plan = slug ? plans.find((p) => p.slug === slug) : undefined;
    if (!plan) return null;
    return plan.billingInterval === "year" ? "year" : "month";
  };
  // Opens on the interval of the plan picked before signup, else of the plan being paid.
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    () => intervalOf(chosenPlanSlug) ?? intervalOf(currentPlanSlug) ?? "month"
  );
  const interval: BillingInterval = sellsYearly ? billingInterval : "month";

  // Checkout always starts a new Stripe subscription and nothing ends the old one, so moving a
  // paid subscription between monthly and yearly here would bill twice. Support does it in Stripe.
  const currentPlan = plans.find((p) => p.slug === currentPlanSlug);
  const paysThroughStripe = hasBillingHistory && (currentPlan?.priceCents ?? 0) > 0;

  useEffect(() => {
    if (!chosenPlanSlug) return;
    document.getElementById(`plan-${chosenPlanSlug}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [chosenPlanSlug]);

  return (
    <div id="available-plans" className="flex flex-col gap-6 scroll-mt-6">
      {/* Header & Monthly/Yearly Billing Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <TypographyH3 className="text-xl font-bold font-heading text-foreground">
              Available Workspace Tiers
            </TypographyH3>
            <Badge variant="secondary" className="text-[10px] font-sans uppercase tracking-wider font-semibold">
              Instant Quota Upgrade
            </Badge>
          </div>
          <TypographyMuted className="text-xs text-muted-foreground">
            Upgrade or change your studio plan anytime. Prorated adjustments applied automatically.
          </TypographyMuted>
        </div>

        {/* Billing interval switch, only when some plans are sold yearly */}
        {sellsYearly && (
          <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-full border border-border self-start sm:self-auto">
            <Button
              type="button"
              variant={interval === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setBillingInterval("month")}
              aria-pressed={interval === "month"}
              className={`rounded-full px-4 text-xs font-semibold transition-all cursor-pointer h-7 ${
                interval === "month"
                  ? "bg-background text-foreground shadow-sm font-bold hover:bg-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </Button>

            <Button
              type="button"
              variant={interval === "year" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingInterval("year")}
              aria-pressed={interval === "year"}
              className={`rounded-full px-4 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 h-7 ${
                interval === "year"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TypographySpan>Yearly</TypographySpan>
              {savingsLabel && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                  {savingsLabel}
                </Badge>
              )}
            </Button>
          </div>
        )}
      </div>

      {interval === "year" && savingsLabel && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center gap-2">
          <Sparkles className="size-4 text-primary shrink-0" />
          <TypographySpan>
            <strong>Yearly billing:</strong> {savingsLabel} on paid plans compared with paying monthly.
          </TypographySpan>
        </div>
      )}

      {/* Grid of Plan Cards - Aligned Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {tiers.map((tier) => {
          const plan = planForInterval(tier, interval);
          const isCurrent = plan.slug === currentPlanSlug;
          const isChosen = !isCurrent && plan.slug === chosenPlanSlug;
          const isYearly = plan.billingInterval === "year";
          // Same tier as the current plan, billed the other way.
          const isIntervalSwitch = !isCurrent && planTier(plan.slug) === planTier(currentPlanSlug);
          const saving = isYearly ? yearlySavingsPercent(tier.monthly.priceCents, plan.priceCents) : 0;
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

          // Standardized feature comparison matrix
          const matrixRows = [
            {
              label: `${storageGb >= 1024 ? `${(storageGb / 1024).toFixed(0)} TB` : `${storageGb} GB`} Cloud Storage`,
              included: storageGb > 0,
            },
            {
              label:
                clientLinks === -1
                  ? "Unlimited delivery rooms"
                  : `${clientLinks ?? 1} active delivery room${(clientLinks ?? 1) > 1 ? "s" : ""}`,
              included: true,
            },
            {
              label: (() => {
                const perRoom = shareLinksPerDelivery(f, planTier(plan.slug));
                return perRoom === -1 ? "Unlimited client links per room" : `${perRoom} client link${perRoom > 1 ? "s" : ""} per room`;
              })(),
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
              key={tier.tier}
              id={`plan-${plan.slug}`}
              className={`flex flex-col justify-between transition-all duration-200 relative scroll-mt-24 ${
                isCurrent
                  ? "border-2 border-primary/70 shadow-lg ring-1 ring-primary/20 bg-card"
                  : isChosen
                  ? // overflow-visible: the "Your pick" badge sits over the card's top edge.
                    "border-2 border-primary shadow-xl ring-2 ring-primary/25 bg-card overflow-visible"
                  : "border-border hover:border-primary/40 bg-card/85"
              }`}
            >
              {isChosen && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <Badge
                    variant="default"
                    className="text-[10px] font-bold tracking-wider uppercase px-3 py-1 shadow-md bg-primary text-primary-foreground flex items-center gap-1"
                  >
                    <Sparkles className="size-3" />
                    <TypographySpan>Your pick</TypographySpan>
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
                    <Badge variant="default" className="text-[10px]  px-2 py-0.5">
                      Active Plan
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col pt-3">
                  <div className="flex items-baseline gap-1">
                    <TypographySpan variant="h2" className="text-3xl font-extrabold  text-foreground tracking-tight">
                      {formatUsd(monthlyPriceCents(plan))}
                    </TypographySpan>
                    <TypographySpan variant="muted" className="text-xs font-medium text-muted-foreground">/month</TypographySpan>
                  </div>
                  <TypographySpan variant="muted" className="text-[11px] text-muted-foreground  mt-0.5">
                    {plan.priceCents === 0
                      ? "Free forever"
                      : isYearly
                      ? `${formatUsd(plan.priceCents)} billed yearly${saving > 0 ? ` · save ${saving}%` : ""}`
                      : "Billed monthly"}
                  </TypographySpan>
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
                    <TypographySpan
                      className={`leading-snug ${
                        row.included
                          ? "text-foreground/90 font-medium"
                          : "text-muted-foreground/45"
                      }`}
                    >
                      {row.label}
                    </TypographySpan>
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
                ) : tier.tier === "starter" ? (
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
                ) : isIntervalSwitch && paysThroughStripe ? (
                  <Button asChild variant="outline" className="w-full text-xs font-semibold">
                    <Link href="/contact">Contact us to switch to {isYearly ? "yearly" : "monthly"}</Link>
                  </Button>
                ) : (
                  <Button
                    onClick={() => onCheckout(plan)}
                    disabled={isCheckoutLoading}
                    variant={isChosen ? "default" : "secondary"}
                    className={`w-full text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      isChosen
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
                        <TypographySpan>
                          {isIntervalSwitch
                            ? `Switch to ${isYearly ? "yearly" : "monthly"} billing`
                            : `Upgrade to ${plan.name}`}
                        </TypographySpan>
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

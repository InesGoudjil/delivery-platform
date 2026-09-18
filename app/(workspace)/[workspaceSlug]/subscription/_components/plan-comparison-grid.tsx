"use client";

import React, { useState } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const [yearly, setYearly] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Monthly/Annual Billing Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-xl font-bold font-heading text-foreground">
            Available Subscription Tiers
          </h3>
          <p className="text-xs text-muted-foreground">
            Upgrade or change your workspace tier anytime.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-muted rounded-full border border-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`px-4 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              !yearly
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`px-4 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              yearly
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Annual</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Save 20%
            </Badge>
          </button>
        </div>
      </div>

      {/* Grid of Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentPlanSlug;
          const isPopular = plan.slug === "pro";
          const basePrice = plan.priceCents / 100;
          const finalPrice = yearly ? (basePrice * 0.8).toFixed(0) : basePrice.toFixed(0);
          const isCheckoutLoading = loadingPlanId === plan.id;

          return (
            <Card
              key={plan.id}
              className={`flex flex-col justify-between transition-all duration-200 relative ${
                isCurrent
                  ? "border-2 border-primary shadow-lg ring-1 ring-primary/20 bg-card"
                  : isPopular
                    ? "border-2 border-primary/60 shadow-md bg-card ring-1 ring-primary/10"
                    : "border-border hover:border-primary/50 bg-card/80"
              }`}
            >
              {isPopular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="text-[10px] font-semibold tracking-wide uppercase px-2.5 py-0.5 shadow-sm">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold font-heading text-foreground">
                    {plan.name}
                  </CardTitle>
                  {isCurrent && (
                    <Badge variant="default" className="text-[10px] font-mono">
                      Active
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col pt-2">
                  <div className="text-3xl font-bold font-mono text-foreground tracking-tight">
                    ${finalPrice}
                    <span className="text-xs font-normal text-muted-foreground"> /mo</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {yearly ? "Billed annually" : "Billed monthly"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-2.5 py-2">
                {/* Storage */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                  <span>{plan.features?.storage_gb ?? 0} GB Storage</span>
                </div>

                {/* Client Delivery Links */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                  <span>
                    {plan.features?.client_links === -1
                      ? "Unlimited client links"
                      : `${plan.features?.client_links ?? 1} client link${(plan.features?.client_links ?? 1) > 1 ? "s" : ""}`}
                  </span>
                </div>

                {/* Portfolio Videos */}
                {plan.features?.portfolio_videos !== undefined && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                    <span>
                      {plan.features.portfolio_videos === -1
                        ? "Unlimited portfolio showcase"
                        : `${plan.features.portfolio_videos} portfolio film${plan.features.portfolio_videos > 1 ? "s" : ""}`}
                    </span>
                  </div>
                )}

                {/* Team Seats */}
                {(plan.features?.team_seats ?? 1) > 1 && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                    <span>{plan.features?.team_seats} Team Seats</span>
                  </div>
                )}

                {/* WhatsApp Delivery */}
                {plan.features?.whatsapp_delivery && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                    <span>WhatsApp Delivery</span>
                  </div>
                )}

                {/* Studio Branding */}
                {plan.features?.branding && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                    <span>Studio Branding</span>
                  </div>
                )}

                {/* Custom Watermark */}
                {plan.features?.watermark && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                    <span>Custom Watermark</span>
                  </div>
                )}

                {/* Passcode Security */}
                {plan.features?.password_protected && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                    <span>Passcode Protection</span>
                  </div>
                )}

                {/* Download Notifications */}
                {plan.features?.download_notifications && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                    <span>Download Notifications</span>
                  </div>
                )}

                {/* White-Label Branding */}
                {plan.features?.white_label && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                    <span>White-Label Branding</span>
                  </div>
                )}

                {/* Priority Support */}
                {plan.features?.priority_support && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check data-icon="inline-start" className="text-primary shrink-0 mt-0.5 size-3.5" />
                    <span>Priority Support</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-6">
                {isCurrent ? (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full text-xs font-semibold cursor-not-allowed"
                  >
                    Current Plan
                  </Button>
                ) : plan.slug === "starter" ? (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full text-xs font-semibold"
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
                    className="w-full text-xs font-semibold cursor-pointer"
                  >
                    {isCheckoutLoading ? (
                      <>
                        <Loader2 data-icon="inline-start" className="animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      `Upgrade to ${plan.name}`
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

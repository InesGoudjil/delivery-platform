"use client";

import React, { useState } from "react";
import { Check, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  motion,
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion";
import {
  SEED_PLANS,
  groupPlanTiers,
  planForInterval,
  yearlySavingsLabel,
  yearlySavingsPercent,
  type BillingInterval,
  type PlanTierGroup,
} from "@/core/entities/plan";
import { formatUsd, monthlyPriceCents as monthlyCents } from "@/lib/billing/price";
import { shareLinksPerDelivery } from "@/lib/share-links/limits";

export interface PricingPlanItem {
  id?: string;
  name: string;
  slug: string;
  priceCents: number;
  currency?: string;
  billingInterval?: string;
  stripePriceId?: string | null;
  features?: Record<string, any>;
}

type PricingTier = PlanTierGroup<PricingPlanItem>;

/** The plans to show: the live ones, or the seed plans when the database returned none. */
export function resolvePricingPlans(plans?: PricingPlanItem[]): PricingPlanItem[] {
  const source =
    plans && plans.length > 0
      ? plans
      : Object.values(SEED_PLANS).filter((p) => p.slug !== "enterprise");

  return source.map((p: any) => ({
    id: p.id || p.slug,
    name: p.name || p.slug.toUpperCase(),
    slug: p.slug,
    priceCents: p.priceCents ?? (p.price_cents || 0),
    currency: p.currency || "USD",
    billingInterval: p.billingInterval || "month",
    stripePriceId: p.stripePriceId || p.stripe_price_id,
    features: p.features || {},
  }));
}

function formatStorage(storageGb: number): string {
  return storageGb >= 1024 ? `${Math.round(storageGb / 1024)} TB` : `${storageGb} GB`;
}

interface PricingSectionProps {
  /** Already resolved, see resolvePricingPlans. Yearly plans are paired with their monthly tier. */
  plans: PricingPlanItem[];
  /** Gets the plan for the billing interval on screen: the yearly plan when yearly is selected. */
  onSelectPlan?: (plan: PricingPlanItem) => void | Promise<void>;
  loadingPlanSlug?: string | null;
}

export function PricingSection({
  plans,
  onSelectPlan,
  loadingPlanSlug,
}: PricingSectionProps) {
  const tiers = groupPlanTiers(plans);
  const sellsYearly = tiers.some((tier) => tier.yearly);
  const savingsLabel = yearlySavingsLabel(tiers);
  // Opens on yearly when it's on sale; without yearly plans there's nothing to toggle.
  const [billing, setBilling] = useState<BillingInterval>("year");
  const interval: BillingInterval = sellsYearly ? billing : "month";

  const tierBySlug = (slug: string) => tiers.find((tier) => tier.tier === slug);
  const featuresOf = (tier?: PricingTier): Record<string, any> => tier?.monthly.features ?? {};
  const proHasSilo = Boolean(featuresOf(tierBySlug("pro")).silo_archive);

  // Helper to generate bullet points per tier based on core feature flags
  const getPlanFeatureBullets = (tier: PricingTier): string[] => {
    const slug = tier.tier;
    const f = featuresOf(tier);
    const storageGb = f.storage_gb ?? (slug === "starter" ? 2 : slug === "basic" ? 100 : slug === "pro" ? 500 : 2048);
    const clientLinks = f.client_links ?? (slug === "starter" ? 1 : slug === "basic" ? 20 : -1);
    const linksPerRoom = shareLinksPerDelivery(f, slug);
    const teamSeats = f.team_seats ?? (slug === "studio" ? 5 : 1);
    const hasArabic = Array.isArray(f.languages) ? f.languages.includes("ar") : slug === "pro" || slug === "studio";
    const hasSilo = Boolean(f.silo_archive);

    if (slug === "starter") {
      return [
        "Full portfolio showcase page",
        `${storageGb} GB video storage`,
        `${clientLinks} active delivery room${clientLinks === 1 ? "" : "s"}`,
        `${linksPerRoom} client link per room`,
        "Review, comments & approvals",
        "English only",
      ];
    }

    if (slug === "basic") {
      return [
        "Full portfolio showcase page",
        `${storageGb} GB video storage`,
        `${clientLinks} active delivery rooms`,
        `${linksPerRoom} client links per room`,
        "Review, comments & approvals",
        "Direct WhatsApp delivery",
        "English only",
      ];
    }

    if (slug === "pro") {
      return [
        "Everything in Basic, plus:",
        `${storageGb} GB video storage`,
        "Unlimited delivery rooms and client links",
        "Password-protected links",
        "Custom watermark overlay",
        hasArabic ? "Arabic + English bilingual" : "Bilingual review room",
        "Custom studio logo & brand colours",
        "File download notifications",
        ...(hasSilo ? ["The Silo secure cold archive"] : []),
        "Priority support",
      ];
    }

    if (slug === "studio") {
      return [
        "Everything in Pro, plus:",
        `${formatStorage(storageGb)} video storage`,
        `${teamSeats} team seats`,
        "White-label (remove CineSpace watermark)",
        // Pro's list has it already when Pro includes it.
        ...(hasSilo && !proHasSilo ? ["The Silo secure cold archive"] : []),
      ];
    }

    // Generic / Enterprise fallback
    return [
      "Custom enterprise capacity",
      `${formatStorage(storageGb)} video storage`,
      `${teamSeats} team seats`,
      "Dedicated account manager",
      "Custom SLA & onboarding",
    ];
  };

  // Matrix comparison data
  const starter = tierBySlug("starter");
  const basic = tierBySlug("basic");
  const pro = tierBySlug("pro");
  const studio = tierBySlug("studio");

  const formatPrice = (tier?: PricingTier) => {
    if (!tier) return "—";
    const plan = planForInterval(tier, interval);
    return plan.priceCents === 0 ? "Free" : `${formatUsd(monthlyCents(plan))}/mo`;
  };

  const MATRIX_ROWS = [
    {
      name: "Price",
      starter: "Free",
      basic: formatPrice(basic),
      pro: formatPrice(pro),
      studio: formatPrice(studio),
    },
    {
      name: "Video storage",
      starter: `${featuresOf(starter).storage_gb ?? 2} GB`,
      basic: `${featuresOf(basic).storage_gb ?? 100} GB`,
      pro: `${featuresOf(pro).storage_gb ?? 500} GB`,
      studio: `${featuresOf(studio).storage_gb ? Math.round(featuresOf(studio).storage_gb / 1024) + " TB" : "2 TB"}`,
    },
    {
      name: "Active delivery rooms",
      starter: `${featuresOf(starter).client_links ?? 1}`,
      basic: `${featuresOf(basic).client_links ?? 20}`,
      pro: "Unlimited",
      studio: "Unlimited",
    },
    {
      name: "Client links per room",
      starter: `${shareLinksPerDelivery(featuresOf(starter), "starter")}`,
      basic: `${shareLinksPerDelivery(featuresOf(basic), "basic")}`,
      pro: "Unlimited",
      studio: "Unlimited",
    },
    {
      name: "Portfolio page",
      starter: "Full",
      basic: "Full",
      pro: "Full",
      studio: "Full",
    },
    {
      name: "Review, comments & approvals",
      starter: true,
      basic: true,
      pro: true,
      studio: true,
    },
    {
      name: "WhatsApp delivery",
      starter: Boolean(featuresOf(starter).whatsapp_delivery),
      basic: Boolean(featuresOf(basic).whatsapp_delivery ?? true),
      pro: Boolean(featuresOf(pro).whatsapp_delivery ?? true),
      studio: Boolean(featuresOf(studio).whatsapp_delivery ?? true),
    },
    {
      name: "Languages",
      starter: "English",
      basic: "English",
      pro: "Arabic + English",
      studio: "Arabic + English",
    },
    {
      name: "Password-protected links",
      starter: Boolean(featuresOf(starter).password_protected),
      basic: Boolean(featuresOf(basic).password_protected),
      pro: Boolean(featuresOf(pro).password_protected ?? true),
      studio: Boolean(featuresOf(studio).password_protected ?? true),
    },
    {
      name: "Watermark media",
      starter: Boolean(featuresOf(starter).watermark),
      basic: Boolean(featuresOf(basic).watermark),
      pro: Boolean(featuresOf(pro).watermark ?? true),
      studio: Boolean(featuresOf(studio).watermark ?? true),
    },
    {
      name: "Your logo & colours",
      starter: Boolean(featuresOf(starter).branding),
      basic: Boolean(featuresOf(basic).branding),
      pro: Boolean(featuresOf(pro).branding ?? true),
      studio: Boolean(featuresOf(studio).branding ?? true),
    },
    {
      name: "Download notifications",
      starter: Boolean(featuresOf(starter).download_notifications),
      basic: Boolean(featuresOf(basic).download_notifications),
      pro: Boolean(featuresOf(pro).download_notifications ?? true),
      studio: Boolean(featuresOf(studio).download_notifications ?? true),
    },
    {
      name: "Priority support",
      starter: Boolean(featuresOf(starter).priority_support),
      basic: Boolean(featuresOf(basic).priority_support),
      pro: Boolean(featuresOf(pro).priority_support ?? true),
      studio: Boolean(featuresOf(studio).priority_support ?? true),
    },
    {
      name: "The Silo (cold archive)",
      starter: Boolean(featuresOf(starter).silo_archive),
      basic: Boolean(featuresOf(basic).silo_archive),
      pro: Boolean(featuresOf(pro).silo_archive),
      studio: Boolean(featuresOf(studio).silo_archive ?? true),
    },
    {
      name: "Team seats",
      starter: "1",
      basic: "1",
      pro: "1",
      studio: `${featuresOf(studio).team_seats ?? 5}`,
    },
    {
      name: "White-label",
      starter: Boolean(featuresOf(starter).white_label),
      basic: Boolean(featuresOf(basic).white_label),
      pro: Boolean(featuresOf(pro).white_label),
      studio: Boolean(featuresOf(studio).white_label ?? true),
    },
  ];

  return (
    <section id="pricing" className="space-y-(--section-gap) text-center">
      {/* 1. Testimonial Quote Banner */}
      <ScrollReveal className="max-w-4xl mx-auto space-y-3">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight uppercase font-display">
          &ldquo;CINESPACE REPLACED THREE TOOLS. MY CLIENTS APPROVE FASTER, AND EVERY PAGE LOOKS LIKE IT CAME FROM A REAL STUDIO.&rdquo;
        </h2>
        <p className="text-sm text-[#aeaeb4] font-medium">— A filmmaker in Dubai</p>
      </ScrollReveal>

      {/* 2. Pricing Header */}
      <ScrollReveal className="text-center">
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="flex justify-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary ">
              PRICES THAT SUIT EVERY FILMMAKER
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight font-display uppercase">
            PAY AS YOU GO
          </h2>
          <p className="text-sm sm:text-base text-[#aeaeb4] max-w-xl mx-auto leading-relaxed">
            Priced in USD · free to start · cancel anytime.
          </p>

          {/* Billing Interval Toggle, only when some plans are sold yearly */}
          {sellsYearly && (
            <div className="pt-2 flex justify-center">
              <div className="relative inline-flex items-center rounded-full bg-[#121217] border border-white/10 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setBilling("month")}
                  aria-pressed={interval === "month"}
                  className={`relative z-10 rounded-full px-6 py-2 text-xs font-bold transition-colors cursor-pointer h-auto ${
                    interval === "month"
                      ? "text-white hover:text-white"
                      : "text-[#aeaeb4] hover:text-white"
                  }`}
                >
                  Monthly
                  {interval === "month" && (
                    <motion.div
                      layoutId="billingIndicator"
                      className="absolute inset-0 bg-white/10 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setBilling("year")}
                  aria-pressed={interval === "year"}
                  className={`relative z-10 rounded-full px-6 py-2 text-xs font-bold transition-colors cursor-pointer h-auto ${
                    interval === "year"
                      ? "text-primary-foreground hover:text-primary-foreground"
                      : "text-[#aeaeb4] hover:text-white"
                  }`}
                >
                  Yearly
                  {savingsLabel && <span className="text-[10px] opacity-90  ml-1">{savingsLabel}</span>}
                  {interval === "year" && (
                    <motion.div
                      layoutId="billingIndicator"
                      className="absolute inset-0 bg-primary shadow-lg shadow-primary/30 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Small spacing (mt-10 sm:mt-12) to Dynamic Plan Cards Grid */}
        <div className="mt-10 sm:mt-12">
          <StaggerContainer
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              tiers.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
            } gap-6 text-left`}
            staggerDelay={0.08}
          >
        {tiers.map((tier) => {
          const plan = planForInterval(tier, interval);
          const isFree = plan.priceCents === 0;
          const isYearly = plan.billingInterval === "year";
          const isPopular = tier.tier === "pro";
          const isLoadingThisPlan = loadingPlanSlug === plan.slug;
          const bullets = getPlanFeatureBullets(tier);
          const saving = isYearly ? yearlySavingsPercent(tier.monthly.priceCents, plan.priceCents) : 0;
          const billingNote = isFree
            ? "free forever · no credit card required"
            : isYearly
            ? `${formatUsd(plan.priceCents)} billed yearly${saving > 0 ? ` · save ${saving}%` : ""}`
            : "billed monthly";

          return (
            <StaggerItem key={tier.tier}>
              <motion.div
                className={`card relative rounded-[28px] border p-8 flex flex-col justify-between h-full transition-all duration-300 ${
                  isPopular
                    ? "border-primary bg-gradient-to-b from-primary/20 via-[#121217] to-[#121217] shadow-2xl ring-1 ring-primary/40"
                    : "border-white/10 bg-[#121217] shadow-xl hover:border-white/20"
                }`}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                {isPopular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest text-primary-foreground shadow-md">
                    MOST POPULAR
                  </span>
                )}

                <div className="space-y-6">
                  <span className="text-sm font-bold text-white tracking-widest font-display block uppercase">
                    {plan.name}
                  </span>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white font-display">
                        {isFree ? "FREE" : formatUsd(monthlyCents(plan))}
                      </span>
                      {!isFree && (
                        <span className="text-xs text-[#aeaeb4] font-medium">/MO</span>
                      )}
                    </div>
                    <span className="text-[11px] text-primary block mt-1">{billingNote}</span>
                  </div>

                  <ul className="space-y-3 text-xs text-[#aeaeb4] pt-2">
                    {bullets.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <Button
                    type="button"
                    disabled={Boolean(loadingPlanSlug)}
                    onClick={() => onSelectPlan?.(plan)}
                    className={`w-full rounded-full py-3.5 text-xs font-extrabold tracking-wider uppercase cursor-pointer h-auto transition-all ${
                      isPopular
                        ? "bg-primary text-primary-foreground shadow-xl shadow-primary/40 hover:bg-primary/90"
                        : "bg-white text-black hover:bg-zinc-200"
                    }`}
                  >
                    {isLoadingThisPlan ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <span>
                        {isFree
                          ? "START FOR FREE"
                          : `CHOOSE ${plan.name}`}
                      </span>
                    )}
                  </Button>
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}
          </StaggerContainer>
        </div>
      </ScrollReveal>

      {/* 4. Compare Packages Table Matrix */}
      <ScrollReveal className="text-center">
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="flex justify-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary ">
              FEATURE MATRIX
            </span>
          </div>
          <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase font-display">
            COMPARE OUR PACKAGES
          </h3>
          <p className="text-sm sm:text-base text-[#aeaeb4] max-w-xl mx-auto leading-relaxed">
            Detailed breakdown of features across all membership tiers.
          </p>
        </div>

        {/* Small spacing from header block to table */}
        <div className="mt-10 sm:mt-12">
          <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-[#121217]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white font-bold">
                <th className="p-4 sm:p-6 w-1/3"></th>
                <th className="p-4 sm:p-6">Starter</th>
                <th className="p-4 sm:p-6">Basic</th>
                <th className="p-4 sm:p-6 bg-primary/20 text-primary">Pro</th>
                <th className="p-4 sm:p-6">Studio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[#aeaeb4]">
              {MATRIX_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="p-4 sm:p-6 font-medium text-white">{row.name}</td>

                  {/* Starter */}
                  <td className="p-4 sm:p-6">
                    {typeof row.starter === "boolean" ? (
                      row.starter ? (
                        <Check className="size-4 text-white" />
                      ) : (
                        <Minus className="size-4 text-zinc-600" />
                      )
                    ) : (
                      row.starter
                    )}
                  </td>

                  {/* Basic */}
                  <td className="p-4 sm:p-6">
                    {typeof row.basic === "boolean" ? (
                      row.basic ? (
                        <Check className="size-4 text-white" />
                      ) : (
                        <Minus className="size-4 text-zinc-600" />
                      )
                    ) : (
                      row.basic
                    )}
                  </td>

                  {/* Pro Column Highlighted */}
                  <td className="p-4 sm:p-6 bg-primary/10 font-bold text-white">
                    {typeof row.pro === "boolean" ? (
                      row.pro ? (
                        <Check className="size-4 text-primary" />
                      ) : (
                        <Minus className="size-4 text-zinc-600" />
                      )
                    ) : (
                      row.pro
                    )}
                  </td>

                  {/* Studio */}
                  <td className="p-4 sm:p-6">
                    {typeof row.studio === "boolean" ? (
                      row.studio ? (
                        <Check className="size-4 text-white" />
                      ) : (
                        <Minus className="size-4 text-zinc-600" />
                      )
                    ) : (
                      row.studio
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>

        <p className="mt-4 text-xs italic text-[#71717a]">
          Every plan includes hosting, transcoding, and secure client links.
        </p>
      </ScrollReveal>
    </section>
  );
}

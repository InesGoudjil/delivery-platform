"use client";

import React, { useState } from "react";
import { Check, Minus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  motion,
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion";
import { SEED_PLANS } from "@/core/entities/plan";

export interface PricingPlanItem {
  id?: string;
  name: string;
  slug: string;
  priceCents: number;
  currency?: string;
  billingInterval?: string;
  stripePriceId?: string | null;
  features?: Record<string, any>;
  popular?: boolean;
}

interface PricingSectionProps {
  plans?: PricingPlanItem[];
  onSelectPlan?: (plan: PricingPlanItem, billing: "yearly" | "monthly") => void | Promise<void>;
  loadingPlanSlug?: string | null;
}

export function PricingSection({
  plans,
  onSelectPlan,
  loadingPlanSlug,
}: PricingSectionProps) {
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");

  // Fallback to core SEED_PLANS if database has no active plans returned
  const resolvedPlans: PricingPlanItem[] = (
    plans && plans.length > 0
      ? plans
      : Object.values(SEED_PLANS).filter((p) => p.slug !== "enterprise")
  ).map((p: any) => ({
    id: p.id || p.slug,
    name: p.name || p.slug.toUpperCase(),
    slug: p.slug,
    priceCents: p.priceCents ?? (p.price_cents || 0),
    currency: p.currency || "USD",
    billingInterval: p.billingInterval || "month",
    stripePriceId: p.stripePriceId || p.stripe_price_id,
    features: p.features || {},
    popular: p.slug === "pro",
  }));

  const handleSelect = (plan: PricingPlanItem) => {
    if (onSelectPlan) {
      onSelectPlan(plan, billing);
    }
  };

  // Helper to generate bullet points per plan based on core feature flags
  const getPlanFeatureBullets = (plan: PricingPlanItem): string[] => {
    const f = plan.features || {};
    const storageGb = f.storage_gb ?? (plan.slug === "starter" ? 2 : plan.slug === "basic" ? 100 : plan.slug === "pro" ? 500 : 2048);
    const clientLinks = f.client_links ?? (plan.slug === "starter" ? 1 : plan.slug === "basic" ? 20 : -1);
    const teamSeats = f.team_seats ?? (plan.slug === "studio" ? 5 : 1);
    const hasArabic = Array.isArray(f.languages) ? f.languages.includes("ar") : plan.slug === "pro" || plan.slug === "studio";

    if (plan.slug === "starter") {
      return [
        "Full portfolio showcase page",
        `${storageGb} GB video storage`,
        `${clientLinks} client delivery link`,
        "Review, comments & approvals",
        "English only",
      ];
    }

    if (plan.slug === "basic") {
      return [
        "Full portfolio showcase page",
        `${storageGb} GB video storage`,
        `${clientLinks} client delivery links`,
        "Review, comments & approvals",
        "Direct WhatsApp delivery",
        "English only",
      ];
    }

    if (plan.slug === "pro") {
      return [
        "Everything in Basic, plus:",
        `${storageGb} GB video storage`,
        "Unlimited client delivery links",
        "Password-protected links",
        "Custom watermark overlay",
        hasArabic ? "Arabic + English bilingual" : "Bilingual review room",
        "Custom studio logo & brand colours",
        "File download notifications",
        "Priority support",
      ];
    }

    if (plan.slug === "studio") {
      return [
        "Everything in Pro, plus:",
        `${storageGb >= 1024 ? `${Math.round(storageGb / 1024)} TB` : `${storageGb} GB`} video storage`,
        `${teamSeats} team seats`,
        "White-label (remove CineSpace watermark)",
        "The Silo secure cold archive",
      ];
    }

    // Generic / Enterprise fallback
    return [
      "Custom enterprise capacity",
      `${storageGb >= 1024 ? `${Math.round(storageGb / 1024)} TB` : `${storageGb} GB`} video storage`,
      `${teamSeats} team seats`,
      "Dedicated account manager",
      "Custom SLA & onboarding",
    ];
  };

  // Matrix comparison data
  const starterPlan = resolvedPlans.find((p) => p.slug === "starter");
  const basicPlan = resolvedPlans.find((p) => p.slug === "basic");
  const proPlan = resolvedPlans.find((p) => p.slug === "pro");
  const studioPlan = resolvedPlans.find((p) => p.slug === "studio");

  const formatPrice = (plan?: PricingPlanItem) => {
    if (!plan) return "—";
    const monthly = Math.round(plan.priceCents / 100);
    if (monthly === 0) return "Free";
    const yearlyMonthly = Math.round(monthly * 0.75);
    return billing === "yearly" ? `$${yearlyMonthly}/mo` : `$${monthly}/mo`;
  };

  const MATRIX_ROWS = [
    {
      name: "Price",
      starter: "Free",
      basic: formatPrice(basicPlan),
      pro: formatPrice(proPlan),
      studio: formatPrice(studioPlan),
    },
    {
      name: "Video storage",
      starter: `${starterPlan?.features?.storage_gb ?? 2} GB`,
      basic: `${basicPlan?.features?.storage_gb ?? 100} GB`,
      pro: `${proPlan?.features?.storage_gb ?? 500} GB`,
      studio: `${studioPlan?.features?.storage_gb ? Math.round(studioPlan.features.storage_gb / 1024) + " TB" : "2 TB"}`,
    },
    {
      name: "Client delivery links",
      starter: `${starterPlan?.features?.client_links ?? 1}`,
      basic: `${basicPlan?.features?.client_links ?? 20}`,
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
      starter: Boolean(starterPlan?.features?.whatsapp_delivery),
      basic: Boolean(basicPlan?.features?.whatsapp_delivery ?? true),
      pro: Boolean(proPlan?.features?.whatsapp_delivery ?? true),
      studio: Boolean(studioPlan?.features?.whatsapp_delivery ?? true),
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
      starter: Boolean(starterPlan?.features?.password_protected),
      basic: Boolean(basicPlan?.features?.password_protected),
      pro: Boolean(proPlan?.features?.password_protected ?? true),
      studio: Boolean(studioPlan?.features?.password_protected ?? true),
    },
    {
      name: "Watermark media",
      starter: Boolean(starterPlan?.features?.watermark),
      basic: Boolean(basicPlan?.features?.watermark),
      pro: Boolean(proPlan?.features?.watermark ?? true),
      studio: Boolean(studioPlan?.features?.watermark ?? true),
    },
    {
      name: "Your logo & colours",
      starter: Boolean(starterPlan?.features?.branding),
      basic: Boolean(basicPlan?.features?.branding),
      pro: Boolean(proPlan?.features?.branding ?? true),
      studio: Boolean(studioPlan?.features?.branding ?? true),
    },
    {
      name: "Download notifications",
      starter: Boolean(starterPlan?.features?.download_notifications),
      basic: Boolean(basicPlan?.features?.download_notifications),
      pro: Boolean(proPlan?.features?.download_notifications ?? true),
      studio: Boolean(studioPlan?.features?.download_notifications ?? true),
    },
    {
      name: "Priority support",
      starter: Boolean(starterPlan?.features?.priority_support),
      basic: Boolean(basicPlan?.features?.priority_support),
      pro: Boolean(proPlan?.features?.priority_support ?? true),
      studio: Boolean(studioPlan?.features?.priority_support ?? true),
    },
    {
      name: "The Silo (cold archive)",
      starter: Boolean(starterPlan?.features?.silo_archive),
      basic: Boolean(basicPlan?.features?.silo_archive),
      pro: Boolean(proPlan?.features?.silo_archive),
      studio: Boolean(studioPlan?.features?.silo_archive ?? true),
    },
    {
      name: "Team seats",
      starter: "1",
      basic: "1",
      pro: "1",
      studio: `${studioPlan?.features?.team_seats ?? 5}`,
    },
    {
      name: "White-label",
      starter: Boolean(starterPlan?.features?.white_label),
      basic: Boolean(basicPlan?.features?.white_label),
      pro: Boolean(proPlan?.features?.white_label),
      studio: Boolean(studioPlan?.features?.white_label ?? true),
    },
  ];

  return (
    <section id="pricing" className="scroll-mt-24 py-16 sm:py-20 lg:py-24 space-y-16 sm:space-y-24 text-center">
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

          {/* Billing Interval Toggle */}
          <div className="pt-2 flex justify-center">
            <div className="relative inline-flex items-center rounded-full bg-[#121217] border border-white/10 p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setBilling("monthly")}
                className={`relative z-10 rounded-full px-6 py-2 text-xs font-bold transition-colors cursor-pointer h-auto ${
                  billing === "monthly"
                    ? "text-white hover:text-white"
                    : "text-[#aeaeb4] hover:text-white"
                }`}
              >
                Monthly
                {billing === "monthly" && (
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
                onClick={() => setBilling("yearly")}
                className={`relative z-10 rounded-full px-6 py-2 text-xs font-bold transition-colors cursor-pointer h-auto ${
                  billing === "yearly"
                    ? "text-primary-foreground hover:text-primary-foreground"
                    : "text-[#aeaeb4] hover:text-white"
                }`}
              >
                Yearly <span className="text-[10px] opacity-90  ml-1">Save 25%</span>
                {billing === "yearly" && (
                  <motion.div
                    layoutId="billingIndicator"
                    className="absolute inset-0 bg-primary shadow-lg shadow-primary/30 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 3. Small spacing (mt-10 sm:mt-12) to Dynamic Plan Cards Grid */}
        <div className="mt-10 sm:mt-12">
          <StaggerContainer
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              resolvedPlans.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
            } gap-6 text-left`}
            staggerDelay={0.08}
          >
        {resolvedPlans.map((plan, idx) => {
          const monthlyPrice = Math.round(plan.priceCents / 100);
          const yearlyPrice = monthlyPrice === 0 ? 0 : Math.round(monthlyPrice * 0.75);
          const activeDisplayPrice = billing === "yearly" ? `$${yearlyPrice}` : `$${monthlyPrice}`;
          const isFree = monthlyPrice === 0;
          const isPopular = plan.popular || plan.slug === "pro";
          const isLoadingThisPlan = loadingPlanSlug === plan.slug;
          const bullets = getPlanFeatureBullets(plan);

          return (
            <StaggerItem key={plan.id || idx}>
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
                        {isFree ? "FREE" : activeDisplayPrice}
                      </span>
                      {!isFree && (
                        <span className="text-xs text-[#aeaeb4] font-medium">/MO</span>
                      )}
                    </div>
                    <span className="text-[11px] text-primary block mt-1">
                      {isFree
                        ? "free forever · no credit card required"
                        : billing === "yearly"
                        ? "billed yearly · save 25%"
                        : "billed monthly"}
                    </span>
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
                    onClick={() => handleSelect(plan)}
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

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { CheckCircle2 } from "lucide-react";
import { HeaderSection } from "@/components/landing/HeaderSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import {
  PricingSection,
  resolvePricingPlans,
  type PricingPlanItem,
} from "@/components/landing/PricingSection";
import { SiloSection } from "@/components/landing/SiloSection";
import { PartnershipSection } from "@/components/landing/PartnershipSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { FooterSection } from "@/components/landing/FooterSection";
import type { UserNavMenuProps } from "@/components/landing/UserNavMenu";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { toast as sonnerToast } from "sonner";
import { groupPlanTiers } from "@/core/entities/plan";
import { forgetPlanIntent, rememberPlanIntent } from "@/lib/billing/plan-intent";

/** Only referral visits (?ref=) open the waitlist modal, so everyone else never loads it. */
const WaitlistModal = dynamic(() => import("@/components/waitlist/WaitlistModal").then((m) => m.WaitlistModal), {
  ssr: false,
});

interface LandingPageProps {
  user?: UserNavMenuProps["user"] | null;
  workspace?: UserNavMenuProps["workspace"] | null;
  referralCode?: string;
  plans?: PricingPlanItem[];
  /** "/demo" while the demo room is on (Admin -> Site settings). Without it, no demo links show. */
  demoHref?: string;
}

export default function LandingPage({
  user,
  workspace,
  referralCode,
  plans,
  demoHref,
}: LandingPageProps) {
  const router = useRouter();
  const [showWaitlistModal, setShowWaitlistModal] = useState(Boolean(referralCode));
  const [loadingPlanSlug, setLoadingPlanSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const pricingPlans = resolvePricingPlans(plans);
  const siloPlanNames = groupPlanTiers(pricingPlans)
    .filter((tier) => tier.monthly.features?.silo_archive)
    .map((tier) => tier.monthly.name);

  // Signed-in visitors go to their workspace: /signup would only send them back here.
  const startHref = user
    ? workspace
      ? `/${workspace.slug}/deliveries`
      : "/new-workspace"
    : "/signup";

  // Dedicated handler for plan selection CTA. `plan` is the monthly or yearly plan picked.
  const handleSelectPlan = async (plan: PricingPlanItem) => {
    const isFree = plan.priceCents === 0;

    // 1. Visitor without an account -> signup. PlanIntentRedirect (workspace layout) then
    //    opens the paid plan they picked, wherever signup lands them.
    if (!user) {
      if (isFree) {
        forgetPlanIntent();
        router.push("/signup");
      } else {
        rememberPlanIntent(plan.slug);
        router.push(`/signup?plan=${encodeURIComponent(plan.slug)}`);
      }
      return;
    }

    // 2. Authenticated user with an active workspace
    if (workspace) {
      // Free plan -> navigate to dashboard
      if (isFree) {
        router.push(`/${workspace.slug}/deliveries`);
        return;
      }

      // Paid plan -> try direct Stripe checkout initiation
      if (plan.stripePriceId && plan.id) {
        try {
          setLoadingPlanSlug(plan.slug);
          const res = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: workspace.id,
              workspaceSlug: workspace.slug,
              planId: plan.id,
            }),
          });

          const data = await res.json();
          if (res.ok && data.url) {
            window.location.href = data.url;
            return;
          }

          if (data.error) {
            sonnerToast.error(data.error);
          }
        } catch (err: any) {
          console.warn("[LandingPage] Checkout error:", err);
          sonnerToast.error("Failed to initiate checkout. Navigating to subscription page.");
        } finally {
          setLoadingPlanSlug(null);
        }
      }

      // Fallback: the chosen plan on the workspace subscription page
      router.push(`/${workspace.slug}/subscription?plan=${encodeURIComponent(plan.slug)}`);
      return;
    }

    // 3. Authenticated user without a workspace yet -> onboarding, then the plan they picked
    if (!isFree) rememberPlanIntent(plan.slug);
    router.push("/new-workspace");
  };

  return (
    <div
      className="root min-h-screen bg-[#070709] text-[#f6f3ec] font-sans antialiased selection:bg-primary selection:text-primary-foreground relative"
    >
      <AmbientBackground variant="subtle" showNoise={false} />

      {/* 1. Header Navigation Bar */}
      <div className="relative z-10">
        <HeaderSection
          user={user}
          workspace={workspace}
          demoHref={demoHref}
        />
      </div>

      {/* Main Landing Page Content Container. --section-gap is the one space between any two
          blocks: between sections, between the blocks inside Features, Pricing and Partnership,
          and above the footer. Sections add no vertical padding of their own. */}
      <main className="w-full px-4 sm:px-6 lg:px-8 relative z-10 [--section-gap:5rem] sm:[--section-gap:6rem] lg:[--section-gap:7rem] space-y-(--section-gap) pb-(--section-gap)">
        {/* 2. Hero Section */}
        <HeroSection
          demoHref={demoHref}
          startHref={startHref}
        />

        {/* 3. Features Section (6-Card Grid & Feature Spotlights 01, 02, 03, Client Experience) */}
        <FeaturesSection demoHref={demoHref} />

        {/* 4. How It Works Section */}
        {/* <WorkflowSection /> */}

        {/* 5. Pricing Section (Testimonial Quote + Dynamic Plan Grid + Compare Packages Matrix) */}
        <PricingSection
          plans={pricingPlans}
          onSelectPlan={handleSelectPlan}
          loadingPlanSlug={loadingPlanSlug}
        />

        {/* 6. The Silo Secure Archive Section */}
        <SiloSection planNames={siloPlanNames} />

        {/* 7. Partnership Section & Application Form */}
        <PartnershipSection onShowToast={showToast} />

        {/* 8. FAQ Section */}
        <FaqSection />

        {/* 9. Call To Action Banner */}
        <CtaSection startHref={startHref} />
      </main>

      {/* 10. Multi-Column Footer */}
      <FooterSection />

      {/* Waitlist Modal (Auto opens on referral link visit or manual trigger) */}
      {referralCode && (
        <WaitlistModal
          isOpen={showWaitlistModal}
          onClose={() => setShowWaitlistModal(false)}
          initialReferralCode={referralCode}
        />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#17171d] border border-primary text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="size-4 text-primary" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

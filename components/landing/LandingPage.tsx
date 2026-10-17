"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { HeaderSection } from "@/components/landing/HeaderSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { PricingSection, type PricingPlanItem } from "@/components/landing/PricingSection";
import { SiloSection } from "@/components/landing/SiloSection";
import { PartnershipSection } from "@/components/landing/PartnershipSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { DemoModal } from "@/components/landing/DemoModal";
import { WaitlistModal } from "@/components/waitlist/WaitlistModal";
import type { UserNavMenuProps } from "@/components/landing/UserNavMenu";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { toast as sonnerToast } from "sonner";

interface LandingPageProps {
  user?: UserNavMenuProps["user"] | null;
  workspace?: UserNavMenuProps["workspace"] | null;
  referralCode?: string;
  plans?: PricingPlanItem[];
}

export default function LandingPage({
  user,
  workspace,
  referralCode,
  plans,
}: LandingPageProps) {
  const router = useRouter();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(Boolean(referralCode));
  const [loadingPlanSlug, setLoadingPlanSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Dedicated handler for plan selection CTA
  const handleSelectPlan = async (
    plan: PricingPlanItem,
    billingInterval: "yearly" | "monthly"
  ) => {
    // 1. Unauthenticated Visitor -> Direct to Signup with plan & interval query params
    if (!user) {
      if (plan.slug === "starter") {
        router.push("/signup?plan=starter");
      } else {
        router.push(`/signup?plan=${plan.slug}&interval=${billingInterval}`);
      }
      return;
    }

    // 2. Authenticated user with an active workspace
    if (workspace) {
      // Starter plan -> navigate to dashboard
      if (plan.slug === "starter") {
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

      // Fallback: navigate to workspace subscription page
      router.push(`/${workspace.slug}/subscription`);
      return;
    }

    // 3. Authenticated user without a workspace yet -> onboarding
    router.push(`/new-workspace?plan=${plan.slug}`);
  };

  const handleStartTrial = () => {
    if (user) {
      router.push(workspace ? `/${workspace.slug}/deliveries` : "/new-workspace");
    } else {
      router.push("/signup");
    }
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
          onOpenDemo={() => setShowDemoModal(true)}
          onStartTrial={handleStartTrial}
        />
      </div>

      {/* Main Landing Page Content Container - Clean balanced section flow */}
      <main className="w-full px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 2. Hero Section */}
        <HeroSection
          onOpenDemo={() => setShowDemoModal(true)}
          onStartTrial={handleStartTrial}
        />

        {/* 3. Features Section (6-Card Grid & Feature Spotlights 01, 02, 03, Client Experience) */}
        <FeaturesSection onOpenDemo={() => setShowDemoModal(true)} />

        {/* 4. How It Works Section */}
        {/* <WorkflowSection /> */}

        {/* 5. Pricing Section (Testimonial Quote + Dynamic Plan Grid + Compare Packages Matrix) */}
        <PricingSection
          plans={plans}
          onSelectPlan={handleSelectPlan}
          loadingPlanSlug={loadingPlanSlug}
        />

        {/* 6. The Silo Secure Archive Section */}
        <SiloSection />

        {/* 7. Partnership Section & Application Form */}
        <PartnershipSection onShowToast={showToast} />

        {/* 8. FAQ Section */}
        <FaqSection />

        {/* 9. Call To Action Banner */}
        <CtaSection onStartTrial={handleStartTrial} />
      </main>

      {/* 10. Multi-Column Footer */}
      <FooterSection />

      {/* Interactive Client Room Demo Modal */}
      <DemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onShowToast={showToast}
      />

      {/* Waitlist Modal (Auto opens on referral link visit or manual trigger) */}
      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        initialReferralCode={referralCode}
      />

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

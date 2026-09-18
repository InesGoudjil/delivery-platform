"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { HeaderSection } from "@/components/landing/HeaderSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { SiloSection } from "@/components/landing/SiloSection";
import { PartnershipSection } from "@/components/landing/PartnershipSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { DemoModal } from "@/components/landing/DemoModal";
import { WaitlistSection } from "@/components/waitlist/WaitlistSection";
import { WaitlistModal } from "@/components/waitlist/WaitlistModal";
import type { UserNavMenuProps } from "@/components/landing/UserNavMenu";
import { AmbientBackground } from "@/components/ui/ambient-background";

interface LandingPageProps {
  user?: UserNavMenuProps["user"] | null;
  workspace?: UserNavMenuProps["workspace"] | null;
  referralCode?: string;
}

export default function LandingPage({ user, workspace, referralCode }: LandingPageProps) {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(Boolean(referralCode));
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div
      className="root min-h-screen bg-[#070709] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-white relative"
    >
      <AmbientBackground variant="subtle" showNoise={false}/>
      {/* 1. Header Navigation Bar */}
      <div className="relative z-10">
        <HeaderSection
          user={user}
          workspace={workspace}
          onOpenDemo={() => setShowDemoModal(true)}
          onStartTrial={() => showToast("Free trial registration initiated!")}
        />
      </div>

      {/* Main Landing Page Content Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-8 space-y-8 relative z-10">
        {/* 2. Hero Section */}
        <HeroSection
          onOpenDemo={() => setShowDemoModal(true)}
          onStartTrial={() => showToast("Free trial registration initiated!")}
        />

        {/* 3. Features Section (6-Card Grid & Feature Spotlights 01, 02, 03, Client Experience) */}
        <FeaturesSection onOpenDemo={() => setShowDemoModal(true)} />

        {/* 4. How It Works Section (01 Upload, 02 Share, 03 Approvals) */}
        {/* <WorkflowSection /> */}

        {/* 5. Pricing Section (Testimonial Quote + 4-Tier Pricing Grid + Compare Packages Matrix) */}
        <PricingSection
          onSelectPlan={(plan) => showToast(`Selected ${plan} plan trial!`)}
        />

        {/* 6. The Silo Secure Archive Section */}
        <SiloSection />

        {/* 7. Partnership Section & Application Form */}
        <PartnershipSection onShowToast={showToast} />

        {/* 8. FAQ Section */}
        <FaqSection />

        {/* 9. Exclusive Beta Waitlist Section */}
        {/* <WaitlistSection initialReferralCode={referralCode} /> */}

        {/* 10. Call To Action Banner */}
        <CtaSection
          onStartTrial={() => showToast("Free trial registration initiated!")}
        />
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
        <div className="fixed bottom-6 right-6 z-50 bg-[#17171d] border border-[#f5551d] text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="size-4 text-[#f5551d]" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

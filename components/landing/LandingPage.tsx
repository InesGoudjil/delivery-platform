"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { HeaderSection } from "@/components/landing/HeaderSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { PartnershipSection } from "@/components/landing/PartnershipSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { DemoModal } from "@/components/landing/DemoModal";
import type { UserNavMenuProps } from "@/components/landing/UserNavMenu";

interface LandingPageProps {
  user?: UserNavMenuProps["user"] | null;
  workspace?: UserNavMenuProps["workspace"] | null;
}

export default function LandingPage({ user, workspace }: LandingPageProps) {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="root min-h-screen bg-[#0a0a0b] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-black">
      {/* Background Subtle Film Grain Overlay */}
      <div className="grain opacity-[0.08]" />

      {/* 1. Header Section */}
      <HeaderSection
        user={user}
        workspace={workspace}
        onOpenDemo={() => setShowDemoModal(true)}
        onStartTrial={() => showToast("Free trial registration initiated!")}
      />

      {/* 2. Hero Section */}
      <HeroSection
        onOpenDemo={() => setShowDemoModal(true)}
        onStartTrial={() => showToast("Free trial registration initiated!")}
      />

      {/* Main Landing Page Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* 3. Partnership / Client Trust Bar Section */}
        <PartnershipSection />

        {/* 4. Interactive Features Section (Review, Portfolio, WhatsApp) */}
        <FeaturesSection onOpenDemo={() => setShowDemoModal(true)} />

        {/* 5. 3-Step Process Workflow Section */}
        <WorkflowSection />

        {/* 6. Transparent Pricing (AED) Section */}
        <PricingSection
          onSelectPlan={(plan) => showToast(`Selected ${plan} plan trial!`)}
        />

        {/* 7. FAQ Accordion Section */}
        <FaqSection />

        {/* 8. Call to Action Banner Section */}
        <CtaSection
          onStartTrial={() => showToast("Free trial registration initiated!")}
        />
      </main>

      {/* 9. Footer Section */}
      <FooterSection />

      {/* 10. Interactive Client Room Demo Modal */}
      <DemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onShowToast={showToast}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141416] border border-[#f5551d] text-[#f6f3ec] px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="size-4 text-[#f5551d]" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

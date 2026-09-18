"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, Flame } from "lucide-react";
import { WaitlistModal } from "./WaitlistModal";

interface WaitlistSectionProps {
  initialReferralCode?: string;
}

export function WaitlistSection({ initialReferralCode }: WaitlistSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section id="waitlist" className="relative my-16 overflow-hidden rounded-3xl border border-[#f5551d]/30 bg-gradient-to-b from-[#180d09] via-[#0e0e12] to-[#070709] p-8 sm:p-12 text-center shadow-2xl scroll-mt-24">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#f5551d]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#f5551d]/40 bg-[#f5551d]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#ff7948]">
          <Flame className="size-3.5 fill-current" />
          <span>Exclusive Beta Access</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
          Join The Next Generation Of Film Delivery.
        </h2>

        <p className="text-sm sm:text-base text-white/70 leading-relaxed">
          We are rolling out invites in weekly cohorts. Join the waitlist today,
          refer colleagues to jump the queue, and get 3 months of Pro free upon launch.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f5551d] to-[#df430f] px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-xl shadow-[#f5551d]/30 transition-all hover:scale-[1.02] hover:shadow-[#f5551d]/50"
          >
            <span>Claim Priority Spot</span>
            <ArrowRight className="size-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-6 py-4 text-sm font-bold tracking-wider text-white hover:bg-white/10 transition-all"
          >
            <span>Check My Status</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 pt-4 text-xs text-white/50">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-[#f5551d]" />
            <span>Spam-protected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-[#f5551d]" />
            <span>Weekly invite waves</span>
          </div>
        </div>
      </div>

      <WaitlistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialReferralCode={initialReferralCode}
      />
    </section>
  );
}

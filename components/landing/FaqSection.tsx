"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Typography,
  TypographyH2,
  TypographyP,
  TypographyKicker,
} from "@/components/ui/typography";

export const FAQS = [
  {
    q: "Do my clients need an account to review?",
    a: "No. Clients open a private, secure link and can immediately watch, comment with timecodes, and approve — nothing to install, register, or sign up for.",
  },
  {
    q: "Can I use my own logo and brand colors?",
    a: "Yes. Studio and Agency plans allow you to set your custom brand name, logo, accent color, and custom handle so every client link looks 100% like your studio.",
  },
  {
    q: "How does video playback & streaming performance work?",
    a: "All cuts are transcoded and served via Cloudflare's ultra-fast global streaming network (1080p & 4K), ensuring fast loading on mobile networks across the Gulf.",
  },
  {
    q: "How does client delivery over WhatsApp work?",
    a: "With one tap, copy a formatted client delivery link ready to paste directly into WhatsApp. Clients click and view instantly on their mobile browser.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. Plans are billed monthly or annually with no lock-in contracts. You can upgrade, downgrade, or cancel at any time directly from your settings.",
  },
];

export function FaqSection() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 border-b border-white/[0.08]">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <TypographyKicker className="text-[#f5551d]">
          Frequently Asked Questions
        </TypographyKicker>
        <TypographyH2 className="mt-2 text-[#f6f3ec]">
          Got questions? We've got answers.
        </TypographyH2>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = faqOpen === idx;
          return (
            <div
              key={idx}
              className="glass-card rounded-2xl overflow-hidden transition-all duration-200 shadow-md"
            >
              <button
                onClick={() => setFaqOpen(isOpen ? null : idx)}
                className="w-full px-6 py-5 text-left font-bold text-base sm:text-lg text-[#f6f3ec] flex items-center justify-between gap-4 cursor-pointer hover:text-[#f5551d] transition-colors font-display"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`size-5 text-[#aeaeb4] transition-transform duration-200 shrink-0 ${
                    isOpen ? "rotate-180 text-[#f5551d]" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-5 text-sm text-[#aeaeb4] leading-relaxed border-t border-white/5 pt-3 animate-in fade-in-50 duration-200 font-sans">
                  <TypographyP className="text-[#aeaeb4] text-sm leading-relaxed">
                    {faq.a}
                  </TypographyP>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

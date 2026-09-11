"use client";

import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const FAQS = [
  {
    q: "How does delivery work?",
    a: "Upload your video export (MP4 or ProRes). CineSpace generates a private, branded screening room link. You can send it directly to your client via WhatsApp or email for instant 4K playback and frame-accurate feedback.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. All CineSpace plans are pay-as-you-go with no long-term contracts. You can upgrade, downgrade, or cancel your subscription at any time with a single click from your account settings.",
  },
  {
    q: "Do my clients need an account to review?",
    a: "No. Clients open a private, secure link and can immediately watch, comment with timecodes, and approve — nothing to install, register, or sign up for.",
  },
  {
    q: "Can I use my own studio branding?",
    a: "Yes. Set your logo, custom studio name, brand colors, and custom URL so every client review page and portfolio looks 100% like your studio.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-16 max-w-4xl mx-auto">
      <div className="w-full text-left space-y-4">
        <Accordion className="w-full">
          {FAQS.map((faq, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`}>
              <AccordionTrigger className="text-lg sm:text-xl font-bold text-white hover:text-[#f5551d] transition-colors py-6 font-display">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-[#aeaeb4] leading-relaxed pb-6">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

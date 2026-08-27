"use client";

import React from "react";
import { Typography, TypographyMuted } from "@/components/ui/typography";

const PARTNERS = [
  { name: "Lost in Tokyo", location: "Dubai" },
  { name: "Clean Performance", location: "Riyadh" },
  { name: "Prestige Rentals", location: "Abu Dhabi" },
  { name: "Seen Couture", location: "Doha" },
  { name: "Al Wasl Studios", location: "Dubai" },
];

export function PartnershipSection() {
  return (
    <section className="py-10 border-b border-white/[0.08] text-center">
      <TypographyMuted
        as="p"
        className="uppercase tracking-widest font-semibold text-[#5e5e64] mb-6 text-xs"
      >
        Trusted by independent filmmakers & boutique studios across the Gulf
      </TypographyMuted>

      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-bold text-[#9a9a9f]">
        {PARTNERS.map((partner, index) => (
          <React.Fragment key={partner.name}>
            <div className="group flex items-center gap-2 cursor-pointer transition-all duration-300 hover:scale-105">
              <span className="text-[#9a9a9f] transition-colors duration-300 group-hover:text-[#f6f3ec]">
                {partner.name}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#5e5e64] group-hover:text-[#f5551d] group-hover:bg-[#f5551d]/10 transition-colors">
                {partner.location}
              </span>
            </div>
            {index < PARTNERS.length - 1 && (
              <span className="hidden sm:inline text-white/20 select-none">•</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

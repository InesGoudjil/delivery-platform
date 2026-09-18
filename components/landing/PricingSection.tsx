"use client";

import React, { useState } from "react";
import { Check, Minus } from "lucide-react";

interface PricingSectionProps {
  onSelectPlan?: (planName: string) => void;
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");

  const handleSelect = (plan: string) => {
    if (onSelectPlan) {
      onSelectPlan(plan);
    }
  };

  const PLANS = [
    {
      name: "STARTER",
      price: "FREE",
      priceSub: "",
      popular: false,
      buttonText: "CHOOSE STARTER",
      buttonStyle: "bg-white text-black hover:bg-zinc-200",
      features: [
        "Full portfolio page",
        "2 GB video storage",
        "1 client delivery link",
        "Review, comments & approvals",
      ],
    },
    {
      name: "BASIC",
      price: billing === "yearly" ? "$9" : "$12",
      period: "/MO",
      priceSub: billing === "yearly" ? "billed yearly · save 25%" : "billed monthly",
      popular: false,
      buttonText: "CHOOSE BASIC",
      buttonStyle: "bg-white text-black hover:bg-zinc-200",
      features: [
        "Full portfolio page",
        "100 GB video storage",
        "20 client delivery links",
        "Review, comments & approvals",
        "WhatsApp delivery",
        "English only",
      ],
    },
    {
      name: "PRO",
      price: billing === "yearly" ? "$22" : "$29",
      period: "/MO",
      priceSub: billing === "yearly" ? "billed yearly · save 25%" : "billed monthly",
      popular: true,
      buttonText: "CHOOSE PRO",
      buttonStyle: "bg-gradient-to-r from-[#ce3a09] to-[#df4510] text-white shadow-xl shadow-[#f5551d]/40 hover:scale-[1.02]",
      features: [
        "Everything in Basic, plus:",
        "500 GB video storage",
        "Unlimited client delivery links",
        "Password-protected links",
        "Watermark media",
        "Arabic + English",
        "Your logo & colours",
        "File download notifications",
        "Priority support",
        "Access to THE SILO",
      ],
    },
    {
      name: "STUDIO",
      price: billing === "yearly" ? "$52" : "$69",
      period: "/MO",
      priceSub: billing === "yearly" ? "billed yearly · save 25%" : "billed monthly",
      popular: false,
      buttonText: "CHOOSE STUDIO",
      buttonStyle: "bg-white text-black hover:bg-zinc-200",
      features: [
        "Everything in Pro, plus:",
        "2 TB video storage",
        "5 team seats",
        "White-label (remove CineSpace)",
      ],
    },
  ];

  const MATRIX_ROWS = [
    { name: "Price", starter: "Free", basic: billing === "yearly" ? "$9/mo" : "$12/mo", pro: billing === "yearly" ? "$22/mo" : "$29/mo", studio: billing === "yearly" ? "$52/mo" : "$69/mo" },
    { name: "Video storage", starter: "2 GB", basic: "100 GB", pro: "500 GB", studio: "2 TB" },
    { name: "Client delivery links", starter: "1", basic: "20", pro: "Unlimited", studio: "Unlimited" },
    { name: "Portfolio page", starter: "Full", basic: "Full", pro: "Full", studio: "Full" },
    { name: "Review, comments & approvals", starter: true, basic: true, pro: true, studio: true },
    { name: "WhatsApp delivery", starter: false, basic: true, pro: true, studio: true },
    { name: "Languages", starter: "English", basic: "English", pro: "Arabic + English", studio: "Arabic + English" },
    { name: "Password-protected links", starter: false, basic: false, pro: true, studio: true },
    { name: "Watermark media", starter: false, basic: false, pro: true, studio: true },
    { name: "Your logo & colours", starter: false, basic: false, pro: true, studio: true },
    { name: "Download notifications", starter: false, basic: false, pro: true, studio: true },
    { name: "Priority support", starter: false, basic: false, pro: true, studio: true },
    { name: "The Silo (cold archive)", starter: false, basic: false, pro: true, studio: true },
    { name: "Team seats", starter: "—", basic: "—", pro: "—", studio: "5" },
    { name: "White-label", starter: false, basic: false, pro: false, studio: true },
  ];

  return (
    <section id="pricing" className="py-20 space-y-24 text-center">
      {/* 1. Testimonial Quote Banner */}
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight uppercase font-display">
          "CINESPACE REPLACED THREE TOOLS. MY CLIENTS APPROVE FASTER, AND EVERY PAGE LOOKS LIKE IT CAME FROM A REAL STUDIO."
        </h2>
        <p className="text-sm text-[#aeaeb4] font-medium">— A filmmaker in Dubai</p>
      </div>

      {/* 2. Pricing Header */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#f5551d]">
          PRICES THAT SUIT EVERY FILMMAKER
        </span>
        <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-display">
          PAY AS YOU GO
        </h2>
        <p className="text-sm sm:text-base text-[#aeaeb4]">
          Priced in USD · free to start · cancel anytime.
        </p>

        {/* Toggle */}
        <div className="pt-4 flex justify-center">
          <div className="inline-flex items-center rounded-full bg-[#121217] border border-white/10 p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-6 py-2 text-xs font-bold transition-all cursor-pointer ${
                billing === "monthly"
                  ? "bg-white/10 text-white"
                  : "text-[#aeaeb4] hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`rounded-full px-6 py-2 text-xs font-bold transition-all cursor-pointer ${
                billing === "yearly"
                  ? "bg-[#f5551d] text-white shadow-lg shadow-[#f5551d]/30"
                  : "text-[#aeaeb4] hover:text-white"
              }`}
            >
              Yearly <span className="text-[10px] opacity-90 font-mono">Save 25%</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. 4-Tier Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {PLANS.map((plan, idx) => (
          <div
            key={idx}
            className={`card relative rounded-[28px] border p-8 flex flex-col justify-between transition-all duration-300 ${
              plan.popular
                ? "border-[#f5551d] bg-gradient-to-b from-[#2a130c] to-[#121217] shadow-2xl scale-[1.02]"
                : "border-white/10 bg-[#121217] shadow-xl hover:border-white/20"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#f5551d] px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-md">
                MOST POPULAR
              </span>
            )}

            <div className="space-y-6">
              <span className="text-sm font-bold text-white tracking-widest font-display block">
                {plan.name}
              </span>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white font-display">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-xs text-[#aeaeb4] font-medium">{plan.period}</span>
                  )}
                </div>
                {plan.priceSub && (
                  <span className="text-[11px] text-[#f5551d] block mt-1">
                    {plan.priceSub}
                  </span>
                )}
              </div>

              <ul className="space-y-3 text-xs text-[#aeaeb4] pt-2">
                {plan.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2">
                    <Check className="size-3.5 text-[#f5551d] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8">
              <button
                onClick={() => handleSelect(plan.name)}
                className={`w-full rounded-full py-3.5 text-xs font-extrabold tracking-wider uppercase transition-all cursor-pointer ${plan.buttonStyle}`}
              >
                {plan.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Compare Packages Table Matrix */}
      <div className="pt-12 space-y-8">
        <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase font-display">
          COMPARE OUR PACKAGES
        </h3>

        <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-[#121217]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white font-bold">
                <th className="p-4 sm:p-6 w-1/3"></th>
                <th className="p-4 sm:p-6">Starter</th>
                <th className="p-4 sm:p-6">Basic</th>
                <th className="p-4 sm:p-6 bg-[#2a130c]/80 text-[#f5551d]">Pro</th>
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
                  <td className="p-4 sm:p-6 bg-[#2a130c]/40 font-bold text-white">
                    {typeof row.pro === "boolean" ? (
                      row.pro ? (
                        <Check className="size-4 text-[#f5551d]" />
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

        <p className="text-xs italic text-[#71717a]">
          Every plan includes hosting, transcoding, and secure client links.
        </p>
      </div>
    </section>
  );
}

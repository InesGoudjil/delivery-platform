"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Typography,
  TypographyH2,
  TypographyP,
  TypographyKicker,
} from "@/components/ui/typography";

interface PricingSectionProps {
  onSelectPlan?: (planName: string) => void;
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const handleSelect = (plan: string) => {
    if (onSelectPlan) {
      onSelectPlan(plan);
    }
  };

  return (
    <section id="pricing" className="py-20 border-b border-white/[0.08]">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <TypographyKicker className="text-[#f5551d]">
          Transparent Pricing (AED)
        </TypographyKicker>
        <TypographyH2 className="mt-2 text-[#f6f3ec]">
          7-Day Free Trial. No Lock-in.
        </TypographyH2>
        <TypographyP className="text-[#9a9a9f] mt-4 text-base">
          Simple, predictable plans designed for Gulf creators and boutique
          studios.
        </TypographyP>

        {/* Monthly / Annual Billing Toggle */}
        <div className="inline-flex items-center gap-3 mt-8 p-1 rounded-full bg-[#141416] border border-white/10 shadow-lg">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              billing === "monthly"
                ? "bg-[#f5551d] text-[#160a03] shadow-md"
                : "text-[#9a9a9f] hover:text-[#f6f3ec]"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              billing === "annual"
                ? "bg-[#f5551d] text-[#160a03] shadow-md"
                : "text-[#9a9a9f] hover:text-[#f6f3ec]"
            }`}
          >
            Annual Billing{" "}
            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-[#f6f3ec]">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {/* Tier 1: Solo */}
        <Card className="bg-[#141416] border-white/10 rounded-2xl p-8 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl">
          <div>
            <CardHeader className="p-0">
              <CardTitle className="text-2xl font-bold text-[#f6f3ec]">
                Solo
              </CardTitle>
              <CardDescription className="text-xs text-[#9a9a9f] mt-1">
                For independent videographers
              </CardDescription>
            </CardHeader>

            <div className="my-6">
              <span className="font-heading text-4xl font-extrabold text-[#f6f3ec]">
                {billing === "monthly" ? "39" : "31"}
              </span>
              <span className="text-sm text-[#9a9a9f]"> AED / month</span>
            </div>

            <CardContent className="p-0">
              <ul className="space-y-3 text-xs text-[#9a9a9f]">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> 5 Active client
                  projects
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> 1080p Cloudflare
                  CDN streaming
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> WhatsApp mobile
                  delivery links
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> Timecoded client
                  feedback
                </li>
              </ul>
            </CardContent>
          </div>

          <CardFooter className="p-0 border-none bg-transparent pt-8">
            <Button
              onClick={() => handleSelect("Solo")}
              variant="outline"
              className="w-full rounded-full border-white/20 text-[#f6f3ec] hover:bg-white/10 cursor-pointer bg-white/[0.04]"
            >
              Start 7-Day Free Trial
            </Button>
          </CardFooter>
        </Card>

        {/* Tier 2: Studio (Most Popular) */}
        <Card className="bg-[#141416] border-2 border-[#f5551d] rounded-2xl p-8 flex flex-col justify-between relative shadow-2xl shadow-[#f5551d]/15 transition-all duration-300">
          <Badge
            variant="orange"
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest bg-[#f5551d] text-black border-none shadow-md"
          >
            MOST POPULAR
          </Badge>

          <div>
            <CardHeader className="p-0">
              <CardTitle className="text-2xl font-bold text-[#f6f3ec]">
                Studio
              </CardTitle>
              <CardDescription className="text-xs text-[#9a9a9f] mt-1">
                For active boutique production studios
              </CardDescription>
            </CardHeader>

            <div className="my-6">
              <span className="font-heading text-4xl font-extrabold text-[#f6f3ec]">
                {billing === "monthly" ? "99" : "79"}
              </span>
              <span className="text-sm text-[#9a9a9f]"> AED / month</span>
            </div>

            <CardContent className="p-0">
              <ul className="space-y-3 text-xs text-[#9a9a9f]">
                <li className="flex items-center gap-2 text-[#f6f3ec] font-semibold">
                  <Check className="size-4 text-[#f5551d]" /> Unlimited active
                  client projects
                </li>
                <li className="flex items-center gap-2 text-[#f6f3ec] font-semibold">
                  <Check className="size-4 text-[#f5551d]" /> 4K Ultra-HD
                  video streaming
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> Custom brand logo
                  & colors
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> Custom studio
                  handle/domain
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> Version locking &
                  download protection
                </li>
              </ul>
            </CardContent>
          </div>

          <CardFooter className="p-0 border-none bg-transparent pt-8">
            <Button
              onClick={() => handleSelect("Studio")}
              className="w-full rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-[#160a03] font-bold shadow-lg shadow-[#f5551d]/20 cursor-pointer transition-all hover:-translate-y-0.5"
            >
              Start 7-Day Free Trial
            </Button>
          </CardFooter>
        </Card>

        {/* Tier 3: Agency */}
        <Card className="bg-[#141416] border-white/10 rounded-2xl p-8 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl">
          <div>
            <CardHeader className="p-0">
              <CardTitle className="text-2xl font-bold text-[#f6f3ec]">
                Agency
              </CardTitle>
              <CardDescription className="text-xs text-[#9a9a9f] mt-1">
                For production houses & media agencies
              </CardDescription>
            </CardHeader>

            <div className="my-6">
              <span className="font-heading text-4xl font-extrabold text-[#f6f3ec]">
                {billing === "monthly" ? "199" : "159"}
              </span>
              <span className="text-sm text-[#9a9a9f]"> AED / month</span>
            </div>

            <CardContent className="p-0">
              <ul className="space-y-3 text-xs text-[#9a9a9f]">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> Everything in
                  Studio plan
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> Team collaborator
                  seats
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> High-bandwidth
                  priority allocation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-[#f5551d]" /> Custom client NDA
                  seals
                </li>
              </ul>
            </CardContent>
          </div>

          <CardFooter className="p-0 border-none bg-transparent pt-8">
            <Button
              onClick={() => handleSelect("Agency")}
              variant="outline"
              className="w-full rounded-full border-white/20 text-[#f6f3ec] hover:bg-white/10 cursor-pointer bg-white/[0.04]"
            >
              Start 7-Day Free Trial
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}

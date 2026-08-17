"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Typography,
  TypographyH2,
  TypographyP,
  TypographyKicker,
} from "@/components/ui/typography";

const STEPS = [
  {
    step: "01",
    title: "Upload Your Cut",
    description:
      "Export from Premiere, DaVinci, or Final Cut and drag your MP4 or ProRes export into CineSpace. Automatic Cloudflare 4K streaming setup.",
  },
  {
    step: "02",
    title: "Share Private Link",
    description:
      "Send a private, branded link via WhatsApp or email. Your client opens it instantly on any mobile or desktop browser without registration.",
  },
  {
    step: "03",
    title: "Review & Sign-Off",
    description:
      "Client leaves timecoded comments, approves the cut, and receives high-res download access upon approval lock.",
  },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-20 border-b border-white/[0.08]">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <TypographyKicker className="text-[#f5551d]">
          Simple 3-Step Process
        </TypographyKicker>
        <TypographyH2 className="mt-2 text-[#f6f3ec]">
          From export to final client sign-off in minutes
        </TypographyH2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STEPS.map((item) => (
          <Card
            key={item.step}
            className="bg-[#141416] border-white/10 rounded-2xl p-8 space-y-4 hover:border-white/20 transition-all duration-300 shadow-xl"
          >
            <CardHeader className="p-0 space-y-3">
              <span className="font-heading text-4xl font-extrabold text-[#f5551d]">
                {item.step}
              </span>
              <CardTitle className="text-xl font-bold text-[#f6f3ec]">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TypographyP className="text-sm text-[#9a9a9f] leading-relaxed">
                {item.description}
              </TypographyP>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

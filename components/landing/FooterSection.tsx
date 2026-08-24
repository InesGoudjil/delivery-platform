"use client";

import React from "react";
import Link from "next/link";
import { Typography, TypographySmall } from "@/components/ui/typography";

export function FooterSection() {
  return (
    <footer className="w-full border-t border-white/[0.08] py-10 text-xs text-[#5e5e64]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="font-heading font-black text-sm text-[#f6f3ec] hover:opacity-80 transition-opacity"
          >
            CineSpace<span className="text-[#f5551d]">.</span>
          </Link>
          <TypographySmall
            as="span"
            className="text-xs text-[#5e5e64]"
          >
            © {new Date().getFullYear()} CineSpace Platform. Built for Gulf filmmakers.
          </TypographySmall>
        </div>
        <div className="flex items-center gap-6 text-xs text-[#9a9a9f]">
          <a
            href="#features"
            className="hover:text-[#f6f3ec] transition-colors"
          >
            Features
          </a>
          <a
            href="#workflow"
            className="hover:text-[#f6f3ec] transition-colors"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className="hover:text-[#f6f3ec] transition-colors"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hover:text-[#f6f3ec] transition-colors"
          >
            FAQ
          </a>
        </div>
      </div>
    </footer>
  );
}

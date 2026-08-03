"use client";

import React from "react";
import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="w-full border-t border-white/[0.08] py-10 text-xs text-[#5e5e64]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="disp font-black text-sm text-[#f6f3ec]">
            CUT<span className="text-[#f5551d]">.</span>
          </Link>
          <span>© {new Date().getFullYear()} CUT Platform. Built for Gulf filmmakers.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-[#f6f3ec] transition-colors">Features</a>
          <a href="#pricing" className="hover:text-[#f6f3ec] transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-[#f6f3ec] transition-colors">FAQ</a>
        </div>
      </div>
    </footer>
  );
}

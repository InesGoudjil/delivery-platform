"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderSectionProps {
  onOpenDemo: () => void;
  onStartTrial: () => void;
}

export function HeaderSection({ onOpenDemo, onStartTrial }: HeaderSectionProps) {
  return (
    <header className="w-full">
      {/* Announcement Bar */}
      <div className="bg-[#141416] border-b border-white/10 text-xs py-2 px-4 text-center flex items-center justify-center gap-2">
        <Badge variant="orange" className="flex items-center gap-1 text-[11px] font-semibold py-0.5">
          <Sparkles className="size-3" /> NEW
        </Badge>
        <span className="text-[#9a9a9f]">
          Streamlined 4K Cloudflare streaming & localized AED pricing now live for Gulf Creators.
        </span>
      </div>

      {/* Main Navbar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between py-6 border-b border-white/[0.08]">
          <Link href="/" className="disp text-2xl font-black tracking-tight text-[#f6f3ec] flex items-center gap-1">
            CUT<span className="text-[#f5551d]">.</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9a9a9f]">
            <a href="#features" className="hover:text-[#f6f3ec] transition-colors">
              Features
            </a>
            <a href="#demo" className="hover:text-[#f6f3ec] transition-colors">
              Live Demo
            </a>
            <a href="#workflow" className="hover:text-[#f6f3ec] transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="hover:text-[#f6f3ec] transition-colors">
              Pricing (AED)
            </a>
            <a href="#faq" className="hover:text-[#f6f3ec] transition-colors">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenDemo}
              className="text-xs sm:text-sm font-medium text-[#9a9a9f] hover:text-[#f6f3ec] hover:bg-white/5 hidden sm:inline-flex"
            >
              Test Client Room
            </Button>
            <Button
              onClick={onStartTrial}
              className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-[#160a03] font-semibold px-5 py-2 text-xs sm:text-sm shadow-lg shadow-[#f5551d]/20 transition-all hover:-translate-y-0.5"
            >
              Start Free Trial
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}

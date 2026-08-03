"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderSectionProps {
  onOpenDemo: () => void;
  onStartTrial: () => void;
}

export function HeaderSection({
  onOpenDemo,
  onStartTrial,
}: HeaderSectionProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        scrolled
          ? "translate-y-0 bg-[#0a0a0b]/75 backdrop-blur-xl shadow-lg shadow-black/20"
          : "-translate-y-1 bg-transparent"
      }`}
    >
      {/* Announcement Bar */}
      <div className="flex items-center justify-center gap-2 border-b border-white/10 bg-[#141416] px-4 py-2 text-center text-xs">
        <Badge
          variant="orange"
          className="flex items-center gap-1 py-0.5 text-[11px] font-semibold"
        >
          <Sparkles className="size-3" />
          NEW
        </Badge>

        <span className="text-[#9a9a9f]">
          Streamlined 4K Cloudflare streaming & localized AED pricing now live
          for Gulf Creators.
        </span>
      </div>

      {/* Navbar */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav className="flex items-center justify-between py-6">
          {/* Logo */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex items-center"
          >
            <Image
              src="/images/logo.svg"
              alt="CineSpace"
              width={130}
              height={42}
              priority
            />
          </Link>

          {/* Navigation */}
          <div className="hidden items-center gap-8 text-sm font-medium text-[#9a9a9f] md:flex">
            <a
              href="#features"
              className="transition-colors duration-300 hover:text-[#f6f3ec]"
            >
              Features
            </a>

            <a
              href="#demo"
              className="transition-colors duration-300 hover:text-[#f6f3ec]"
            >
              Live Demo
            </a>

            <a
              href="#workflow"
              className="transition-colors duration-300 hover:text-[#f6f3ec]"
            >
              How it Works
            </a>

            <a
              href="#pricing"
              className="transition-colors duration-300 hover:text-[#f6f3ec]"
            >
              Pricing (AED)
            </a>

            <a
              href="#faq"
              className="transition-colors duration-300 hover:text-[#f6f3ec]"
            >
              FAQ
            </a>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenDemo}
              className="hidden text-xs cursor-pointer font-medium text-[#9a9a9f] transition-colors hover:bg-white/5 hover:text-[#f6f3ec] sm:inline-flex sm:text-sm"
            >
              Test Client Room
            </Button>

            <Button
              onClick={onStartTrial}
              className="rounded-full cursor-pointer bg-[#f5551d] px-5 py-2 text-xs font-semibold text-[#160a03] shadow-lg shadow-[#f5551d]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ff8a45] sm:text-sm"
            >
              Start Free Trial
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}

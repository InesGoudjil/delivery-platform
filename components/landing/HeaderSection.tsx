"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserNavMenu, type UserNavMenuProps } from "@/components/landing/UserNavMenu";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useTranslation } from "@/i18n";

interface HeaderSectionProps {
  user?: UserNavMenuProps["user"] | null;
  workspace?: UserNavMenuProps["workspace"] | null;
  onOpenDemo?: () => void;
  onStartTrial?: () => void;
}

export function HeaderSection({
  user,
  workspace,
  onOpenDemo,
  onStartTrial,
}: HeaderSectionProps) {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-[#070709]/90 backdrop-blur-md border-b border-white/10 shadow-2xl py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex items-center gap-1 text-2xl font-black tracking-tight text-white transition-opacity hover:opacity-90 font-display"
          >
            <span>Cine</span>
            <span className="text-[#f5551d]">Space</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden items-center gap-8 text-sm font-medium text-[#aeaeb4] md:flex">
            <Link
              href="/#features"
              className="transition-colors duration-200 hover:text-white"
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className="transition-colors duration-200 hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/#partnership"
              className="transition-colors duration-200 hover:text-white"
            >
              Partnership
            </Link>
            <Link
              href="/contact"
              className="transition-colors duration-200 hover:text-white"
            >
              Contact
            </Link>
            {!user && (
              <Link
                href="/login"
                className="transition-colors duration-200 hover:text-white"
              >
                Login
              </Link>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ModeToggle />

            {user ? (
              <UserNavMenu user={user} workspace={workspace} />
            ) : (
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-r from-[#f5551d] to-[#e0430e] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-[#f5551d]/30 transition-all duration-200 hover:shadow-[#f5551d]/50 hover:scale-[1.03] active:scale-[0.98]"
              >
                GET STARTED
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

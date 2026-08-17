"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  const { t, dict } = useTranslation();

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

  const dashboardUrl = workspace?.slug ? `/${workspace.slug}` : "/login";

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        scrolled
          ? "translate-y-0 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/10 dark:shadow-black/30 border-b border-border"
          : "-translate-y-1 bg-transparent"
      }`}
    >
      {/* Navbar */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav className="flex items-center justify-between py-4 sm:py-5">
          {/* Logo */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex items-center group transition-transform duration-200 hover:scale-[1.02]"
          >
            <Image
              src="/images/logo.svg"
              alt="CineSpace"
              width={130}
              height={42}
              priority
            />
          </Link>

          {/* Navigation Links */}
          <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a
              href="#features"
              className="transition-colors duration-300 hover:text-foreground"
            >
              {dict.nav.portfolio || "Features"}
            </a>
            <a
              href="#workflow"
              className="transition-colors duration-300 hover:text-foreground"
            >
              {dict.landing.workflowTitle || "How It Works"}
            </a>
            <a
              href="#pricing"
              className="transition-colors duration-300 hover:text-foreground"
            >
              {dict.nav.subscription || "Pricing (AED)"}
            </a>
            <a
              href="#faq"
              className="transition-colors duration-300 hover:text-foreground"
            >
              {dict.landing.faqTitle || "FAQ"}
            </a>
          </div>

          {/* Action Buttons / User Menu / Theme Toggle / Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <LanguageToggle />
            <ModeToggle />

            {user ? (
              // Authenticated User State
              <div className="flex items-center gap-3">
                <UserNavMenu user={user} workspace={workspace} />
              </div>
            ) : (
              // Guest / Unauthenticated State
              <div className="flex items-center gap-2 sm:gap-3">
                {onOpenDemo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenDemo}
                    className="hidden text-xs cursor-pointer font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex sm:text-sm rounded-full"
                  >
                    {dict.landing.testClientRoom || "Test Client Room"}
                  </Button>
                )}

                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-full"
                >
                  <Link href="/login">{dict.common.signIn || "Sign In"}</Link>
                </Button>

                <Button
                  asChild
                  className="rounded-full cursor-pointer bg-[#f5551d] px-5 py-2 text-xs font-semibold text-[#160a03] shadow-lg shadow-[#f5551d]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ff8a45] sm:text-sm"
                >
                  <Link href="/signup">
                    {dict.common.getStarted || "Get Started"} <ArrowRight className="size-3.5 ml-1 inline rtl:rotate-180" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

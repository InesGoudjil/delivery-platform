"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { UserNavMenu, type UserNavMenuProps } from "@/components/landing/UserNavMenu";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Section spy
      const sections = ["features", "pricing", "silo", "partnership", "faq"];
      const scrollPos = window.scrollY + 120;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      if (window.scrollY < 300) {
        setActiveSection("");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll handler for anchor navigation
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/") {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          window.history.pushState(null, "", `/#${targetId}`);
        }
      }
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsMobileMenuOpen(false);
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
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          {/* Brand Logo */}
          <BrandLogo
            href="/"
            size="lg"
            onClick={handleLogoClick}
          />

          {/* Desktop Navigation Links with Smooth Anchor Scrolling */}
          <div className="hidden items-center gap-8 text-sm font-medium text-[#aeaeb4] md:flex">
            <Link
              href="/#features"
              onClick={(e) => handleAnchorClick(e, "features")}
              className={`transition-colors duration-200 hover:text-white ${
                activeSection === "features" ? "text-white font-bold" : ""
              }`}
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              onClick={(e) => handleAnchorClick(e, "pricing")}
              className={`transition-colors duration-200 hover:text-white ${
                activeSection === "pricing" ? "text-white font-bold" : ""
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/#partnership"
              onClick={(e) => handleAnchorClick(e, "partnership")}
              className={`transition-colors duration-200 hover:text-white ${
                activeSection === "partnership" ? "text-white font-bold" : ""
              }`}
            >
              Partnership
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
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

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <UserNavMenu user={user} workspace={workspace} />
            ) : (
              <Button
                asChild
                className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 h-auto text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/30 transition-all duration-200 hover:bg-primary/90 hover:shadow-primary/50 hover:scale-[1.03] active:scale-[0.98]"
              >
                <Link href="/signup">
                  GET STARTED
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 md:hidden">
            {user && <UserNavMenu user={user} workspace={workspace} />}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="size-9 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </nav>
      </div>

      {/* Mobile Animated Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#070709]/95 backdrop-blur-xl px-4 py-6 shadow-2xl animate-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col space-y-4 text-sm font-medium text-[#aeaeb4]">
            <Link
              href="/#features"
              onClick={(e) => handleAnchorClick(e, "features")}
              className={`py-2 px-3 rounded-lg hover:bg-white/5 transition-colors ${
                activeSection === "features" ? "text-white font-bold bg-white/5" : "hover:text-white"
              }`}
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              onClick={(e) => handleAnchorClick(e, "pricing")}
              className={`py-2 px-3 rounded-lg hover:bg-white/5 transition-colors ${
                activeSection === "pricing" ? "text-white font-bold bg-white/5" : "hover:text-white"
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/#partnership"
              onClick={(e) => handleAnchorClick(e, "partnership")}
              className={`py-2 px-3 rounded-lg hover:bg-white/5 transition-colors ${
                activeSection === "partnership" ? "text-white font-bold bg-white/5" : "hover:text-white"
              }`}
            >
              Partnership
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
            >
              Contact
            </Link>
            {!user ? (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <div className="pt-2">
                  <Button
                    asChild
                    className="w-full rounded-full bg-primary text-primary-foreground py-3 h-auto text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/30"
                  >
                    <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                      GET STARTED <ArrowRight className="size-3.5 ml-1 inline-block" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="pt-2">
                <Button
                  asChild
                  className="w-full rounded-full bg-primary text-primary-foreground py-3 h-auto text-xs font-bold uppercase tracking-wider"
                >
                  <Link
                    href={workspace ? `/${workspace.slug}/deliveries` : "/new-workspace"}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Go To Workspace
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

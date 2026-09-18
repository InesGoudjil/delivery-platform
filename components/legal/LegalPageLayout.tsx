import React from "react";
import { HeaderSection } from "@/components/landing/HeaderSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { AmbientBackground } from "@/components/ui/ambient-background";
import type { UserNavMenuProps } from "@/components/landing/UserNavMenu";

export interface LegalSection {
  title: string;
  content: React.ReactNode;
}

export interface LegalPageLayoutProps {
  badge: string;
  title: string;
  lastUpdated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  user?: UserNavMenuProps["user"] | null;
  workspace?: UserNavMenuProps["workspace"] | null;
}

export function LegalPageLayout({
  badge,
  title,
  lastUpdated,
  intro,
  sections,
  user,
  workspace,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#070709] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-white flex flex-col justify-between relative">
      <AmbientBackground variant="hero" />

      <div className="relative z-10">
        <HeaderSection user={user} workspace={workspace} />

        <main className="mx-auto max-w-4xl px-4 sm:px-8 py-16 sm:py-24 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block px-3.5 py-1 rounded-full border border-[#f5551d]/60 bg-[#f5551d]/10 text-[10px] sm:text-[11px] font-bold tracking-widest text-[#f5551d] uppercase">
              {badge}
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-display uppercase">
              {title}
            </h1>
            <p className="text-xs text-[#71717a] font-mono tracking-wider pt-1">
              {lastUpdated}
            </p>
          </div>

          {/* Document Content Card */}
          <div className="rounded-2xl bg-[#0c0c10]/90 border border-white/10 p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-8 text-left">
            <div className="text-xs sm:text-[13px] text-[#a1a1aa] leading-relaxed">
              {intro}
            </div>

            <div className="space-y-6 pt-2">
              {sections.map((section, idx) => (
                <section key={idx} className="space-y-2">
                  <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                    {section.title}
                  </h2>
                  <div className="text-xs sm:text-[13px] text-[#8e8e98] leading-relaxed">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>

      <FooterSection />
    </div>
  );
}

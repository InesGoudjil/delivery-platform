"use client";

import { BrandLogo } from "@/components/ui/brand-logo";
import { TypographySpan } from "@/components/ui/typography";

export function DeliveryRoomFooter() {
  return (
    <footer className="border-t border-white/10 mt-16 sm:mt-24 py-8 flex items-center justify-between text-xs text-[#aeaeb4]">
      <div className="flex items-center gap-2">
        <BrandLogo
          size="sm"
          href={null}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="cursor-pointer"
        />
      </div>
      <TypographySpan className="text-white/40 hover:text-white/70 transition-colors">
        cinespace.pro
      </TypographySpan>
    </footer>
  );
}

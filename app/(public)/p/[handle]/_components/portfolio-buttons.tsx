"use client";

import React, { useState } from "react";
import { Share2, Check, MessageCircle } from "lucide-react";
import { usePortfolioModal } from "./portfolio-context";
import { Button } from "@/components/ui/button";
import { TypographySpan } from "@/components/ui/typography";

interface ContactButtonProps {
  label?: string;
  className?: string;
  icon?: boolean;
}

export function ContactButton({
  label = "Get In Touch",
  className = "px-6 py-2.5 min-h-[38px] rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs font-extrabold tracking-wider uppercase transition-all shadow-lg hover:shadow-primary/25 cursor-pointer h-auto touch-manipulation",
  icon = false,
}: ContactButtonProps) {
  const { setIsContactOpen } = usePortfolioModal();

  return (
    <Button
      type="button"
      onClick={() => setIsContactOpen(true)}
      className={className}
    >
      {icon && <MessageCircle className="size-4 mr-2 inline-block" />}
      <TypographySpan>{label}</TypographySpan>
    </Button>
  );
}

interface ShareButtonProps {
  className?: string;
}

export function ShareButton({
  className = "inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 min-h-[38px] rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer h-auto active:scale-95 touch-manipulation",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof window === "undefined") return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleShare}
      className={className}
      title="Share portfolio link"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-emerald-400 shrink-0" />
          <TypographySpan className="text-emerald-400 hidden sm:inline">Copied!</TypographySpan>
        </>
      ) : (
        <>
          <Share2 className="size-3.5 text-zinc-400 shrink-0" />
          <TypographySpan className="hidden sm:inline">Share</TypographySpan>
        </>
      )}
    </Button>
  );
}

interface HeroPreviewTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function HeroPreviewTrigger({ children, className = "" }: HeroPreviewTriggerProps) {
  const { openPrimaryFeatured } = usePortfolioModal();

  return (
    <div onClick={openPrimaryFeatured} className={className}>
      {children}
    </div>
  );
}

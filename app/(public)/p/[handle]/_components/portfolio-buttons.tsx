"use client";

import React, { useState } from "react";
import { Share2, Check, MessageCircle } from "lucide-react";
import { usePortfolioModal } from "./portfolio-context";
import { Button } from "@/components/ui/button";

interface ContactButtonProps {
  label?: string;
  className?: string;
  icon?: boolean;
}

export function ContactButton({
  label = "Get In Touch",
  className = "px-6 py-2.5 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs font-extrabold tracking-wider uppercase transition-all shadow-lg hover:shadow-primary/25 cursor-pointer h-auto",
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
      <span>{label}</span>
    </Button>
  );
}

interface ShareButtonProps {
  className?: string;
}

export function ShareButton({
  className = "hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer h-auto",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          <Check className="size-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="size-3.5 text-zinc-400" />
          <span>Share</span>
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

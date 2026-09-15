"use client";

import React, { useState } from "react";
import { Share2, Check, MessageCircle } from "lucide-react";
import { usePortfolioModal } from "./portfolio-context";

interface ContactButtonProps {
  label?: string;
  className?: string;
  icon?: boolean;
}

export function ContactButton({
  label = "Get In Touch",
  className = "px-6 py-2.5 rounded-full bg-[#c85332] hover:bg-[#d95d3a] active:scale-95 text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-lg hover:shadow-[#c85332]/25 cursor-pointer",
  icon = false,
}: ContactButtonProps) {
  const { setIsContactOpen } = usePortfolioModal();

  return (
    <button
      type="button"
      onClick={() => setIsContactOpen(true)}
      className={className}
    >
      {icon && <MessageCircle className="size-4 mr-2 inline-block" />}
      <span>{label}</span>
    </button>
  );
}

interface ShareButtonProps {
  className?: string;
}

export function ShareButton({
  className = "hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer",
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
    <button
      type="button"
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
    </button>
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

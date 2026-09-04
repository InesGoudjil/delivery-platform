"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  Lock,
  Download,
  MessageCircle,
  ArrowRight,
  Copy,
  ExternalLink,
} from "lucide-react";
import { DeliveryProjectItem } from "../deliveries-client";

interface DeliveryCardGridProps {
  workspaceSlug: string;
  deliveries: DeliveryProjectItem[];
}

export function DeliveryCardGrid({
  workspaceSlug,
  deliveries,
}: DeliveryCardGridProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (token: string, id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/deliver/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: DeliveryProjectItem["status"]) => {
    switch (status) {
      case "in_review":
      case "draft":
        return (
          <span className="glass-badge font-mono text-[11px] bg-[#f5551d]/15 text-[#ff8a45] border-[#f5551d]/30 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#f5551d] animate-pulse" />
            In Review
          </span>
        );
      case "approved":
        return (
          <span className="glass-badge font-mono text-[11px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
            <Check className="size-3" />
            Approved
          </span>
        );
      case "archived":
        return (
          <span className="glass-badge font-mono text-[11px] bg-zinc-500/15 text-zinc-400 border-zinc-500/30">
            Archived
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {deliveries.map((item) => {
        const isCopied = copiedId === item.id;
        const shareUrl = `/deliver/${item.shareToken}`;

        return (
          <div
            key={item.id}
            className="liquid-glass rounded-2xl p-6 border border-white/10 hover:border-[#f5551d]/40 transition-all duration-300 flex flex-col justify-between group shadow-xl"
          >
            <div className="space-y-4">
              {/* Status + Version Header */}
              <div className="flex items-center justify-between gap-2">
                {getStatusBadge(item.status)}
                <span className="text-[11px] font-mono text-[#f6f3ec] bg-black/50 px-2.5 py-0.5 rounded-full border border-white/10">
                  {item.version}
                </span>
              </div>

              {/* Title & Client */}
              <Link href={`/${workspaceSlug}/deliveries/${item.id}`} className="block group">
                <h3 className="font-display text-xl font-bold text-[#f6f3ec] group-hover:text-[#ff8a45] transition-colors flex items-center justify-between">
                  <span>{item.title}</span>
                  <ArrowRight className="size-4 text-[#aeaeb4] group-hover:text-[#f5551d] opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                </h3>
              </Link>
              <p className="text-xs text-[#aeaeb4] font-sans">
                Client: <strong className="text-[#f6f3ec]">{item.clientName}</strong>
              </p>

              {/* Specs / Badges */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#aeaeb4] font-mono pt-1">
                <span className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
                  <Clock className="size-3 text-[#f5551d]" /> {item.duration}
                </span>
                {item.passcodeProtected && (
                  <span className="flex items-center gap-1 bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-md">
                    <Lock className="size-3" /> Password Gate
                  </span>
                )}
                {item.downloadsAllowed ? (
                  <span className="flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                    <Download className="size-3" /> Downloads On
                  </span>
                ) : (
                  <span className="flex items-center gap-1 bg-black/40 text-[#aeaeb4] px-2.5 py-1 rounded-md border border-white/5">
                    Stream Only
                  </span>
                )}
                {item.commentsCount > 0 && (
                  <span className="flex items-center gap-1 bg-[#f5551d]/15 text-[#ff8a45] border border-[#f5551d]/30 px-2.5 py-1 rounded-md">
                    <MessageCircle className="size-3" /> {item.commentsCount} notes
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 mt-6 border-t border-white/10 flex items-center justify-between gap-2">
              <Link
                href={`/${workspaceSlug}/deliveries/${item.id}`}
                className="text-xs font-semibold text-[#f5551d] hover:underline flex items-center gap-1 font-mono"
              >
                Manage Cut <ArrowRight className="size-3" />
              </Link>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyLink(item.shareToken, item.id)}
                  className="glass-btn-ghost btn-glass-layer cursor-pointer text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  {isCopied ? (
                    <>
                      <Check className="size-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-[#aeaeb4]" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hi ${item.clientName}, your review cut for ${item.title} is ready: ${typeof window !== "undefined" ? window.location.origin : ""}/deliver/${item.shareToken}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="glass-btn-ghost btn-glass-layer cursor-pointer p-2 text-xs text-[#86b98f]"
                  title="Send via WhatsApp"
                >
                  <MessageCircle className="size-4" />
                </a>

                <Link
                  href={shareUrl}
                  target="_blank"
                  className="glass-btn-ghost btn-glass-layer cursor-pointer p-2 text-xs text-[#f6f3ec]"
                  title="Open Live Review Room"
                >
                  <ExternalLink className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

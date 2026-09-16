"use client";

import Link from "next/link";
import {
  Share2,
  MessageCircle,
  Pencil,
  Lock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeliveryHeroBannerProps {
  coverThumbnailUrl: string;
  projectTitle: string;
  projectStatus: string;
  totalAssetsCount: number;
  approvedCount: number;
  shareUrl: string;
  clientName: string;
  onOpenShareDialog: () => void;
  onOpenEditDialog: () => void;
  onArchive: () => void;
  onOpenPublishDialog: () => void;
}

export function DeliveryHeroBanner({
  coverThumbnailUrl,
  projectTitle,
  projectStatus,
  totalAssetsCount,
  approvedCount,
  shareUrl,
  clientName,
  onOpenShareDialog,
  onOpenEditDialog,
  onArchive,
  onOpenPublishDialog,
}: DeliveryHeroBannerProps) {
  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-card">
      {/* Dark Hero Image Background with Gradient Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity scale-105"
        style={{
          backgroundImage: `url('${coverThumbnailUrl}')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/90 via-[#0a0a0c]/60 to-transparent" />

      {/* Hero Content Overlay */}
      <div className="relative z-10 p-6 sm:p-10 md:p-12 space-y-8">
        <div className="space-y-3 max-w-3xl">
          {/* Status Category Prefix */}
          <div className="flex items-center gap-2 text-xs font-bold text-[#f5551d] tracking-wide uppercase">
            <span className="size-2 rounded-full bg-[#f5551d] animate-pulse" />
            <span>Editing · {projectTitle}</span>
          </div>

          {/* Giant Uppercase Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-heading tracking-tight text-white uppercase drop-shadow-md">
            {projectTitle}
          </h1>
        </div>

        {/* Stats Bar (STATUS, ASSETS, CLIENT APPROVED) */}
        <div className="flex flex-wrap items-center gap-8 pt-2 border-t border-white/10">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              STATUS
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="size-2 rounded-full bg-[#f5551d]" />
              <span className="text-xs font-extrabold uppercase text-white tracking-wider">
                {projectStatus === "approved" ? "APPROVED" : "DRAFT"}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              ASSETS
            </span>
            <span className="text-base font-extrabold text-white mt-0.5 block">
              {totalAssetsCount}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              CLIENT APPROVED
            </span>
            <span className="text-base font-extrabold text-[#f5551d] mt-0.5 block">
              {approvedCount}/{totalAssetsCount}
            </span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          {/* SHARE A LINK Button -> Opens Share Dialog */}
          <Button
            onClick={onOpenShareDialog}
            className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs px-5 py-2.5 shadow-lg shadow-[#f5551d]/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Share2 className="size-3.5" />
            <span>SHARE A LINK</span>
          </Button>

          {/* SEND TO CLIENT Button */}
          <Button
            asChild
            variant="outline"
            className="rounded-full border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10 text-white font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer flex items-center gap-2"
          >
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hi ${clientName}, your review cut for ${projectTitle} is ready: ${
                  typeof window !== "undefined" ? window.location.origin : ""
                }${shareUrl}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-3.5 text-emerald-400" />
              <span>SEND TO CLIENT</span>
            </a>
          </Button>

          {/* EDIT DELIVERY Button -> Opens Edit Delivery Dialog */}
          <Button
            onClick={onOpenEditDialog}
            variant="outline"
            className="rounded-full border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10 text-white font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer flex items-center gap-2"
          >
            <Pencil className="size-3.5" />
            <span>EDIT DELIVERY</span>
          </Button>

          {/* ARCHIVE TO THE SILO Button */}
          <Button
            onClick={onArchive}
            variant="outline"
            className="rounded-full border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10 text-white font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer flex items-center gap-2"
          >
            <Lock className="size-3.5 text-muted-foreground" />
            <span>ARCHIVE TO THE SILO</span>
          </Button>

          {/* PUBLISH TO PORTFOLIO Button */}
          <Button
            onClick={onOpenPublishDialog}
            variant="outline"
            className="rounded-full border-[#f5551d]/40 bg-[#f5551d]/10 hover:bg-[#f5551d]/20 text-[#ff8a45] font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="size-3.5" />
            <span>PUBLISH TO PORTFOLIO</span>
          </Button>

          {/* Preview Room Link Icon */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-full bg-white/10 hover:bg-white/20 text-white size-9 ml-auto"
            title="Open Public Client Room"
          >
            <Link href={shareUrl} target="_blank">
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <Card className="relative rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-card hover:translate-y-0 hover:shadow-2xl">
      {/* Dark Hero Image Background with Gradient Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity scale-105"
        style={{
          backgroundImage: `url('${coverThumbnailUrl}')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent" />

      {/* Hero Content Overlay */}
      <CardContent className="relative z-10 p-6 sm:p-10 md:p-12 space-y-8">
        <div className="space-y-3 max-w-3xl">
          {/* Status Category Prefix */}
          <div className="flex items-center gap-2 text-xs font-bold text-primary tracking-wide uppercase">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span>Editing · {projectTitle}</span>
          </div>

          {/* Giant Uppercase Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-heading tracking-tight text-white uppercase drop-shadow-md">
            {projectTitle}
          </h1>
        </div>

        {/* Stats Bar (STATUS, ASSETS, CLIENT APPROVED) */}
        <div className="flex flex-wrap items-center gap-8 pt-2 border-t border-border/40">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              STATUS
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge
                variant={projectStatus === "approved" ? "sage" : "orange"}
                className="font-mono text-xs uppercase tracking-wider font-extrabold"
              >
                {projectStatus === "approved" ? "APPROVED" : "DRAFT"}
              </Badge>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              ASSETS
            </span>
            <span className="text-base font-extrabold text-foreground mt-0.5 block">
              {totalAssetsCount}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              CLIENT APPROVED
            </span>
            <span className="text-base font-extrabold text-primary mt-0.5 block">
              {approvedCount}/{totalAssetsCount}
            </span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          {/* SHARE A LINK Button -> Opens Share Dialog */}
          <Button
            onClick={onOpenShareDialog}
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-5 py-2.5 shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Share2 className="size-3.5" />
            <span>SHARE A LINK</span>
          </Button>

          {/* SEND TO CLIENT Button */}
          <Button
            asChild
            variant="outline"
            className="rounded-full border-border/60 bg-background/50 backdrop-blur-md hover:bg-muted text-foreground font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer flex items-center gap-2"
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
            className="rounded-full border-border/60 bg-background/50 backdrop-blur-md hover:bg-muted text-foreground font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer flex items-center gap-2"
          >
            <Pencil className="size-3.5" />
            <span>EDIT DELIVERY</span>
          </Button>

          {/* ARCHIVE TO THE SILO Button */}
          <Button
            onClick={onArchive}
            variant="outline"
            className="rounded-full border-border/60 bg-background/50 backdrop-blur-md hover:bg-muted text-foreground font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer flex items-center gap-2"
          >
            <Lock className="size-3.5 text-muted-foreground" />
            <span>ARCHIVE TO THE SILO</span>
          </Button>

          {/* PUBLISH TO PORTFOLIO Button */}
          <Button
            onClick={onOpenPublishDialog}
            variant="outline"
            className="rounded-full border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="size-3.5" />
            <span>PUBLISH TO PORTFOLIO</span>
          </Button>

          {/* Preview Room Link Icon */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-full bg-muted/50 hover:bg-muted text-foreground size-9 ml-auto"
            title="Open Public Client Room"
          >
            <Link href={shareUrl} target="_blank">
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

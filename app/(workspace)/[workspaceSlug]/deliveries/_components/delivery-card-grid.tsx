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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeliveryProjectItem } from "../deliveries-client";

interface DeliveryCardGridProps {
  items?: DeliveryProjectItem[];
  deliveries?: DeliveryProjectItem[];
  workspaceSlug: string;
  canSendWhatsApp?: boolean;
}

export function DeliveryCardGrid({
  items,
  deliveries,
  workspaceSlug,
  canSendWhatsApp = true,
}: DeliveryCardGridProps) {
  const displayDeliveries = deliveries || items || [];
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
          <Badge variant="orange" className="font-mono text-[11px] flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#f5551d] animate-pulse" />
            In Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="sage" className="font-mono text-[11px] flex items-center gap-1">
            <Check className="size-3" />
            Approved
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="font-mono text-[11px] text-zinc-400 border-zinc-500/30">
            Archived
          </Badge>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {displayDeliveries.map((item) => {
        const isCopied = copiedId === item.id;
        const shareUrl = `/deliver/${item.shareToken}`;

        return (
          <Card
            key={item.id}
            className="rounded-2xl border border-border justify-between group shadow-sm transition-all duration-300"
          >
            <div>
              {/* Status + Version Header using CardHeader and CardAction */}
              <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
                {getStatusBadge(item.status)}
                <CardAction>
                  <Badge variant="outline" className="text-[11px] font-mono text-foreground bg-muted px-2.5 py-0.5 rounded-full border-border">
                    {item.version}
                  </Badge>
                </CardAction>
              </CardHeader>

              {/* Title, Client & Specs inside CardContent */}
              <CardContent className="space-y-3 pt-1">
                {/* Title & Client */}
                <Link href={`/${workspaceSlug}/deliveries/${item.id}`} className="block group/link">
                  <CardTitle className="font-display text-xl font-bold text-card-foreground group-hover/link:text-primary transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover/link:text-primary opacity-0 group-hover/link:opacity-100 transition-all transform group-hover/link:translate-x-1" />
                  </CardTitle>
                </Link>
                <CardDescription className="text-xs text-muted-foreground font-sans">
                  Client: <strong className="text-foreground">{item.clientName}</strong>
                </CardDescription>

                {/* Specs / Badges */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono pt-1">
                  <Badge variant="outline" className="flex items-center gap-1 bg-muted/50 text-foreground px-2.5 py-1 rounded-md border-border font-normal">
                    <Clock className="size-3 text-[#f5551d]" /> {item.duration}
                  </Badge>
                  {item.passcodeProtected && (
                    <Badge variant="outline" className="flex items-center gap-1 bg-blue-500/15 text-blue-500 border-blue-500/30 px-2.5 py-1 rounded-md font-normal">
                      <Lock className="size-3" /> Password Gate
                    </Badge>
                  )}
                  {item.downloadsAllowed ? (
                    <Badge variant="outline" className="flex items-center gap-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/30 px-2.5 py-1 rounded-md font-normal">
                      <Download className="size-3" /> Downloads On
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-md border-border font-normal">
                      Stream Only
                    </Badge>
                  )}
                  {item.commentsCount > 0 && (
                    <Badge variant="orange" className="flex items-center gap-1 px-2.5 py-1 rounded-md font-normal">
                      <MessageCircle className="size-3" /> {item.commentsCount} notes
                    </Badge>
                  )}
                </div>
              </CardContent>
            </div>

            {/* Bottom Actions using CardFooter */}
            <CardFooter className="pt-4 mt-6 border-t border-border flex items-center justify-between gap-2">
              <Button
                variant="link"
                size="sm"
                asChild
                className="p-0 h-auto text-xs font-semibold text-primary hover:underline font-mono"
              >
                <Link href={`/${workspaceSlug}/deliveries/${item.id}`} className="flex items-center gap-1">
                  Manage Cut <ArrowRight className="size-3 ml-0.5" />
                </Link>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(item.shareToken, item.id)}
                  className="rounded-xl border-border bg-muted/40 hover:bg-muted text-foreground cursor-pointer text-xs px-3 h-8 flex items-center gap-1.5 transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-muted-foreground" />
                      <span>Copy Link</span>
                    </>
                  )}
                </Button>

                {canSendWhatsApp && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    asChild
                    className="rounded-xl border-border bg-muted/40 hover:bg-muted text-emerald-500 hover:text-emerald-400 size-8 transition-colors"
                  >
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hi ${item.clientName}, your review cut for ${item.title} is ready: ${typeof window !== "undefined" ? window.location.origin : ""}/deliver/${item.shareToken}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Send via WhatsApp"
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="icon-sm"
                  asChild
                  className="rounded-xl border-border bg-muted/40 hover:bg-muted text-foreground size-8 transition-colors"
                >
                  <Link
                    href={shareUrl}
                    target="_blank"
                    title="Open Live Review Room"
                  >
                    <ExternalLink className="size-4" />
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

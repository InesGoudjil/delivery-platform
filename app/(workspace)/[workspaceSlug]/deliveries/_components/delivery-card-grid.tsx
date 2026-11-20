"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
  CircleCheck,
  Clock,
  Lock,
  Download,
  Eye,
  EyeOff,
  MessageCircle,
  ArrowRight,
  Copy,
  ExternalLink,
  Trash2,
  Loader2,
  Layers,
  Film,
  SearchX,
  Upload,
  type LucideIcon,
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
import { TypographyH3, TypographyMuted, TypographySpan } from "@/components/ui/typography";
import { toast } from "sonner";
import {
  describeActivity,
  type DeliveryActivityKind,
  type DeliveryProjectItem,
} from "@/lib/deliveries/list-view";

const ACTIVITY_ICONS: Record<DeliveryActivityKind, LucideIcon> = {
  archived: Archive,
  notes: MessageCircle,
  approved: CircleCheck,
  downloaded: Download,
  opened: Eye,
  empty: Upload,
  unopened: EyeOff,
  created: Clock,
};

/** What an empty list says, when rooms exist but none is shown. */
export interface DeliveryGridEmptyState {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

interface DeliveryCardGridProps {
  deliveries: DeliveryProjectItem[];
  workspaceSlug: string;
  /** Relative times count from here (the server's render time, so both sides agree). */
  now: number;
  canSendWhatsApp?: boolean;
  deletingId?: string | null;
  onDeleteDelivery?: (item: DeliveryProjectItem) => void;
  /** Shown instead of the first-room invitation when filters hide every room. */
  empty?: DeliveryGridEmptyState;
  /** Client names become a filter: only that client's rooms (again: every client). */
  activeClientId?: string | null;
  onClientFilter?: (clientId: string) => void;
}

export function DeliveryCardGrid({
  deliveries,
  workspaceSlug,
  now,
  canSendWhatsApp = true,
  deletingId = null,
  onDeleteDelivery,
  empty,
  activeClientId = null,
  onClientFilter,
}: DeliveryCardGridProps) {
  const displayDeliveries = deliveries;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (token: string, id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/deliver/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Review link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsAppShare = (item: DeliveryProjectItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/deliver/${item.shareToken}`;
    const message = `Hi ${item.clientName}, your review cut for ${item.title} is ready: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const getStatusBadge = (status: DeliveryProjectItem["status"]) => {
    switch (status) {
      case "in_review":
      case "draft":
        return (
          <Badge variant="orange" className=" text-[11px] flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            In Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="sage" className=" text-[11px] flex items-center gap-1">
            <Check className="size-3" />
            Approved
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className=" text-[11px] text-zinc-400 border-zinc-500/30">
            Archived
          </Badge>
        );
    }
  };

  if (displayDeliveries.length === 0) {
    const EmptyIcon = empty ? SearchX : Film;
    return (
      <Card className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center shadow-none">
        <div className="size-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
          <EmptyIcon className="size-6 text-muted-foreground/60" />
        </div>
        <TypographyH3 className="text-base font-bold font-heading text-foreground">
          {empty ? empty.title : "No delivery rooms found"}
        </TypographyH3>
        <TypographyMuted className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
          {empty
            ? empty.description
            : "Get started by creating your first client delivery room using the 'New Delivery Room' button above."}
        </TypographyMuted>
        {empty?.action && (
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={empty.action.onClick}
              className="rounded-full text-xs cursor-pointer"
            >
              {empty.action.label}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displayDeliveries.map((item) => {
        const isCopied = copiedId === item.id;
        const isDeleting = deletingId === item.id;
        const assetsCount = item.assetsCount ?? 0;
        const shareUrl = `/deliver/${item.shareToken}`;
        const activity = describeActivity(item, now);
        const ActivityIcon = ACTIVITY_ICONS[activity.kind];
        const clientId = item.clientId;
        const clientFiltered = clientId !== null && clientId === activeClientId;

        return (
          <Card
            key={item.id}
            className="rounded-2xl border border-border justify-between group shadow-sm transition-all duration-300"
          >
            <div>
              {/* Status + Version Header using CardHeader and CardAction */}
              <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
                {getStatusBadge(item.status)}
                {/*<CardAction>
                  <Badge variant="outline" className="text-[11px]  text-foreground bg-muted px-2.5 py-0.5 rounded-full border-border">
                    {item.version}
                  </Badge>
                </CardAction>*/}
              </CardHeader>

              {/* Title, Client & Specs inside CardContent */}
              <CardContent className="space-y-3 pt-1">
                {/* Title & Client */}
                <Link href={`/${workspaceSlug}/deliveries/${item.id}`} className="block group/link">
                  <CardTitle className="p-0 border-none">
                    <TypographyH3 className="text-xl font-bold font-heading text-card-foreground group-hover/link:text-primary transition-colors flex items-center justify-between">
                      <TypographySpan>{item.title}</TypographySpan>
                      <ArrowRight className="size-4 text-muted-foreground group-hover/link:text-primary opacity-0 group-hover/link:opacity-100 transition-all transform group-hover/link:translate-x-1" />
                    </TypographyH3>
                  </CardTitle>
                </Link>
                <TypographyMuted className="text-xs text-muted-foreground font-sans">
                  Client:{" "}
                  {clientId && onClientFilter ? (
                    <button
                      type="button"
                      onClick={() => onClientFilter(clientId)}
                      aria-pressed={clientFiltered}
                      title={clientFiltered ? "Show every client" : `Show only rooms for ${item.clientName}`}
                      className="font-bold text-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 hover:text-primary hover:decoration-primary transition-colors cursor-pointer"
                    >
                      {item.clientName}
                    </button>
                  ) : (
                    <strong className="text-foreground">{item.clientName}</strong>
                  )}
                </TypographyMuted>

                {/* Specs / Badges */}
                <div className="flex flex-wrap items-center gap-2 text-[11px]  pt-1">
                  <Badge variant="outline" className="flex items-center gap-1 bg-muted/50 text-foreground px-2.5 py-1 rounded-md border-border font-normal">
                    <Layers className="size-3 text-primary" />
                    {assetsCount === 0
                      ? "Empty (0 assets)"
                      : `${assetsCount} ${assetsCount === 1 ? "asset" : "assets"}`}
                  </Badge>
                  {/*<Badge variant="outline" className="flex items-center gap-1 bg-muted/50 text-foreground px-2.5 py-1 rounded-md border-border font-normal">
                    <Clock className="size-3 text-primary" /> {item.duration}
                  </Badge>*/}
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
                  {item.openNotesCount > 0 && (
                    <Badge variant="orange" className="flex items-center gap-1 px-2.5 py-1 rounded-md font-normal">
                      <MessageCircle className="size-3" /> {item.openNotesCount} open{" "}
                      {item.openNotesCount === 1 ? "note" : "notes"}
                    </Badge>
                  )}
                </div>

                {/* The one thing worth knowing at a glance: open notes, approval, the client's last visit. */}
                <TypographyMuted className="flex items-center gap-1.5 text-xs text-muted-foreground font-sans">
                  <ActivityIcon aria-hidden="true" className="size-3.5 shrink-0" />
                  <TypographySpan className="truncate">{activity.label}</TypographySpan>
                </TypographyMuted>
              </CardContent>
            </div>

            {/* Bottom Actions using CardFooter */}
            <CardFooter className="pt-4 mt-6 border-t border-border flex items-center justify-between gap-2">
              <Button
                variant="link"
                size="sm"
                asChild
                className="p-0 h-auto text-xs font-semibold text-primary hover:underline "
              >
                <Link href={`/${workspaceSlug}/deliveries/${item.id}`} className="flex items-center gap-1">
                  Manage Cut <ArrowRight className="size-3 ml-0.5" />
                </Link>
              </Button>

              <div className="flex items-center gap-2">
                {/*<Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(item.shareToken, item.id)}
                  className="rounded-xl border-border bg-muted/40 hover:bg-muted text-foreground cursor-pointer text-xs px-3 h-8 flex items-center gap-1.5 transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <TypographySpan className="text-emerald-500 font-semibold">Copied</TypographySpan>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-muted-foreground" />
                      <TypographySpan>Copy Link</TypographySpan>
                    </>
                  )}
                </Button>*/}

                {canSendWhatsApp && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleWhatsAppShare(item)}
                    className="rounded-xl border-border bg-muted/40 hover:bg-muted text-emerald-500 hover:text-emerald-400 size-8 transition-colors cursor-pointer"
                    title="Send via WhatsApp"
                  >
                    <MessageCircle className="size-4" />
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

                {onDeleteDelivery && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={isDeleting}
                    onClick={() => onDeleteDelivery(item)}
                    className="rounded-xl border-border bg-muted/40 hover:bg-destructive/15 hover:border-destructive/40 text-muted-foreground hover:text-destructive size-8 transition-colors cursor-pointer"
                    title={
                      assetsCount > 0
                        ? `Delete delivery (${assetsCount} ${assetsCount === 1 ? "asset" : "assets"})`
                        : "Delete empty delivery"
                    }
                  >
                    {isDeleting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

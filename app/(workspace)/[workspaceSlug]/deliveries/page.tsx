"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Link2,
  Copy,
  Check,
  Share2,
  Lock,
  Download,
  MessageCircle,
  ExternalLink,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface DeliveryItem {
  id: string;
  title: string;
  clientName: string;
  version: string;
  duration: string;
  status: "in_review" | "approved" | "changes_requested";
  shareToken: string;
  passcodeProtected: boolean;
  downloadsAllowed: boolean;
  commentsCount: number;
  lastActivity: string;
}

const SAMPLE_DELIVERIES: DeliveryItem[] = [
  {
    id: "del_1",
    title: "Omakase Counter Launch Film",
    clientName: "Lost in Tokyo Group",
    version: "v3_DirectorCut_4K",
    duration: "00:47",
    status: "in_review",
    shareToken: "token-1",
    passcodeProtected: true,
    downloadsAllowed: true,
    commentsCount: 3,
    lastActivity: "12 mins ago",
  },
  {
    id: "del_2",
    title: "Aisha & Omar — Wedding Teaser",
    clientName: "Private Client",
    version: "v2_ColorFinal",
    duration: "03:12",
    status: "approved",
    shareToken: "token-2",
    passcodeProtected: false,
    downloadsAllowed: true,
    commentsCount: 0,
    lastActivity: "2 hours ago",
  },
  {
    id: "del_3",
    title: "Mercedes GT3 Desert Spec Reel",
    clientName: "Prestige Rentals Dubai",
    version: "v1_RoughCut",
    duration: "01:20",
    status: "changes_requested",
    shareToken: "token-3",
    passcodeProtected: true,
    downloadsAllowed: false,
    commentsCount: 7,
    lastActivity: "Yesterday",
  },
  {
    id: "del_4",
    title: "Clean Performance Launch Reel",
    clientName: "Clean Snacks UAE",
    version: "v4_MasterDelivery",
    duration: "00:30",
    status: "approved",
    shareToken: "token-4",
    passcodeProtected: false,
    downloadsAllowed: true,
    commentsCount: 1,
    lastActivity: "3 days ago",
  },
];

export default function DeliveriesPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "in_review" | "approved">("all");

  const filteredDeliveries = SAMPLE_DELIVERIES.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  const handleCopyLink = (token: string, id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/deliver/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: DeliveryItem["status"]) => {
    switch (status) {
      case "in_review":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#f5551d] animate-pulse" />
            In Review
          </span>
        );
      case "approved":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Check className="size-3" />
            Approved
          </span>
        );
      case "changes_requested":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Changes Requested
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
            Private Workspace
          </div>
          <h1 className="text-3xl font-bold font-heading text-foreground">
            Client Deliveries
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate instant 4K review rooms with timecoded feedback, passcodes, and WhatsApp delivery links.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="rounded-full bg-[#f5551d] text-black font-semibold hover:bg-[#ff8a45] shadow-lg shadow-[#f5551d]/20 transition-all cursor-pointer"
          >
            <Link href={`/${workspaceSlug}/projects`}>
              <Plus className="size-4 mr-1.5" /> New Delivery Room
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === "all"
              ? "bg-accent text-accent-foreground font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          All Deliveries ({SAMPLE_DELIVERIES.length})
        </button>
        <button
          onClick={() => setFilter("in_review")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === "in_review"
              ? "bg-accent text-accent-foreground font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Active In-Review (1)
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === "approved"
              ? "bg-accent text-accent-foreground font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Approved &amp; Ready (2)
        </button>
      </div>

      {/* Deliveries List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredDeliveries.map((item) => {
          const isCopied = copiedId === item.id;
          const shareUrl = `/deliver/${item.shareToken}`;

          return (
            <div
              key={item.id}
              className="rounded-2xl bg-card border border-border p-5 hover:border-primary/40 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md"
            >
              <div>
                {/* Status + Version Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {getStatusBadge(item.status)}
                  <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                    {item.version}
                  </span>
                </div>

                {/* Title & Client */}
                <h3 className="font-heading text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Client: <span className="font-medium text-foreground">{item.clientName}</span>
                </p>

                {/* Specs / Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] text-muted-foreground font-mono">
                  <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                    <Clock className="size-3 text-[#f5551d]" /> {item.duration}
                  </span>
                  {item.passcodeProtected && (
                    <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-md">
                      <Lock className="size-3" /> Passcode Protected
                    </span>
                  )}
                  {item.downloadsAllowed ? (
                    <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md">
                      <Download className="size-3" /> Downloads Enabled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-muted text-muted-foreground px-2 py-1 rounded-md">
                      Stream Only
                    </span>
                  )}
                  {item.commentsCount > 0 && (
                    <span className="flex items-center gap-1 bg-[#f5551d]/10 text-[#f5551d] px-2 py-1 rounded-md">
                      <MessageCircle className="size-3" /> {item.commentsCount} notes
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 mt-5 border-t border-border flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Updated {item.lastActivity}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(item.shareToken, item.id)}
                    className="text-xs rounded-xl h-8 gap-1.5 cursor-pointer hover:bg-accent"
                  >
                    {isCopied ? (
                      <>
                        <Check className="size-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied Link</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-muted-foreground" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 border border-emerald-500/20"
                    title="Send via WhatsApp"
                  >
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hi ${item.clientName}, your review cut for ${item.title} is ready to watch in 4K: ${typeof window !== "undefined" ? window.location.origin : ""}/deliver/${item.shareToken}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 rounded-xl hover:bg-accent hover:text-accent-foreground"
                    title="Open Live Review Room"
                  >
                    <Link href={shareUrl} target="_blank">
                      <ExternalLink className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

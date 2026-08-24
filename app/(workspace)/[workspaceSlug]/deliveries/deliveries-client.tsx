"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Film,
  Calendar,
  Layers,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createProjectAction } from "@/app/actions/projects";

export interface DeliveryProjectItem {
  id: string;
  title: string;
  clientName: string;
  version: string;
  duration: string;
  status: "draft" | "in_review" | "approved" | "archived";
  shareToken: string;
  passcodeProtected: boolean;
  downloadsAllowed: boolean;
  commentsCount: number;
  lastActivity: string;
}

export interface DeliveriesClientProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  deliveries: DeliveryProjectItem[];
}

export function DeliveriesClient({
  workspace,
  deliveries,
}: DeliveriesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "in_review" | "approved">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Project Form State
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === "all") return true;
    if (filter === "in_review") return d.status === "in_review" || d.status === "draft";
    if (filter === "approved") return d.status === "approved";
    return true;
  });

  const inReviewCount = deliveries.filter(
    (d) => d.status === "in_review" || d.status === "draft"
  ).length;
  const approvedCount = deliveries.filter((d) => d.status === "approved").length;

  const handleCopyLink = (token: string, id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/deliver/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || creating) return;

    setCreating(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("title", newTitle.trim());
    formData.set("description", newClient.trim() || "");

    const res = await createProjectAction(formData);

    if (res.success && res.project) {
      setShowCreateModal(false);
      setNewTitle("");
      setNewClient("");
      router.push(`/${workspace.slug}/deliveries/${res.project.id}`);
    } else {
      setErrorMessage(res.error || "Failed to create project delivery room.");
    }
    setCreating(false);
  };

  const getStatusBadge = (status: DeliveryProjectItem["status"]) => {
    switch (status) {
      case "in_review":
      case "draft":
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
      case "archived":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            Archived
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Create Delivery Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#141416] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold font-heading text-foreground">
                New Delivery Room
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a dedicated 4K review workspace for your client.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Omakase Counter Launch Film"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Client / Brand Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lost in Tokyo Group"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] shadow-md cursor-pointer"
                >
                  {creating ? "Creating..." : "Create & Upload Cut"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
            Client Delivery Rooms
          </div>
          <h1 className="text-3xl font-bold font-heading text-foreground">
            Client Deliveries
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your projects and client review links with 4K HDR streaming, timecoded feedback, and WhatsApp delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="rounded-full bg-[#f5551d] text-black font-semibold hover:bg-[#ff8a45] shadow-lg shadow-[#f5551d]/20 transition-all cursor-pointer text-xs h-9 px-4"
          >
            <Plus className="size-4 mr-1.5" /> New Delivery Room
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
          All Projects ({deliveries.length})
        </button>
        <button
          onClick={() => setFilter("in_review")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === "in_review"
              ? "bg-accent text-accent-foreground font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Active In-Review ({inReviewCount})
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === "approved"
              ? "bg-accent text-accent-foreground font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Approved &amp; Ready ({approvedCount})
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
                <Link href={`/${workspace.slug}/deliveries/${item.id}`} className="block group">
                  <h3 className="font-heading text-lg font-bold text-card-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                  </h3>
                </Link>
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
                <Link
                  href={`/${workspace.slug}/deliveries/${item.id}`}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 font-mono"
                >
                  Manage Cut <ArrowRight className="size-3" />
                </Link>

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

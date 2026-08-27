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
  FileVideo,
} from "lucide-react";
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* ➕ Create Delivery Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md liquid-glass rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 text-[#aeaeb4] hover:text-[#f6f3ec] hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-1">
              <span className="glass-badge font-mono text-[11px]">
                NEW REVIEW ROOM
              </span>
              <h3 className="text-xl font-bold font-display text-[#f6f3ec]">
                Create Delivery Workspace
              </h3>
              <p className="text-xs text-[#aeaeb4] font-sans">
                Set up a dedicated 4K review workspace for your client.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#aeaeb4] uppercase tracking-wider mb-1.5 font-mono">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Omakase Counter Launch Film"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full glass-input text-xs rounded-xl py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#aeaeb4] uppercase tracking-wider mb-1.5 font-mono">
                  Client / Brand Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lost in Tokyo Group"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full glass-input text-xs rounded-xl py-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="glass-btn-ghost cursor-pointer text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="glass-btn btn-glass-layer cursor-pointer text-xs px-5 py-2.5 font-bold"
                >
                  {creating ? "Creating..." : "Create & Upload Cut"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1 font-semibold">
            WORKSPACE DASHBOARD
          </div>
          <h1 className="text-3xl font-bold font-display text-[#f6f3ec]">
            Client Deliveries
          </h1>
          <p className="text-sm text-[#aeaeb4] mt-1 font-sans">
            Your projects and client review links with 4K HDR streaming, timecoded feedback, and WhatsApp delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="glass-btn btn-glass-layer cursor-pointer text-xs px-5 py-2.5 font-bold flex items-center gap-2"
          >
            <Plus className="size-4" /> New Delivery Room
          </button>
        </div>
      </div>

      {/* Filter Tab Bar */}
      <div className="glass-pill rounded-full p-1 inline-flex items-center gap-1">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filter === "all"
              ? "glass-btn text-white shadow-md"
              : "text-[#aeaeb4] hover:text-[#f6f3ec]"
          }`}
        >
          All Projects ({deliveries.length})
        </button>
        <button
          onClick={() => setFilter("in_review")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filter === "in_review"
              ? "glass-btn text-white shadow-md"
              : "text-[#aeaeb4] hover:text-[#f6f3ec]"
          }`}
        >
          Active In-Review ({inReviewCount})
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filter === "approved"
              ? "glass-btn text-white shadow-md"
              : "text-[#aeaeb4] hover:text-[#f6f3ec]"
          }`}
        >
          Approved &amp; Ready ({approvedCount})
        </button>
      </div>

      {/* Deliveries List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDeliveries.map((item) => {
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
                <Link href={`/${workspace.slug}/deliveries/${item.id}`} className="block group">
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
                  href={`/${workspace.slug}/deliveries/${item.id}`}
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
    </div>
  );
}

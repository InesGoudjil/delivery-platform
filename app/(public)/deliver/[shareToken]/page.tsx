"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Play,
  Check,
  Download,
  MessageCircle,
  Lock,
  Send,
  Clock,
  Share2,
  KeyRound,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  X,
  FileVideo,
  CheckCircle2,
} from "lucide-react";

interface CommentItem {
  id: string;
  who: "client" | "filmmaker";
  name: string;
  tc: string;
  meta: string;
  text: string;
}

interface DeliveryAsset {
  id: string;
  title: string;
  aspect: string;
  duration: string;
  res: string;
  version: "V1" | "V2" | "Final";
  status: "review" | "approved";
  thumbnailGradient: string;
}

const INITIAL_ASSETS: DeliveryAsset[] = [
  {
    id: "a1",
    title: "Omakase Teaser — Master Cut",
    aspect: "16:9",
    duration: "00:47",
    res: "4K 60fps",
    version: "V2",
    status: "review",
    thumbnailGradient: "linear-gradient(135deg, #3a1a10, #7a2f18)",
  },
  {
    id: "a2",
    title: "Vertical Story & Reels Cut",
    aspect: "9:16",
    duration: "00:30",
    res: "1080p 60fps",
    version: "V2",
    status: "review",
    thumbnailGradient: "linear-gradient(135deg, #1c2230, #38404e)",
  },
  {
    id: "a3",
    title: "Social Highlight Teaser",
    aspect: "1:1",
    duration: "00:15",
    res: "1080p 30fps",
    version: "Final",
    status: "approved",
    thumbnailGradient: "linear-gradient(135deg, #101a1c, #20403f)",
  },
];

export default function ClientDeliveryPage() {
  const params = useParams();
  const shareToken = (params?.shareToken as string) || "demo-token";

  // State
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [assets, setAssets] = useState<DeliveryAsset[]>(INITIAL_ASSETS);
  const [activeAsset, setActiveAsset] = useState<DeliveryAsset | null>(null);
  const [activeVersion, setActiveVersion] = useState<"V1" | "V2" | "Final">("V2");

  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: "c1",
      who: "client",
      name: "Lost in Tokyo (Client)",
      tc: "00:14",
      meta: "2 hours ago",
      text: "Love this cut! Can we make the intro color grade slightly warmer?",
    },
    {
      id: "c2",
      who: "filmmaker",
      name: "Pedro Concreato (Filmmaker)",
      tc: "00:24",
      meta: "1 hour ago",
      text: "Updated color profile on V2 — check out frame 00:24!",
    },
  ]);

  const [commentText, setCommentText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Password Gate Submission
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim().length > 0) {
      setIsLocked(false);
      setPasswordError(false);
      showToast("Access granted to review room");
    } else {
      setPasswordError(true);
    }
  };

  // Single Asset Approval
  const handleApproveAsset = (assetId: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, status: "approved" } : a))
    );
    showToast("Asset cut approved successfully");
  };

  // Bulk Approval
  const handleApproveAll = () => {
    setAssets((prev) => prev.map((a) => ({ ...a, status: "approved" })));
    showToast("All delivery cuts approved & locked!");
  };

  // Add Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: CommentItem = {
      id: Date.now().toString(),
      who: "client",
      name: "Client (You)",
      tc: "00:24",
      meta: "Just now",
      text: commentText.trim(),
    };

    setComments((prev) => [...prev, newComment]);
    setCommentText("");
    showToast("Timecoded note added to 00:24");
  };

  // WhatsApp Share Trigger
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Here is the client delivery link for Omakase Teaser: ${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const allApproved = assets.every((a) => a.status === "approved");

  // 🔒 1. PASSWORD PROTECTION GATE SCREEN
  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-[#f6f3ec] font-sans antialiased flex flex-col items-center justify-center p-4 selection:bg-[#f5551d] selection:text-black relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#f5551d]/15 blur-[140px] rounded-full pointer-events-none" />

        <div className="liquid-glass rounded-3xl p-8 sm:p-12 max-w-md w-full text-center space-y-6 shadow-2xl relative z-10 border border-white/15">
          <div className="w-16 h-16 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] mx-auto flex items-center justify-center shadow-inner">
            <KeyRound className="size-8" />
          </div>

          <div className="space-y-2">
            <span className="glass-badge font-mono text-[11px]">
              PROTECTED CLIENT DELIVERY
            </span>
            <h1 className="text-2xl font-bold font-display text-[#f6f3ec]">
              Pedro Concreato Studio
            </h1>
            <p className="text-xs text-[#aeaeb4] font-sans leading-relaxed">
              Enter your client password to access the private review room & final
              cuts for <strong className="text-[#f6f3ec]">Lost in Tokyo</strong>.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter client password (e.g. 1234)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full glass-input text-center text-sm rounded-xl py-3 focus:border-[#f5551d] transition-all"
                autoFocus
              />
              {passwordError && (
                <p className="text-xs text-red-400 mt-2 font-medium">
                  Please enter a valid password to continue.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full glass-btn btn-glass-layer cursor-pointer py-3.5 text-sm font-bold flex items-center justify-center gap-2"
            >
              <ShieldCheck className="size-4" /> Unlock Review Room
            </button>
          </form>

          <p className="text-[11px] text-[#5e5e64] font-mono">
            Link Token: {shareToken.slice(0, 12)}...
          </p>
        </div>
      </div>
    );
  }

  // 🎬 2. MAIN CLIENT DELIVERY VIEW SCREEN
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-black">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/10 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f5551d] to-[#ff8a45] text-black font-extrabold flex items-center justify-center font-display text-sm shadow-md">
              PC
            </div>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg leading-none text-[#f6f3ec]">
                Pedro Concreato Studio
              </h1>
              <p className="text-xs text-[#aeaeb4] mt-0.5 font-sans">
                Client Review & Delivery Room · Lost in Tokyo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {allApproved ? (
              <span className="glass-badge bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold px-4 py-2 text-xs flex items-center gap-2">
                <Lock className="size-3.5" /> All Cuts Approved & Locked
              </span>
            ) : (
              <button
                onClick={handleApproveAll}
                className="glass-btn btn-glass-layer cursor-pointer text-xs px-5 py-2.5 font-bold flex items-center gap-2"
              >
                <Check className="size-4" /> Approve All Cuts
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Delivery Room Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Project Information Card */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/15 shadow-2xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="glass-badge font-mono text-[11px]">
                OFFICIAL DELIVERY
              </span>
              <span className="text-xs text-[#aeaeb4] font-mono">
                Updated Aug 2026 · Total 1.4 GB
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#f6f3ec]">
              Omakase Launch Campaign
            </h2>
            <p className="text-sm text-[#aeaeb4] font-sans max-w-2xl leading-relaxed">
              3 cinematic video cuts created for Lost in Tokyo’s new omakase counter
              launch. Review cuts below, leave timestamped notes, and approve for
              high-res export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => showToast("Initiating 1.4 GB ZIP package download...")}
              className="glass-btn-ghost btn-glass-layer cursor-pointer px-5 py-3 text-xs font-semibold flex items-center gap-2"
            >
              <Download className="size-4 text-[#f5551d]" /> Download All (1.4 GB)
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="glass-btn-ghost btn-glass-layer cursor-pointer px-5 py-3 text-xs font-semibold flex items-center gap-2"
            >
              <Share2 className="size-4 text-[#86b98f]" /> WhatsApp Share
            </button>
          </div>
        </div>

        {/* Delivered Assets Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-[#f6f3ec]">
              Delivered Assets ({assets.length})
            </h3>
            <span className="text-xs text-[#aeaeb4] font-mono">
              Click any cut to play & leave timecoded notes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="liquid-glass rounded-2xl p-4 flex flex-col justify-between space-y-4 border border-white/10 group hover:border-[#f5551d]/40 transition-all duration-300 shadow-xl"
              >
                <div
                  onClick={() => setActiveAsset(asset)}
                  className="aspect-video rounded-xl relative overflow-hidden cursor-pointer flex items-center justify-center group"
                  style={{ background: asset.thumbnailGradient }}
                >
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                  <div className="relative z-10 w-12 h-12 rounded-full bg-black/60 border border-white/30 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-[#f5551d] transition-all">
                    <Play className="size-5 text-[#f6f3ec] group-hover:text-black ml-0.5" />
                  </div>
                  <span className="absolute bottom-3 left-3 z-10 text-[10px] font-mono bg-black/70 px-2 py-0.5 rounded text-[#f6f3ec]">
                    {asset.duration} · {asset.res}
                  </span>
                  <span className="absolute top-3 right-3 z-10 text-[10px] font-mono font-bold bg-[#f5551d] text-black px-2 py-0.5 rounded-full">
                    {asset.version}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-sm font-bold text-[#f6f3ec] truncate">
                      {asset.title}
                    </h4>
                    {asset.status === "approved" ? (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <Check className="size-3" /> Approved
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#ff8a45] bg-[#f5551d]/10 px-2 py-0.5 rounded-full border border-[#f5551d]/30">
                        In Review
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#aeaeb4] font-mono">
                    Aspect: {asset.aspect} · {asset.res}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => setActiveAsset(asset)}
                    className="flex-1 glass-btn-ghost btn-glass-layer cursor-pointer py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="size-3.5 text-[#f5551d]" /> Review &
                    Notes
                  </button>
                  {asset.status !== "approved" && (
                    <button
                      onClick={() => handleApproveAsset(asset.id)}
                      className="glass-btn btn-glass-layer cursor-pointer px-3 py-2 text-xs font-bold"
                      title="Approve Cut"
                    >
                      <Check className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 📹 3. INTERACTIVE VIDEO REVIEW LIGHTBOX MODAL */}
      {activeAsset && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="liquid-glass rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 text-[#f6f3ec] shadow-2xl relative border border-white/20">
            {/* Modal Top Controls */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <FileVideo className="size-6 text-[#f5551d]" />
                <div>
                  <h3 className="font-display font-bold text-lg text-[#f6f3ec]">
                    {activeAsset.title}
                  </h3>
                  <p className="text-xs text-[#aeaeb4] font-mono">
                    Aspect: {activeAsset.aspect} · Duration: {activeAsset.duration}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveAsset(null)}
                className="w-9 h-9 rounded-full bg-white/10 text-[#aeaeb4] hover:text-[#f6f3ec] hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Video Player Stage & Comment Sidebar Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Video Player Screen */}
              <div className="lg:col-span-7 space-y-4">
                <div
                  className="aspect-video rounded-2xl relative overflow-hidden flex flex-col justify-between p-6 shadow-2xl border border-white/15"
                  style={{ background: activeAsset.thumbnailGradient }}
                >
                  <div className="flex justify-between items-start z-10">
                    <span className="px-3 py-1 bg-black/70 rounded-full text-xs font-mono text-[#f6f3ec] border border-white/10">
                      00:24.12 / {activeAsset.duration}
                    </span>
                    <span className="glass-badge font-mono text-[10px]">
                      {activeAsset.res}
                    </span>
                  </div>

                  <div className="self-center w-16 h-16 rounded-full bg-black/60 border border-white/30 flex items-center justify-center backdrop-blur-md cursor-pointer hover:scale-110 hover:bg-[#f5551d] transition-all">
                    <Play className="size-7 text-[#f6f3ec] ml-1" />
                  </div>

                  {/* Scrubber Bar */}
                  <div className="space-y-2 z-10">
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                      <div className="w-1/2 h-full bg-[#f5551d]" />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-[#aeaeb4]">
                      <span>00:24 frame</span>
                      <span>Cloudflare 4K HLS Stream</span>
                    </div>
                  </div>
                </div>

                {/* Version Selector Bar */}
                <div className="flex items-center justify-between glass-card p-3 rounded-xl">
                  <span className="text-xs font-mono text-[#aeaeb4]">
                    Select Cut Version:
                  </span>
                  <div className="glass-pill rounded-full p-1 flex gap-1">
                    {(["V1", "V2", "Final"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setActiveVersion(v)}
                        className={`px-4 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          activeVersion === v
                            ? "glass-btn text-white shadow-md"
                            : "text-[#aeaeb4] hover:text-[#f6f3ec]"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timestamped Comment Drawer */}
              <div className="lg:col-span-5 glass-card p-5 rounded-2xl flex flex-col justify-between h-[420px] border border-white/10">
                <div className="space-y-4 overflow-hidden flex flex-col h-full">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                    <h4 className="font-display font-bold text-sm text-[#f6f3ec] flex items-center gap-2">
                      <MessageCircle className="size-4 text-[#f5551d]" /> Timecoded
                      Notes ({comments.length})
                    </h4>
                    <span className="text-[10px] font-mono text-[#aeaeb4]">
                      TC: 00:24
                    </span>
                  </div>

                  {/* Comments Scrollable Feed */}
                  <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          c.who === "client"
                            ? "bg-[#1c1c20] border border-white/10 text-[#f6f3ec]"
                            : "bg-[#f5551d]/10 border border-[#f5551d]/20 text-[#f6f3ec] ml-3"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#aeaeb4] font-mono">
                          <span>{c.name}</span>
                          <span className="text-[#ff8a45] font-bold">
                            [{c.tc}]
                          </span>
                        </div>
                        <p className="leading-snug text-xs">{c.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Comment Input */}
                  <form
                    onSubmit={handleAddComment}
                    className="pt-3 border-t border-white/10 flex gap-2 shrink-0"
                  >
                    <input
                      type="text"
                      placeholder="Add note at 00:24..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 glass-input rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="glass-btn btn-glass-layer cursor-pointer px-3 py-2 text-xs font-bold"
                    >
                      <Send className="size-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel border border-[#f5551d] text-[#f6f3ec] px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="size-4 text-[#f5551d]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

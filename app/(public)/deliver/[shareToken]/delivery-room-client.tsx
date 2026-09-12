"use client";

import { useState, useRef, useTransition } from "react";
import {
  Play,
  Check,
  Download,
  MessageCircle,
  Lock,
  Send,
  Share2,
  KeyRound,
  ShieldCheck,
  X,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { CutReviewPlayer, type CutReviewPlayerRef } from "@/components/video/cut-review-player";
import { formatTimecode, parseTimecodeToSeconds } from "@/lib/timecode";
import {
  verifyDeliveryPasscodeAction,
  toggleAssetApprovalAction,
  approveAllAssetsAction,
  approveCutAction,
} from "@/app/actions/deliveries";
import { addFeedbackAction, toggleFeedbackResolvedAction } from "@/app/actions/feedback";

export interface AssetVersionItem {
  id: string;
  versionNumber: number;
  rawFileUrl: string;
  hlsManifestUrl?: string | null;
  thumbnailUrl?: string | null;
  fileSizeBytes?: number | null;
  durationSeconds?: number | null;
  transcodingStatus?: string | null;
  isActiveVersion?: boolean;
}

export interface FeedbackItem {
  id: string;
  assetVersionId: string;
  authorName: string;
  commentText: string;
  timestampSeconds?: number | null;
  isResolved: boolean;
  createdAt: string;
}

export interface DeliveryAssetItem {
  id: string;
  title: string;
  type: string;
  aspectRatio?: string;
  isApproved?: boolean;
  sortOrder?: number;
  versions: AssetVersionItem[];
  activeVersion?: AssetVersionItem | null;
  feedback: FeedbackItem[];
}

export interface DeliveryRoomProps {
  delivery: {
    id: string;
    workspaceId: string;
    title: string;
    description?: string | null;
    shareToken: string;
    status: "draft" | "in_review" | "approved" | "archived";
    isDownloadAllowed: boolean;
    isWatermarked: boolean;
    approvedAt?: string | null;
    approvedByName?: string | null;
    expiresAt?: string | null;
    location?: string | null;
    deliveryDate?: string | null;
    createdAt?: string;
  };
  workspace: {
    brandName: string;
    slug: string;
    logoUrl?: string | null;
    accentColor?: string | null;
  };
  clientName?: string | null;
  initialAssets: DeliveryAssetItem[];
  isPasscodeProtected: boolean;
  isInitiallyUnlocked: boolean;
  currentUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

export function DeliveryRoomClient({
  delivery,
  workspace,
  clientName,
  initialAssets,
  isPasscodeProtected,
  isInitiallyUnlocked,
  currentUser,
}: DeliveryRoomProps) {
  // Passcode gate state
  const [isLocked, setIsLocked] = useState(isPasscodeProtected && !isInitiallyUnlocked);
  const [passwordInput, setPasswordInput] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isVerifyingPasscode, startPasscodeTransition] = useTransition();

  // Delivery data state
  const [deliveryStatus, setDeliveryStatus] = useState(delivery.status);
  const [assets, setAssets] = useState<DeliveryAssetItem[]>(initialAssets);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Comments state
  const [commentAuthor, setCommentAuthor] = useState(
    currentUser?.name || clientName || "Client Reviewer"
  );
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, startCommentTransition] = useTransition();
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Timecode playhead state
  const cutPlayerRef = useRef<CutReviewPlayerRef | null>(null);
  const [currentPlayheadTime, setCurrentPlayheadTime] = useState(0);
  const [currentPlayheadTc, setCurrentPlayheadTc] = useState("00:00:00");

  // Global flash toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find active asset & version
  const activeAsset = assets.find((a) => a.id === activeAssetId) || null;
  const activeVersion = activeAsset
    ? activeAsset.versions.find((v) => v.id === selectedVersionId) ||
      activeAsset.activeVersion ||
      activeAsset.versions[0] ||
      null
    : null;

  // Feedback for active version
  const activeFeedback = activeAsset
    ? activeAsset.feedback.filter(
        (f) => !activeVersion || f.assetVersionId === activeVersion.id
      )
    : [];

  // Check if all assets are approved
  const allApproved =
    deliveryStatus === "approved" ||
    (assets.length > 0 && assets.every((a) => a.isApproved));

  // 1. Password Gate Submission
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);

    if (!passwordInput.trim()) {
      setPasscodeError("Please enter the client passcode.");
      return;
    }

    startPasscodeTransition(async () => {
      const res = await verifyDeliveryPasscodeAction(delivery.shareToken, passwordInput);
      if (res.success) {
        setIsLocked(false);
        showToast("Access granted to review room");
      } else {
        setPasscodeError(res.error || "Incorrect passcode. Please try again.");
      }
    });
  };

  // 2. Single Asset Approval
  const handleToggleAssetApproval = async (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    const nextApproved = !asset.isApproved;

    // Optimistic UI
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, isApproved: nextApproved } : a))
    );

    const res = await toggleAssetApprovalAction(delivery.id, assetId, nextApproved);
    if (res.success) {
      if (nextApproved) {
        showToast(`"${asset.title}" approved!`);
      } else {
        showToast(`Approval removed for "${asset.title}"`);
      }
      if (res.delivery?.status) {
        setDeliveryStatus(res.delivery.status);
      }
    } else {
      // Revert on error
      setAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, isApproved: asset.isApproved } : a))
      );
      showToast(res.error || "Failed to update asset approval.");
    }
  };

  // 3. Bulk Approval
  const handleApproveAll = async () => {
    setAssets((prev) => prev.map((a) => ({ ...a, isApproved: true })));
    setDeliveryStatus("approved");

    const res = await approveAllAssetsAction(delivery.id, commentAuthor);
    if (res.success) {
      showToast("All delivery cuts approved & locked!");
    } else {
      showToast(res.error || "Failed to approve all cuts.");
    }
  };

  // 4. Add Timecoded Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeAsset || !activeVersion) return;

    const capturedTime = cutPlayerRef.current?.getCurrentTime() ?? currentPlayheadTime;
    const roundedTime = Math.round(capturedTime * 100) / 100;
    const formattedTc = formatTimecode(roundedTime, 24);

    const tempId = `temp_${Date.now()}`;
    const newFeedback: FeedbackItem = {
      id: tempId,
      assetVersionId: activeVersion.id,
      authorName: commentAuthor.trim() || "Client",
      commentText: commentText.trim(),
      timestampSeconds: roundedTime,
      isResolved: false,
      createdAt: new Date().toISOString(),
    };

    // Optimistic append
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === activeAsset.id) {
          return {
            ...a,
            feedback: [...a.feedback, newFeedback],
          };
        }
        return a;
      })
    );
    setCommentText("");
    setActiveCommentId(tempId);
    showToast(`Timecoded note added at [${formattedTc}]`);

    startCommentTransition(async () => {
      const res = await addFeedbackAction({
        assetVersionId: activeVersion.id,
        authorName: commentAuthor.trim() || "Client",
        commentText: newFeedback.commentText,
        timestampSeconds: roundedTime,
        shareToken: delivery.shareToken,
        deliveryId: delivery.id,
      });

      if (res.success && res.feedback) {
        // Swap temp ID with real DB ID
        setAssets((prev) =>
          prev.map((a) => {
            if (a.id === activeAsset.id) {
              return {
                ...a,
                feedback: a.feedback.map((f) => (f.id === tempId ? (res.feedback as FeedbackItem) : f)),
              };
            }
            return a;
          })
        );
      }
    });
  };

  // 5. Toggle Resolve Comment
  const handleToggleResolve = async (feedbackId: string, currentResolved: boolean) => {
    setAssets((prev) =>
      prev.map((a) => ({
        ...a,
        feedback: a.feedback.map((f) =>
          f.id === feedbackId ? { ...f, isResolved: !currentResolved } : f
        ),
      }))
    );

    await toggleFeedbackResolvedAction(feedbackId, !currentResolved, delivery.shareToken, delivery.id);
  };

  // 6. WhatsApp Share
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🎬 Here is the private review room for ${delivery.title}:\n${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Open asset modal and initialize version
  const openAssetModal = (asset: DeliveryAssetItem) => {
    setActiveAssetId(asset.id);
    const activeVer = asset.activeVersion || asset.versions[0] || null;
    setSelectedVersionId(activeVer ? activeVer.id : null);
    setCurrentPlayheadTime(0);
    setCurrentPlayheadTc("00:00:00");
    setActiveCommentId(null);
  };

  // 🔒 1. PASSWORD GATE SCREEN
  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#070709] text-[#f6f3ec] font-sans antialiased flex flex-col items-center justify-center p-4 selection:bg-[#f5551d] selection:text-black relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#f5551d]/15 blur-[140px] rounded-full pointer-events-none" />

        <div className="liquid-glass rounded-3xl p-8 sm:p-12 max-w-md w-full text-center space-y-6 shadow-2xl relative z-10 border border-white/15 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] mx-auto flex items-center justify-center shadow-inner">
            <KeyRound className="size-8" />
          </div>

          <div className="space-y-2">
            <span className="glass-badge font-mono text-[11px] uppercase tracking-wider text-[#ff8a45]">
              Protected Review Room
            </span>
            <h1 className="text-2xl font-bold font-display text-[#f6f3ec]">
              {workspace.brandName}
            </h1>
            <p className="text-xs text-[#aeaeb4] font-sans leading-relaxed">
              Enter your passcode to access the private delivery cuts for{" "}
              <strong className="text-[#f6f3ec]">{delivery.title}</strong>.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter client passcode"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-center text-sm rounded-xl py-3 focus:outline-none focus:border-[#f5551d] transition-all text-white placeholder:text-neutral-500"
                autoFocus
                disabled={isVerifyingPasscode}
              />
              {passcodeError && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 mt-2 font-medium">
                  <AlertCircle className="size-3.5" />
                  <span>{passcodeError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifyingPasscode}
              className="w-full bg-[#f5551d] hover:bg-[#e0440d] text-black font-bold py-3.5 text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg disabled:opacity-50"
            >
              <ShieldCheck className="size-4" />
              {isVerifyingPasscode ? "Verifying..." : "Unlock Review Room"}
            </button>
          </form>

          <p className="text-[11px] text-[#5e5e64] font-mono">
            Delivery Token: {delivery.shareToken.slice(0, 8)}...
          </p>
        </div>
      </div>
    );
  }

  // 🎬 2. MAIN CLIENT DELIVERY VIEW SCREEN
  return (
    <div className="min-h-screen bg-[#070709] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#070709]/80 backdrop-blur-xl border-b border-white/10 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {workspace.logoUrl ? (
              <img
                src={workspace.logoUrl}
                alt={workspace.brandName}
                className="w-10 h-10 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f5551d] to-[#ff8a45] text-black font-extrabold flex items-center justify-center font-display text-sm shadow-md">
                {workspace.brandName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg leading-none text-[#f6f3ec]">
                {workspace.brandName}
              </h1>
              <p className="text-xs text-[#aeaeb4] mt-0.5 font-sans truncate max-w-[200px] sm:max-w-md">
                Client Review · {delivery.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {allApproved ? (
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full font-bold px-4 py-2 text-xs flex items-center gap-2">
                <Lock className="size-3.5" /> All Cuts Approved &amp; Locked
              </span>
            ) : (
              <button
                onClick={handleApproveAll}
                className="bg-[#f5551d] hover:bg-[#e0440d] text-black rounded-full cursor-pointer text-xs px-5 py-2.5 font-bold flex items-center gap-2 transition-colors shadow-md"
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
        <div className="bg-[#111115]/90 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10 shadow-2xl backdrop-blur-md">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/10 text-white/90 border border-white/15 px-2.5 py-0.5 rounded-full font-mono text-[11px] uppercase tracking-wider">
                Official Delivery
              </span>
              <span className="text-xs text-[#aeaeb4] font-mono">
                {assets.length} {assets.length === 1 ? "Deliverable" : "Deliverables"}
              </span>
              {delivery.location && (
                <span className="text-xs text-[#aeaeb4] font-mono">
                  · {delivery.location}
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#f6f3ec] uppercase tracking-wide">
              {delivery.title}
            </h2>
            <p className="text-sm text-[#aeaeb4] font-sans max-w-2xl leading-relaxed">
              {delivery.description ||
                "Review the cuts below, leave timestamped frame notes, and approve when ready for high-resolution master export."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {delivery.isDownloadAllowed ? (
              <button
                onClick={() => {
                  const firstWithUrl = assets.find(
                    (a) => a.activeVersion?.rawFileUrl || a.versions[0]?.rawFileUrl
                  );
                  const downloadUrl =
                    firstWithUrl?.activeVersion?.rawFileUrl ||
                    firstWithUrl?.versions[0]?.rawFileUrl;
                  if (downloadUrl) {
                    window.open(downloadUrl, "_blank");
                    showToast("Opening master cut download...");
                  } else {
                    showToast("No direct master file attached to download.");
                  }
                }}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-full cursor-pointer px-5 py-3 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Download className="size-4 text-[#f5551d]" /> Download Master Cuts
              </button>
            ) : (
              <div
                title="Master ProRes/MP4 downloads are locked until cuts are approved."
                className="bg-white/5 text-[#aeaeb4] border border-white/10 rounded-full px-4 py-2.5 text-xs font-mono flex items-center gap-2 select-none"
              >
                <Lock className="size-3.5 text-amber-400" /> Downloads Locked (Pending Sign-off)
              </div>
            )}

            <button
              onClick={handleWhatsAppShare}
              className="bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-full cursor-pointer px-5 py-3 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Share2 className="size-4 text-[#86b98f]" /> WhatsApp Share
            </button>
          </div>
        </div>

        {/* Delivered Assets Grid Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-[#f6f3ec]">
              Deliverables ({assets.length})
            </h3>
            <span className="text-xs text-[#aeaeb4] font-mono hidden sm:inline">
              Click any cut to view playhead &amp; leave timecoded notes
            </span>
          </div>

          {assets.length === 0 ? (
            <div className="bg-[#111115] border border-white/10 rounded-3xl p-12 text-center space-y-4">
              <FileVideo className="w-12 h-12 text-[#f5551d] mx-auto opacity-70" />
              <div className="space-y-1">
                <h4 className="font-display font-bold text-lg text-white">
                  Cuts Awaiting Processing
                </h4>
                <p className="text-xs text-[#aeaeb4] max-w-md mx-auto">
                  Your filmmaker has set up this review room and is finalizing the video cuts. Refresh or check back shortly.
                </p>
              </div>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {assets.map((asset) => {
                const ver = asset.activeVersion || asset.versions[0] || null;
                const isPhoto = asset.type === "photo_gallery" || asset.type === "image";
                const poster =
                  ver?.thumbnailUrl ||
                  (isPhoto ? ver?.rawFileUrl : null) ||
                  "/images/hero.jpg";

                const durationSec = ver?.durationSeconds ? Math.round(ver.durationSeconds) : null;
                const durationLabel = isPhoto
                  ? "STILL"
                  : durationSec
                  ? `${Math.floor(durationSec / 60)
                      .toString()
                      .padStart(2, "0")}:${(durationSec % 60).toString().padStart(2, "0")}`
                  : "VIDEO";

                const aspectClass =
                  asset.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video";

                const commentsCount = asset.feedback.length;

                return (
                  <div
                    key={asset.id}
                    className="break-inside-avoid bg-[#111115] rounded-2xl p-4 flex flex-col justify-between space-y-4 border border-white/10 group hover:border-[#f5551d]/40 transition-all duration-300 shadow-xl"
                  >
                    {/* Media Thumbnail & Play Trigger */}
                    <div
                      onClick={() => openAssetModal(asset)}
                      className={`rounded-xl relative overflow-hidden cursor-pointer flex items-center justify-center bg-black/40 ${aspectClass}`}
                    >
                      <img
                        src={poster}
                        alt={asset.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                      {/* Play Icon */}
                      <div className="relative z-10 w-12 h-12 rounded-full bg-black/60 border border-white/30 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-[#f5551d] transition-all">
                        <Play className="size-5 text-[#f6f3ec] group-hover:text-black ml-0.5" />
                      </div>

                      <span className="absolute bottom-3 left-3 z-10 text-[10px] font-mono bg-black/70 px-2 py-0.5 rounded text-[#f6f3ec] backdrop-blur-sm">
                        {durationLabel}
                      </span>
                      {ver && (
                        <span className="absolute top-3 right-3 z-10 text-[10px] font-mono font-bold bg-[#f5551d] text-black px-2 py-0.5 rounded-full shadow">
                          V{ver.versionNumber}
                        </span>
                      )}
                    </div>

                    {/* Metadata & Approval Status */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-display text-sm font-bold text-[#f6f3ec] truncate">
                          {asset.title}
                        </h4>
                        {asset.isApproved ? (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 shrink-0">
                            <Check className="size-3" /> Approved
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[#ff8a45] bg-[#f5551d]/10 px-2 py-0.5 rounded-full border border-[#f5551d]/30 shrink-0">
                            In Review
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#aeaeb4] font-mono">
                        {asset.aspectRatio || "16:9"} · {commentsCount}{" "}
                        {commentsCount === 1 ? "note" : "notes"}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => openAssetModal(asset)}
                        className="flex-1 bg-white/10 hover:bg-white/15 text-white rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="size-3.5 text-[#f5551d]" /> Review &amp; Notes
                      </button>
                      <button
                        onClick={() => handleToggleAssetApproval(asset.id)}
                        className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                          asset.isApproved
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-[#f5551d] hover:bg-[#e0440d] text-black"
                        }`}
                        title={asset.isApproved ? "Approved (Click to revert)" : "Approve this cut"}
                      >
                        <Check className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 📹 3. INTERACTIVE VIDEO REVIEW LIGHTBOX MODAL */}
      {activeAsset && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#111115] rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 text-[#f6f3ec] shadow-2xl relative border border-white/15">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <FileVideo className="size-6 text-[#f5551d]" />
                <div>
                  <h3 className="font-display font-bold text-lg text-[#f6f3ec]">
                    {activeAsset.title}
                  </h3>
                  <p className="text-xs text-[#aeaeb4] font-mono">
                    Aspect: {activeAsset.aspectRatio || "16:9"} · {activeFeedback.length} timecoded notes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveAssetId(null)}
                className="w-9 h-9 rounded-full bg-white/10 text-[#aeaeb4] hover:text-[#f6f3ec] hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Video Player Stage & Comment Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Player Column */}
              <div className="lg:col-span-7 space-y-4">
                {activeVersion ? (
                  <CutReviewPlayer
                    ref={cutPlayerRef}
                    isPhoto={activeAsset.type === "photo_gallery" || activeAsset.type === "image"}
                    src={
                      activeVersion.hlsManifestUrl ||
                      activeVersion.rawFileUrl ||
                      "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"
                    }
                    title={activeAsset.title}
                    poster={activeVersion.thumbnailUrl || "/images/hero.jpg"}
                    aspectRatio={activeAsset.aspectRatio || "16:9"}
                    fps={24}
                    comments={activeFeedback.map((c) => ({
                      id: c.id,
                      timestampSeconds: c.timestampSeconds ?? 0,
                      authorName: c.authorName,
                      commentText: c.commentText,
                      isResolved: c.isResolved,
                    }))}
                    activeCommentId={activeCommentId}
                    onCommentSelect={(commentId, timestamp) => {
                      setActiveCommentId(commentId);
                      cutPlayerRef.current?.seekTo(timestamp);
                    }}
                    onTimeChange={(time, tc) => {
                      setCurrentPlayheadTime(time);
                      setCurrentPlayheadTc(tc);
                    }}
                  />
                ) : (
                  <div className="aspect-video bg-black/50 border border-white/10 rounded-2xl flex items-center justify-center text-xs text-[#aeaeb4]">
                    No video version available
                  </div>
                )}

                {/* Version Selector Bar */}
                {activeAsset.versions.length > 1 && (
                  <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-xs font-mono text-[#aeaeb4]">
                      Select Cut Version:
                    </span>
                    <div className="flex gap-1.5">
                      {activeAsset.versions.map((v) => {
                        const isSelected = activeVersion?.id === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVersionId(v.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#f5551d] text-black shadow-md"
                                : "bg-white/5 text-[#aeaeb4] hover:text-[#f6f3ec]"
                            }`}
                          >
                            V{v.versionNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamped Comment Drawer */}
              <div className="lg:col-span-5 bg-white/5 p-5 rounded-2xl flex flex-col justify-between h-[450px] border border-white/10">
                <div className="space-y-4 overflow-hidden flex flex-col h-full">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                    <h4 className="font-display font-bold text-sm text-[#f6f3ec] flex items-center gap-2">
                      <MessageCircle className="size-4 text-[#f5551d]" /> Notes ({activeFeedback.length})
                    </h4>
                    <span className="text-[10px] font-mono text-[#ff8a45] bg-[#f5551d]/10 px-2 py-0.5 rounded border border-[#f5551d]/20">
                      Playhead: {currentPlayheadTc}
                    </span>
                  </div>

                  {/* Comments Feed */}
                  <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                    {activeFeedback.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs text-[#aeaeb4] space-y-1">
                        <p>No comments on this version yet.</p>
                        <p className="text-[11px] text-[#71717a]">
                          Pause at any frame and type your feedback below.
                        </p>
                      </div>
                    ) : (
                      activeFeedback.map((c) => {
                        const isSelected = activeCommentId === c.id;
                        const commentTime = c.timestampSeconds ?? 0;
                        const tcDisplay = formatTimecode(commentTime, 24);

                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              cutPlayerRef.current?.seekTo(commentTime);
                              setActiveCommentId(c.id);
                            }}
                            className={`p-3 rounded-xl text-xs space-y-1.5 cursor-pointer transition-all border ${
                              isSelected
                                ? "bg-[#f5551d]/20 border-[#f5551d] text-[#f6f3ec] ring-1 ring-[#f5551d]"
                                : c.isResolved
                                ? "bg-white/5 border-white/5 text-[#71717a] opacity-75"
                                : "bg-[#18181c] border-white/10 text-[#f6f3ec] hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-[#aeaeb4] font-mono">
                              <span className="font-semibold text-white">{c.authorName}</span>
                              <span className="text-[#ff8a45] font-bold">
                                [{tcDisplay}]
                              </span>
                            </div>
                            <p className="leading-snug text-xs">{c.commentText}</p>
                            <div className="flex items-center justify-end pt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleResolve(c.id, c.isResolved);
                                }}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                  c.isResolved
                                    ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                                    : "text-[#aeaeb4] hover:text-white"
                                }`}
                              >
                                {c.isResolved ? "✓ Resolved" : "Mark resolved"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Comment Input */}
                  <form
                    onSubmit={handleAddComment}
                    className="pt-3 border-t border-white/10 flex flex-col gap-2 shrink-0"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#aeaeb4]">
                      <div className="flex items-center gap-1">
                        <span>As:</span>
                        <input
                          type="text"
                          value={commentAuthor}
                          onChange={(e) => setCommentAuthor(e.target.value)}
                          placeholder="Your Name"
                          className="bg-transparent text-white font-semibold underline underline-offset-2 outline-none max-w-[120px]"
                        />
                      </div>
                      <span className="text-[#ff8a45] font-bold">[{currentPlayheadTc}]</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Leave note at ${currentPlayheadTc}...`}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        disabled={isSubmittingComment}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#f5551d] text-white placeholder:text-neutral-500"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !commentText.trim()}
                        className="bg-[#f5551d] hover:bg-[#e0440d] text-black font-bold px-3.5 py-2 rounded-xl text-xs cursor-pointer transition-colors disabled:opacity-40"
                      >
                        <Send className="size-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111115] border border-[#f5551d] text-[#f6f3ec] px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="size-4 text-[#f5551d]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

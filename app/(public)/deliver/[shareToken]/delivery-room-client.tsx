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
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { CutReviewPlayer, type CutReviewPlayerRef } from "@/components/video/cut-review-player";
import { formatTimecode, parseTimecodeToSeconds } from "@/lib/timecode";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import { WatermarkOverlay } from "@/components/ui/watermark-overlay";
import { DownloadPackageModal } from "@/components/workspaces/download-package-modal";
import { getDownloadFilename, triggerDirectDownload } from "@/lib/download";
import {
  verifyDeliveryPasscodeAction,
  toggleAssetApprovalAction,
  approveAllAssetsAction,
  approveCutAction,
} from "@/app/actions/deliveries";
import { addFeedbackAction, toggleFeedbackResolvedAction } from "@/app/actions/feedback";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { AccentThemeProvider } from "@/components/theme/accent-theme-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AppImage } from "@/components/ui/app-image";
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { TiltCard } from "@/components/ui/motion";
import {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyKicker,
  TypographyLead,
  TypographyMuted,
} from "@/components/ui/typography";

export interface AssetVersionItem {
  id: string;
  versionNumber: number;
  rawFileUrl: string;
  downloadUrl?: string | null;
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
    appearance?: {
      cardSize?: "S" | "M" | "L";
      aspectRatioSetting?: "masonry" | "16:9" | "1:1" | "9:16";
      thumbnailScale?: "Fit" | "Fill";
      showCardInfo?: boolean;
      watermarkMedia?: boolean;
    } | null;
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
  brandingLocation?: string | null;
  initialTotalSizeBytes?: number;
  initialAssetCount?: number;
  initialAssets: DeliveryAssetItem[];
  isPasscodeProtected: boolean;
  isInitiallyUnlocked: boolean;
  currentUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  isWorkspaceMember?: boolean;
  whiteLabel?: boolean;
}

function DeliveryRoomMasonryMedia({
  src,
  alt,
  type = "video",
  thumbnailScale,
  children,
}: {
  src: string;
  alt: string;
  type?: "video" | "photo";
  thumbnailScale?: "Fit" | "Fill";
  children?: React.ReactNode;
}) {
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);

  return (
    <div
      className="relative w-full overflow-hidden bg-black/40"
      style={{
        aspectRatio: naturalAspect ? `${naturalAspect}` : "16 / 10",
      }}
    >
      <AppImage
        src={src}
        alt={alt}
        fill
        containerClassName="absolute inset-0 w-full h-full"
        fallbackIcon={type === "photo" ? "image" : "film"}
        className={`w-full h-full ${
          thumbnailScale === "Fit" ? "object-contain bg-black" : "object-cover"
        } group-hover:scale-105 transition-transform duration-500`}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img && img.naturalWidth && img.naturalHeight) {
            setNaturalAspect(img.naturalWidth / img.naturalHeight);
          }
        }}
      />
      {children}
    </div>
  );
}

export function DeliveryRoomClient({
  delivery,
  workspace,
  clientName,
  brandingLocation,
  initialTotalSizeBytes = 0,
  initialAssetCount = 0,
  initialAssets,
  isPasscodeProtected,
  isInitiallyUnlocked,
  currentUser,
  isWorkspaceMember = false,
  whiteLabel = false,
}: DeliveryRoomProps) {
  // Passcode gate state
  const [isLocked, setIsLocked] = useState(isPasscodeProtected && !isInitiallyUnlocked);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isVerifyingPasscode, startPasscodeTransition] = useTransition();

  // Delivery data state
  const [deliveryStatus, setDeliveryStatus] = useState(delivery.status);
  const [assets, setAssets] = useState<DeliveryAssetItem[]>(initialAssets);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [assetTab, setAssetTab] = useState<"all" | "video" | "photo">("all");
  const [showDownloadModal, setShowDownloadModal] = useState(false);

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

  // Loading states for approvals
  const [approvingAssetId, setApprovingAssetId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

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

  const approvedCount = assets.filter((a) => a.isApproved).length;

  // Calculate total asset size strictly based on the assets present on this delivery alone
  const currentTotalSizeBytes = assets.reduce((acc, a) => {
    const v = a.activeVersion || a.versions?.[0];
    return acc + (Number(v?.fileSizeBytes) || 0);
  }, 0);

  const totalSizeBytes =
    currentTotalSizeBytes > 0
      ? currentTotalSizeBytes
      : (initialTotalSizeBytes || 0);

  const formattedTotalSize = (() => {
    if (totalSizeBytes <= 0) return "0 MB";
    const gb = totalSizeBytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    }
    const mb = totalSizeBytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
    }
    const kb = totalSizeBytes / 1024;
    if (kb >= 1) {
      return `${Math.round(kb)} KB`;
    }
    return `${totalSizeBytes} B`;
  })();

  // Pick location from delivery override, or fall back to workspace branding location
  const displayLocation =
    delivery.location?.trim() || brandingLocation?.trim() || "Dubai, UAE";

  // Pick date from delivery date or creation date
  const formattedDate = (() => {
    const rawDate = delivery.deliveryDate || delivery.createdAt;
    if (!rawDate) return "02.21.26";
    if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [year, month, day] = rawDate.split("-");
      return `${month}.${day}.${year.slice(-2)}`;
    }
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "02.21.26";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}.${dd}.${yy}`;
  })();

  const displayAssetCount = assets.length > 0 ? assets.length : (initialAssetCount || 0);

  const daysRemaining = delivery.expiresAt
    ? Math.max(
        1,
        Math.ceil(
          (new Date(delivery.expiresAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 30;

  const firstAsset = assets[0];
  const firstVersion = firstAsset?.activeVersion || firstAsset?.versions[0];
  const isFirstPhoto =
    firstAsset?.type === "photo_gallery" ||
    firstAsset?.type === "image" ||
    firstAsset?.type === "photo" ||
    firstAsset?.type === "still";
  const heroCoverUrl =
    resolveThumbnailUrl(
      firstVersion?.thumbnailUrl,
      firstVersion?.rawFileUrl,
      isFirstPhoto
    ) || "/images/projects/mercedes-amg-gt/1.webp";

  const filteredAssets = assets.filter((a) => {
    if (assetTab === "all") return true;
    const isVid =
      a.type === "video" ||
      a.type === "film" ||
      a.type === "clip" ||
      a.type === "trailer";
    if (assetTab === "video") return isVid;
    if (assetTab === "photo") return !isVid;
    return true;
  });

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
        if (res.assets && res.assets.length > 0) {
          setAssets(res.assets as DeliveryAssetItem[]);
          if (!activeAssetId) {
            setActiveAssetId(res.assets[0].id);
          }
        }
        setIsLocked(false);
        toast.success("Access granted to review room");
      } else {
        setPasscodeError(res.error || "Incorrect passcode. Please try again.");
      }
    });
  };

  const handleCreatorUnlock = () => {
    startPasscodeTransition(async () => {
      const res = await verifyDeliveryPasscodeAction(delivery.shareToken, "", true);
      if (res.success) {
        if (res.assets && res.assets.length > 0) {
          setAssets(res.assets as DeliveryAssetItem[]);
          if (!activeAssetId) {
            setActiveAssetId(res.assets[0].id);
          }
        }
        setIsLocked(false);
        toast.success("Unlocked as workspace creator");
      } else {
        toast.error(res.error || "Creator authorization failed");
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

    setApprovingAssetId(assetId);
    try {
      const res = await toggleAssetApprovalAction(delivery.id, assetId, nextApproved);
      if (res.success) {
        if (nextApproved) {
          toast.success(`"${asset.title}" approved!`);
        } else {
          toast.info(`Approval removed for "${asset.title}"`);
        }
        if (res.delivery?.status) {
          setDeliveryStatus(res.delivery.status);
        }
      } else {
        // Revert on error
        setAssets((prev) =>
          prev.map((a) => (a.id === assetId ? { ...a, isApproved: asset.isApproved } : a))
        );
        toast.error(res.error || "Failed to update asset approval.");
      }
    } finally {
      setApprovingAssetId(null);
    }
  };

  // 3. Bulk Approval
  const handleApproveAll = async () => {
    setAssets((prev) => prev.map((a) => ({ ...a, isApproved: true })));
    setDeliveryStatus("approved");

    setIsApprovingAll(true);
    try {
      const res = await approveAllAssetsAction(delivery.id, commentAuthor);
      if (res.success) {
        toast.success("All delivery cuts approved & locked!");
      } else {
        toast.error(res.error || "Failed to approve all cuts.");
      }
    } finally {
      setIsApprovingAll(false);
    }
  };

  // 4. Add Timecoded Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeAsset || !activeVersion) return;

    const isStill =
      activeAsset.type === "photo_gallery" ||
      activeAsset.type === "image" ||
      activeAsset.type === "still" ||
      activeAsset.type === "photo";

    const capturedTime = isStill
      ? null
      : (cutPlayerRef.current?.getCurrentTime() ?? currentPlayheadTime);
    const roundedTime = capturedTime !== null ? Math.round(capturedTime * 100) / 100 : null;
    const formattedTc = roundedTime !== null ? formatTimecode(roundedTime, 24) : null;

    if (typeof window !== "undefined" && commentAuthor.trim()) {
      localStorage.setItem("cinespace_reviewer_name", commentAuthor.trim());
    }

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
    if (isStill) {
      toast.success("Feedback note added to still");
    } else {
      toast.success(`Timecoded note added at [${formattedTc}]`);
    }

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

  // 6. WhatsApp Share & Message Creator
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🎬 Here is the private review room for ${delivery.title}:\n${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleMessageCreator = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = encodeURIComponent(
      `Hey ${workspace.brandName}! Regarding the "${delivery.title}" delivery cuts:\n${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // 7. Master Files Download
  const handleDownloadAll = () => {
    setShowDownloadModal(true);
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

  // 🎬 MAIN CLIENT DELIVERY VIEW SCREEN WITH MODAL PASSCODE DIALOG
  return (
    <AccentThemeProvider initialAccent={workspace?.accentColor || "#f5551d"}>
      <TooltipProvider delay={150}>
        <div className={`min-h-screen bg-[#070709] text-[#f6f3ec] font-sans antialiased selection:bg-primary selection:text-primary-foreground relative ${isLocked ? "overflow-hidden max-h-screen" : ""}`}>
          <AmbientBackground variant="subtle" showNoise={false} accentColor={workspace?.accentColor || undefined} />

        {/* 🔒 PASSCODE VERIFICATION MODAL DIALOG */}
        <Dialog open={isLocked} onOpenChange={() => {}}>
          <DialogContent
            showCloseButton={false}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#121216]/95 backdrop-blur-2xl border border-white/20 text-[#f6f3ec] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] mx-auto flex items-center justify-center shadow-inner">
              <KeyRound className="size-8" />
            </div>

            <div className="text-center space-y-2">
              <Badge variant="orange" className="font-mono text-[11px] uppercase tracking-wider text-[#ff8a45]">
                Protected Review Room
              </Badge>
              <TypographyH2 className="text-2xl font-bold font-display text-[#f6f3ec]">
                {workspace.brandName}
              </TypographyH2>
              <TypographyLead className="text-xs text-[#aeaeb4] font-sans leading-relaxed">
                Enter the client passcode to unlock private delivery cuts for{" "}
                <strong className="text-[#f6f3ec]">{delivery.title}</strong>.
              </TypographyLead>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <div className="relative">
                  <Input
                    type={showPasscode ? "text" : "password"}
                    placeholder="Enter client passcode"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-center text-sm rounded-xl py-6 px-10 focus-visible:border-[#f5551d] text-white placeholder:text-neutral-500 font-mono tracking-wider"
                    autoFocus
                    disabled={isVerifyingPasscode}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer p-1 z-10"
                    title={showPasscode ? "Hide passcode" : "Show passcode"}
                  >
                    {showPasscode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {passcodeError && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 mt-2 font-medium">
                    <AlertCircle className="size-3.5" />
                    <span>{passcodeError}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isVerifyingPasscode}
                className="w-full bg-[#f5551d] hover:bg-[#e0440d] text-black font-bold py-6 text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg disabled:opacity-50"
              >
                <ShieldCheck className="size-4" />
                {isVerifyingPasscode ? "Verifying..." : "Unlock Review Room"}
              </Button>
            </form>

            {isWorkspaceMember && (
              <div className="pt-3 border-t border-white/10 text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleCreatorUnlock}
                  disabled={isVerifyingPasscode}
                  className="text-[11px] font-mono text-[#f5551d] hover:underline cursor-pointer transition-colors h-auto p-0"
                >
                  Workspace Creator: Quick Unlock Preview
                </Button>
              </div>
            )}

            <p className="text-[11px] text-[#5e5e64] font-mono text-center">
              Delivery Token: {delivery.shareToken.slice(0, 8)}...
            </p>
          </DialogContent>
        </Dialog>

      {/* Main Review Room Content (blurred when locked) */}
      <div className={`relative z-10 ${isLocked ? "filter blur-lg pointer-events-none select-none opacity-30 transition-all duration-500" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* 1. Prototype Brand Header */}
          <header className="py-4 border-b border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {workspace.logoUrl ? (
                <img
                  src={workspace.logoUrl}
                  alt={workspace.brandName}
                  className="h-7 w-auto object-contain"
                />
              ) : (
                <span className="font-heading font-extrabold text-lg sm:text-xl text-[#f6f3ec] tracking-tight">
                  {workspace.brandName}
                  <span className="text-[#f5551d]">.</span>
                </span>
              )}
            </div>

            <Badge
              variant="outline"
              className="rounded-full px-3.5 py-1.5 text-xs font-mono border-white/15 bg-white/5 text-[#aeaeb4] gap-2 font-normal"
            >
              <Lock className="size-3 text-[#aeaeb4]" />
              <span>Private · expires in {daysRemaining} days</span>
            </Badge>
          </header>

          {/* 2. Hero Project Cover Banner */}
          <div className="relative rounded-3xl overflow-hidden border border-white/10 min-h-[380px] sm:min-h-[460px] flex items-end shadow-2xl group">
            {/* Project Cover Background */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
              style={{ backgroundImage: `url(${heroCoverUrl})` }}
            />
            {/* Dark Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-[#0a0a0b]/35" />

            {/* Inner Content */}
            <div className="relative z-10 p-6 sm:p-10 lg:p-12 w-full">
              <div className="text-xs sm:text-sm font-semibold text-[#f5551d] font-sans tracking-wide">
                Delivery for {clientName || "Prestige Rentals"}
              </div>

              <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl text-[#f6f3ec] uppercase tracking-tight leading-[1.02] mt-2">
                {delivery.title}
              </h1>

              {/* 4 Metadata statistics */}
              <div className="flex flex-wrap items-center gap-8 sm:gap-14 mt-6 pt-5 border-t border-white/15">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#aeaeb4]">
                    DELIVERED
                  </span>
                  <span className="font-heading font-bold text-sm sm:text-base text-[#f6f3ec]">
                    {formattedDate}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#aeaeb4]">
                    LOCATION
                  </span>
                  <span className="font-heading font-bold text-sm sm:text-base text-[#f6f3ec]">
                    {displayLocation}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#aeaeb4]">
                    TOTAL SIZE
                  </span>
                  <span className="font-heading font-bold text-sm sm:text-base text-[#f5551d]">
                    {formattedTotalSize}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#aeaeb4]">
                    ASSETS
                  </span>
                  <span className="font-heading font-bold text-sm sm:text-base text-[#f6f3ec]">
                    {displayAssetCount}
                  </span>
                </div>
              </div>

              {/* Download Button */}
              <div className="mt-6">
                <Button
                  onClick={handleDownloadAll}
                  disabled={!delivery.isDownloadAllowed}
                  className="rounded-full bg-gradient-to-r from-[#d9481d] to-[#802010] hover:from-[#f5551d] hover:to-[#992e10] text-white font-bold text-xs tracking-wider uppercase px-6 py-3 shadow-lg shadow-[#d9481d]/30 border border-[#f5551d]/40 transition-all duration-200 hover:scale-[1.02] cursor-pointer h-auto gap-2 disabled:opacity-50"
                >
                  <Download className="size-4" />
                  <span>DOWNLOAD ALL</span>
                </Button>
              </div>
            </div>
          </div>

          {/* 3. Approval Progress & Action Bar (.dbar) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#141416]/90 border border-white/10 rounded-2xl p-4 sm:px-6 backdrop-blur-xl shadow-xl">
            {/* Left: Progress Indicator */}
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="flex-1 sm:w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#f5551d] to-[#ff8a45] rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.round(
                      (approvedCount / (assets.length || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-xs sm:text-sm text-[#aeaeb4] font-sans whitespace-nowrap">
                {approvedCount} of {assets.length} assets approved
              </span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                onClick={handleMessageCreator}
                className="rounded-full bg-white/10 hover:bg-white/15 text-white border-white/15 font-bold text-xs tracking-wider uppercase px-5 py-2.5 transition-colors cursor-pointer h-auto gap-2"
              >
                <MessageCircle className="size-4" />
                <span>
                  MESSAGE {workspace.brandName.split(" ")[0].toUpperCase()}
                </span>
              </Button>

              {allApproved ? (
                <Button
                  variant="outline"
                  onClick={handleApproveAll}
                  disabled={isApprovingAll}
                  className="rounded-full bg-[#86b98f]/20 hover:bg-[#86b98f]/30 text-[#86b98f] border-[#86b98f]/40 font-bold text-xs tracking-wider uppercase px-5 py-2.5 transition-colors cursor-pointer h-auto gap-2"
                >
                  <Check className="size-4" />
                  <span>PROJECT APPROVED · UNDO</span>
                </Button>
              ) : (
                <Button
                  onClick={handleApproveAll}
                  disabled={isApprovingAll}
                  className="rounded-full bg-gradient-to-r from-[#d9481d] to-[#802010] hover:from-[#f5551d] hover:to-[#992e10] text-white font-bold text-xs tracking-wider uppercase px-6 py-2.5 shadow-md shadow-[#d9481d]/20 transition-all duration-200 hover:scale-[1.02] cursor-pointer h-auto gap-2"
                >
                  {isApprovingAll ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  <span>APPROVE ALL</span>
                </Button>
              )}
            </div>
          </div>

          {/* 4. Asset Library / Project Files (.dlib) */}
          <div className="space-y-5 pt-4">
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-semibold text-[#f5551d] font-sans tracking-wide">
                Asset library
              </div>
              <h2 className="font-heading font-black text-2xl sm:text-4xl text-[#f6f3ec] uppercase tracking-tight">
                PROJECT FILES
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex items-center bg-[#141416] border border-white/10 rounded-full p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setAssetTab("all")}
                className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  assetTab === "all"
                    ? "bg-white text-black shadow-md"
                    : "text-[#aeaeb4] hover:text-white"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setAssetTab("video")}
                className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  assetTab === "video"
                    ? "bg-white text-black shadow-md"
                    : "text-[#aeaeb4] hover:text-white"
                }`}
              >
                VIDEOS
              </button>
              <button
                type="button"
                onClick={() => setAssetTab("photo")}
                className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  assetTab === "photo"
                    ? "bg-white text-black shadow-md"
                    : "text-[#aeaeb4] hover:text-white"
                }`}
              >
                PHOTOS
              </button>
            </div>

            {/* 3-Column Asset Grid */}
            {filteredAssets.length === 0 ? (
              <div className="bg-[#111115] border border-white/10 rounded-3xl p-12 text-center space-y-4">
                <FileVideo className="w-12 h-12 text-[#f5551d] mx-auto opacity-70" />
                <div className="space-y-1">
                  <h4 className="font-heading font-bold text-lg text-white">
                    No Files in this Category
                  </h4>
                  <p className="text-xs text-[#aeaeb4] max-w-md mx-auto">
                    Switch tabs or check back once additional files have been processed.
                  </p>
                </div>
              </div>
            ) : (
              (() => {
                const app = delivery.appearance || {
                  cardSize: "M",
                  aspectRatioSetting: "masonry",
                  thumbnailScale: "Fill",
                  showCardInfo: true,
                  watermarkMedia: true,
                };
                const cardSize = app.cardSize || "M";
                const aspectRatioSetting = app.aspectRatioSetting || "masonry";
                const isMasonry = aspectRatioSetting === "masonry";
                const thumbnailScale = app.thumbnailScale || "Fill";
                const showCardInfo = app.showCardInfo ?? true;

                const containerClasses = isMasonry
                  ? `columns-1 ${
                      cardSize === "S"
                        ? "sm:columns-2 md:columns-3 lg:columns-4"
                        : cardSize === "L"
                        ? "sm:columns-1 md:columns-2"
                        : "sm:columns-2 md:columns-3"
                    } gap-5 space-y-5 pt-1`
                  : `grid grid-cols-1 ${
                      cardSize === "S"
                        ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                        : cardSize === "L"
                        ? "sm:grid-cols-1 md:grid-cols-2"
                        : "sm:grid-cols-2 lg:grid-cols-3"
                    } gap-5 pt-1`;

                const numericRatio =
                  aspectRatioSetting === "16:9"
                    ? 16 / 9
                    : aspectRatioSetting === "1:1"
                    ? 1
                    : aspectRatioSetting === "9:16"
                    ? 9 / 16
                    : 16 / 10;

                return (
                  <div className={containerClasses}>
                    {filteredAssets.map((asset) => {
                      const ver = asset.activeVersion || asset.versions[0] || null;
                      const isPhoto =
                        asset.type === "photo_gallery" ||
                        asset.type === "image" ||
                        asset.type === "photo" ||
                        asset.type === "still";
                      const poster =
                        resolveThumbnailUrl(ver?.thumbnailUrl, ver?.rawFileUrl, isPhoto) ||
                        "/images/projects/mercedes-amg-gt/1.webp";

                      const durationSec = ver?.durationSeconds ? Math.round(ver.durationSeconds) : null;
                      const durationLabel = isPhoto
                        ? null
                        : durationSec
                        ? `${Math.floor(durationSec / 60)
                            .toString()
                            .padStart(1, "0")}:${(durationSec % 60).toString().padStart(2, "0")}`
                        : "VIDEO";

                      const isWatermarkedSetting = app.watermarkMedia ?? delivery.isWatermarked ?? true;
                      const showWatermarkOnAsset = isWatermarkedSetting && !asset.isApproved;

                      const mediaBadges = (
                        <>
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors" />

                          {/* Watermark overlay on thumbnail cards */}
                          {showWatermarkOnAsset && (
                            <WatermarkOverlay
                              text={workspace?.brandName || "STUDIO PREVIEW"}
                              variant="card"
                            />
                          )}

                          {/* Top-Left: Type Icon Badge */}
                          <div className="absolute top-3 left-3 size-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white shadow-md z-10">
                            {isPhoto ? (
                              <ImageIcon className="size-3.5" />
                            ) : (
                              <Play className="size-3.5 fill-white" />
                            )}
                          </div>

                          {/* Top-Right: Approved Badge */}
                          {asset.isApproved && (
                            <div className="absolute top-3 right-3 size-6 rounded-full bg-[#86b98f] flex items-center justify-center text-black shadow-md font-bold z-10">
                              <Check className="size-3.5 stroke-[3]" />
                            </div>
                          )}

                          {/* Bottom-Right: Duration timecode (videos only) */}
                          {!isPhoto && durationLabel && (
                            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-mono font-semibold text-white border border-white/10 z-10">
                              {durationLabel}
                            </div>
                          )}
                        </>
                      );

                      return (
                        <div
                          key={asset.id}
                          onClick={() => openAssetModal(asset)}
                          onContextMenu={(e) => {
                            if (showWatermarkOnAsset) e.preventDefault();
                          }}
                          className={`group relative rounded-2xl overflow-hidden border border-white/10 bg-[#141416] cursor-pointer hover:border-white/30 transition-all duration-300 shadow-xl hover:-translate-y-1 ${
                            isMasonry ? "break-inside-avoid mb-5" : ""
                          }`}
                        >
                          {isMasonry ? (
                            <DeliveryRoomMasonryMedia
                              src={poster}
                              alt={asset.title}
                              type={isPhoto ? "photo" : "video"}
                              thumbnailScale={thumbnailScale}
                            >
                              {mediaBadges}
                            </DeliveryRoomMasonryMedia>
                          ) : (
                            <AspectRatio ratio={numericRatio} className="w-full relative overflow-hidden bg-black/40">
                              <AppImage
                                src={poster}
                                alt={asset.title}
                                fill
                                containerClassName="absolute inset-0 w-full h-full"
                                fallbackIcon={isPhoto ? "image" : "film"}
                                className={`w-full h-full ${
                                  thumbnailScale === "Fit" ? "object-contain bg-black" : "object-cover"
                                } group-hover:scale-105 transition-transform duration-500`}
                              />
                              {mediaBadges}
                            </AspectRatio>
                          )}

                          {showCardInfo && (
                            <div className="p-3.5 border-t border-white/10 flex items-center justify-between gap-2 bg-[#141416]">
                              <span className="text-xs font-semibold text-white truncate">
                                {asset.title}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] shrink-0 font-medium ${
                                    asset.isApproved
                                      ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                      : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                                  }`}
                                >
                                  {asset.isApproved ? "Approved" : "In Review"}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={!delivery.isDownloadAllowed}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const activeVer = asset.activeVersion || asset.versions[0];
                                    const dlUrl = activeVer?.downloadUrl || activeVer?.rawFileUrl;
                                    if (dlUrl) {
                                      const filename = getDownloadFilename(
                                        asset.title,
                                        activeVer?.versionNumber,
                                        dlUrl,
                                        asset.type
                                      );
                                      triggerDirectDownload(dlUrl, filename);
                                      toast.success(`Started download for ${asset.title}`);
                                    }
                                  }}
                                  className="size-6 rounded-md text-[#aeaeb4] hover:text-white hover:bg-white/10 transition-colors p-0 cursor-pointer disabled:opacity-30"
                                  title={delivery.isDownloadAllowed ? `Download ${asset.title}` : "Downloads locked"}
                                >
                                  <Download className="size-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>

          {/* 5. Studio Branding Footer */}
          <footer className="border-t border-white/10 mt-16 sm:mt-24 py-8 flex items-center justify-between text-xs text-[#aeaeb4] font-mono">
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-base tracking-tight text-white">
                <span className="text-[#f5551d]">Cine</span>Space
              </span>
            </div>
            <div className="text-white/40 hover:text-white/70 transition-colors">
              cinespace.pro
            </div>
          </footer>
        </div>

      {/* 📹 3. INTERACTIVE VIDEO REVIEW LIGHTBOX MODAL */}
      {activeAsset && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#111115] rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[96vh] sm:max-h-[92vh] overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6 text-[#f6f3ec] shadow-2xl relative border border-white/15">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <FileVideo className="size-5 sm:size-6 text-[#f5551d] shrink-0" />
                <div className="min-w-0">
                  <TypographyH3 className="font-display font-bold text-base sm:text-lg text-[#f6f3ec] truncate">
                    {activeAsset.title}
                  </TypographyH3>
                  <TypographyMuted className="text-[11px] sm:text-xs text-[#aeaeb4] font-mono truncate">
                    Aspect: {activeAsset.aspectRatio || "16:9"} · {activeFeedback.length} timecoded notes
                  </TypographyMuted>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!delivery.isDownloadAllowed}
                        onClick={() => {
                          if (!delivery.isDownloadAllowed) {
                            toast.error("Downloads are currently locked by the creator pending sign-off.");
                            return;
                          }
                          const dlUrl = activeVersion?.downloadUrl || activeVersion?.rawFileUrl;
                          if (!dlUrl) {
                            toast.error("No download file attached for this version.");
                            return;
                          }
                          const filename = getDownloadFilename(
                            activeAsset.title,
                            activeVersion?.versionNumber,
                            dlUrl,
                            activeAsset.type
                          );
                          triggerDirectDownload(dlUrl, filename);
                          toast.success(`Downloading ${activeAsset.title} (V${activeVersion?.versionNumber || 1})`);
                        }}
                        className="rounded-full border-white/20 text-white bg-white/10 hover:bg-white/20 text-xs font-bold px-3 py-1.5 cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <Download className="size-3.5 text-[#f5551d]" />
                        <span className="hidden sm:inline">Download Cut</span>
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {!delivery.isDownloadAllowed
                      ? "Downloads locked by creator"
                      : `Download ${activeAsset.title} V${activeVersion?.versionNumber || 1}`}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveAssetId(null)}
                        className="size-9 rounded-full bg-white/10 text-[#aeaeb4] hover:text-[#f6f3ec] hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      >
                        <X className="size-5" />
                      </Button>
                    }
                  />
                  <TooltipContent>Close preview (Esc)</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Video Player Stage & Comment Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              {/* Player Column */}
              <div className="lg:col-span-7 space-y-3 sm:space-y-4">
                {(() => {
                  const isStill =
                    activeAsset.type === "photo_gallery" ||
                    activeAsset.type === "image" ||
                    activeAsset.type === "still" ||
                    activeAsset.type === "photo";

                  const isWatermarkedSetting =
                    delivery.appearance?.watermarkMedia ?? delivery.isWatermarked ?? true;
                  const showWatermarkOnAsset = isWatermarkedSetting && !activeAsset.isApproved;

                  return activeVersion ? (
                    <CutReviewPlayer
                      ref={cutPlayerRef}
                      isPhoto={isStill}
                      src={
                        isStill
                          ? resolveMediaUrl(activeVersion.rawFileUrl || activeVersion.thumbnailUrl) || "/images/hero.jpg"
                          : resolveMediaUrl(activeVersion.hlsManifestUrl) ||
                            resolveMediaUrl(activeVersion.rawFileUrl) ||
                            "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"
                      }
                      title={activeAsset.title}
                      poster={resolveThumbnailUrl(activeVersion.thumbnailUrl, activeVersion.rawFileUrl, isStill) || "/images/hero.jpg"}
                      aspectRatio={activeAsset.aspectRatio || "16:9"}
                      fps={24}
                      showWatermark={showWatermarkOnAsset}
                      watermarkText={workspace?.brandName || "STUDIO PREVIEW"}
                      comments={activeFeedback.map((c) => ({
                        id: c.id,
                        timestampSeconds: isStill ? null : (c.timestampSeconds ?? 0),
                        authorName: c.authorName,
                        commentText: c.commentText,
                        isResolved: c.isResolved,
                      }))}
                      activeCommentId={activeCommentId}
                      onCommentSelect={(commentId, timestamp) => {
                        if (!isStill) {
                          setActiveCommentId(commentId);
                          cutPlayerRef.current?.seekTo(timestamp);
                        }
                      }}
                      onTimeChange={(time, tc) => {
                        if (!isStill) {
                          setCurrentPlayheadTime(time);
                          setCurrentPlayheadTc(tc);
                        }
                      }}
                    />
                  ) : (
                    <div className="aspect-video bg-black/50 border border-white/10 rounded-2xl flex items-center justify-center text-xs text-[#aeaeb4]">
                      No media version available
                    </div>
                  );
                })()}

                {/* Version Selector Bar */}
                {activeAsset.versions && activeAsset.versions.length > 0 && (
                  <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2">
                      <Layers className="size-3.5 text-[#f5551d]" />
                      <span className="text-xs font-mono text-[#aeaeb4]">
                        Version:
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {activeAsset.versions.map((v) => {
                        const isSelected = activeVersion?.id === v.id;
                        return (
                          <Button
                            key={v.id}
                            type="button"
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => setSelectedVersionId(v.id)}
                            className={`px-3 py-1.5 h-7 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? "bg-[#f5551d] text-black hover:bg-[#e0440d] shadow-md border-transparent"
                                : "bg-white/5 border-white/10 text-[#aeaeb4] hover:text-[#f6f3ec] hover:bg-white/10"
                            }`}
                          >
                            <span>V{v.versionNumber}</span>
                            {v.isActiveVersion && (
                              <span className="text-[9px] opacity-75">★</span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamped Comment Drawer */}
              {(() => {
                const isStill =
                  activeAsset.type === "photo_gallery" ||
                  activeAsset.type === "image" ||
                  activeAsset.type === "still" ||
                  activeAsset.type === "photo";

                return (
                  <div className="lg:col-span-5 bg-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[360px] sm:min-h-[420px] lg:h-[480px] border border-white/10">
                    <div className="space-y-3 sm:space-y-4 overflow-hidden flex flex-col h-full">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                        <TypographyH4 className="font-display font-bold text-sm text-[#f6f3ec] flex items-center gap-2">
                          <MessageCircle className={`size-4 ${isStill ? "text-emerald-400" : "text-[#f5551d]"}`} />
                          Notes ({activeFeedback.length})
                        </TypographyH4>
                        {isStill ? (
                          <Badge variant="sage" className="text-[10px] font-mono font-bold">
                            Still Photography
                          </Badge>
                        ) : (
                          <Badge variant="orange" className="text-[10px] font-mono">
                            Playhead: {currentPlayheadTc}
                          </Badge>
                        )}
                      </div>

                      {/* Comments Feed */}
                      <div className="space-y-2.5 sm:space-y-3 overflow-y-auto pr-1 flex-1">
                        {activeFeedback.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs text-[#aeaeb4] space-y-1">
                            <p>No comments on this {isStill ? "still" : "version"} yet.</p>
                            <p className="text-[11px] text-[#71717a]">
                              {isStill
                                ? "Leave feedback or revision notes for this photo still below."
                                : "Pause at any frame and type your feedback below."}
                            </p>
                          </div>
                        ) : (
                          activeFeedback.map((c) => {
                            const isSelected = activeCommentId === c.id;
                            const commentTime = c.timestampSeconds;
                            const hasTimestamp = !isStill && commentTime !== null && commentTime !== undefined;
                            const tcDisplay = hasTimestamp ? formatTimecode(commentTime, 24) : null;

                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  if (hasTimestamp) {
                                    cutPlayerRef.current?.seekTo(commentTime);
                                    setActiveCommentId(c.id);
                                  }
                                }}
                                className={`p-3 rounded-xl text-xs space-y-1.5 transition-all border ${
                                  hasTimestamp ? "cursor-pointer" : ""
                                } ${
                                  isSelected
                                    ? "bg-[#f5551d]/20 border-[#f5551d] text-[#f6f3ec] ring-1 ring-[#f5551d]"
                                    : c.isResolved
                                    ? "bg-white/5 border-white/5 text-[#71717a] opacity-75"
                                    : "bg-[#18181c] border-white/10 text-[#f6f3ec] hover:border-white/20"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[10px] text-[#aeaeb4] font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="size-5 text-[9px] shrink-0">
                                      <AvatarFallback className="text-[9px] bg-white/10 text-white font-mono">
                                        {c.authorName ? c.authorName.slice(0, 2).toUpperCase() : "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold text-white">{c.authorName}</span>
                                  </div>
                                  {hasTimestamp ? (
                                    <Badge variant="orange" className="text-[10px] font-mono font-bold py-0 h-4">
                                      {tcDisplay}
                                    </Badge>
                                  ) : (
                                    <Badge variant="sage" className="text-[9px] font-mono py-0 h-4">
                                      Still Note
                                    </Badge>
                                  )}
                                </div>
                                <p className="leading-snug text-xs">{c.commentText}</p>
                                <div className="flex items-center justify-end pt-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleResolve(c.id, c.isResolved);
                                    }}
                                    className={`h-6 text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                      c.isResolved
                                        ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                                        : "text-[#aeaeb4] hover:text-white hover:bg-white/10"
                                    }`}
                                  >
                                    {c.isResolved ? "✓ Resolved" : "Mark resolved"}
                                  </Button>
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
                          <div className="flex items-center gap-1.5">
                            <span>As:</span>
                            <Input
                              type="text"
                              value={commentAuthor}
                              onChange={(e) => setCommentAuthor(e.target.value)}
                              placeholder="Your Name"
                              className="h-6 w-28 bg-transparent text-white font-semibold underline underline-offset-2 border-none p-0 text-xs focus-visible:ring-0 focus-visible:underline"
                            />
                          </div>
                          {isStill ? (
                            <Badge variant="sage" className="text-[9px] font-mono font-bold py-0 h-4">
                              Still Note
                            </Badge>
                          ) : (
                            <Badge variant="orange" className="text-[10px] font-mono font-bold py-0 h-4">
                              {currentPlayheadTc}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder={
                              isStill
                                ? "Add feedback note on this still..."
                                : `Leave note at ${currentPlayheadTc}...`
                            }
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            disabled={isSubmittingComment}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus-visible:ring-1 focus-visible:ring-[#f5551d] focus-visible:border-[#f5551d] text-white placeholder:text-neutral-500 min-h-[44px]"
                          />
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="submit"
                                  disabled={isSubmittingComment || !commentText.trim()}
                                  className="bg-[#f5551d] hover:bg-[#ff8a45] disabled:opacity-40 text-black font-bold px-4 rounded-xl text-xs h-[44px] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                >
                                  {isSubmittingComment ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Send className="size-4" />
                                  )}
                                </Button>
                              }
                            />
                            <TooltipContent>Post timecoded note</TooltipContent>
                          </Tooltip>
                        </div>
                      </form>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 📦 Master Deliverables Package Modal */}
      <DownloadPackageModal
        isOpen={showDownloadModal}
        onOpenChange={setShowDownloadModal}
        projectTitle={delivery.title}
        isDownloadAllowed={delivery.isDownloadAllowed}
        brandName={workspace?.brandName}
        items={assets.map((a) => {
          const activeVer = a.activeVersion || a.versions[0];
          const isPhoto =
            a.type === "photo" ||
            a.type === "photo_gallery" ||
            a.type === "still";
          let durationStr: string | null = null;
          if (!isPhoto && activeVer?.durationSeconds) {
            const mins = Math.floor(activeVer.durationSeconds / 60);
            const secs = Math.round(activeVer.durationSeconds % 60);
            durationStr = `${mins.toString().padStart(2, "0")}:${secs
              .toString()
              .padStart(2, "0")}`;
          }
          return {
            id: a.id,
            title: a.title,
            type: a.type,
            versionNumber: activeVer?.versionNumber || 1,
            fileSizeBytes: activeVer?.fileSizeBytes,
            duration: durationStr,
            aspectRatio: a.aspectRatio,
            thumbnailUrl: resolveThumbnailUrl(
              activeVer?.thumbnailUrl,
              activeVer?.rawFileUrl,
              isPhoto
            ),
            downloadUrl: resolveMediaUrl(
              activeVer?.downloadUrl || activeVer?.rawFileUrl
            ),
            isApproved: a.isApproved,
          };
        })}
      />
      </div>
    </div>
    </TooltipProvider>
    </AccentThemeProvider>
  );
}

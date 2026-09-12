"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Play,
  Send,
  MessageCircle,
  Check,
  Lock,
  Copy,
  ExternalLink,
  Share2,
  Pencil,
  Plus,
  Video,
  ImageIcon,
  Grid,
  RectangleHorizontal,
  RectangleVertical,
  Square,
  CheckCircle2,
  Sparkles,
  X,
  FileVideo,
  UploadCloud,
  Trash2,
  ShieldCheck,
  KeyRound,
  Download,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VideoUploader } from "@/components/workspaces/video-uploader";
import { addFeedbackAction } from "@/app/actions/feedback";
import {
  approveCutAction,
  updateDeliveryDetailsAction,
  archiveDeliveryAction,
  toggleAssetApprovalAction,
  publishDeliveryToPortfolioAction,
} from "@/app/actions/deliveries";
import { CutReviewPlayer, type CutReviewPlayerRef } from "@/components/video/cut-review-player";
import { formatTimecode } from "@/lib/timecode";

export interface AssetVersionItem {
  id: string;
  versionNumber: number;
  rawFileUrl: string;
  hlsManifestUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  fileSizeBytes: number;
  transcodingStatus: string;
  isActiveVersion: boolean;
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  authorName: string;
  commentText: string;
  timestampSeconds?: number | null;
  createdAt: string;
  isResolved?: boolean;
}

export interface DeliveryDetailClientProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  portfolio?: {
    id: string;
    slug: string;
    title: string;
  } | null;
  project: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    shareToken: string;
    isDownloadAllowed: boolean;
    passcodeProtected: boolean;
    clientName: string;
    createdAt: string;
    updatedAt: string;
  };
  assets: Array<{
    id: string;
    title: string;
    type: string;
    aspectRatio?: string;
    isApproved?: boolean;
    versions: AssetVersionItem[];
    activeVersion?: AssetVersionItem | null;
  }>;
  initialFeedback: FeedbackItem[];
}

// Demo assets matching the Boxing Event visual gallery in user reference photos
const INITIAL_DEMO_GALLERY_ITEMS = [
  {
    id: "g1",
    title: "Championship Bout — Opening Bell",
    type: "video",
    aspectRatio: "16:9",
    duration: "00:47",
    src: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80",
    videoUrl: "https://files.vidstack.io/sprite-fight/hls/stream.m3u8",
    status: "review",
  },
  {
    id: "g2",
    title: "Corner Walkout — Fighter Prep",
    type: "photo",
    aspectRatio: "9:16",
    duration: "STILL",
    src: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
    status: "review",
  },
  {
    id: "g3",
    title: "Ring Entrance — High Energy",
    type: "photo",
    aspectRatio: "16:9",
    duration: "STILL",
    src: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1200&auto=format&fit=crop&q=80",
    status: "review",
  },
  {
    id: "g4",
    title: "Fighter Spotlight Pose",
    type: "photo",
    aspectRatio: "9:16",
    duration: "STILL",
    src: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&auto=format&fit=crop&q=80",
    status: "review",
  },
  {
    id: "g5",
    title: "Cultural Ring Dancer Performance",
    type: "photo",
    aspectRatio: "9:16",
    duration: "STILL",
    src: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80",
    status: "review",
  },
  {
    id: "g6",
    title: "Mid-Round Exchange Action",
    type: "video",
    aspectRatio: "16:9",
    duration: "01:12",
    src: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80",
    videoUrl: "https://files.vidstack.io/sprite-fight/hls/stream.m3u8",
    status: "review",
  },
  {
    id: "g7",
    title: "Championship Belt Trophy Close-up",
    type: "photo",
    aspectRatio: "16:9",
    duration: "STILL",
    src: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&auto=format&fit=crop&q=80",
    status: "review",
  },
  {
    id: "g8",
    title: "Corner Stance Portrait",
    type: "photo",
    aspectRatio: "9:16",
    duration: "STILL",
    src: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&auto=format&fit=crop&q=80",
    status: "review",
  },
  {
    id: "g9",
    title: "Ringside Referee Instruction",
    type: "photo",
    aspectRatio: "16:9",
    duration: "STILL",
    src: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1200&auto=format&fit=crop&q=80",
    status: "review",
  },
  {
    id: "g10",
    title: "Victory Celebration & Belt Lift",
    type: "video",
    aspectRatio: "16:9",
    duration: "00:30",
    src: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1200&auto=format&fit=crop&q=80",
    videoUrl: "https://files.vidstack.io/sprite-fight/hls/stream.m3u8",
    status: "review",
  },
];

export function DeliveryDetailClient({
  workspace,
  portfolio,
  project,
  assets,
  initialFeedback,
}: DeliveryDetailClientProps) {
  const [isPending, startTransition] = useTransition();

  // Dialog States
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishCategory, setPublishCategory] = useState("Commercial");
  const [isPublishing, setIsPublishing] = useState(false);

  // Uploader & Toast State
  const [showUploader, setShowUploader] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Floating Upload Component State (Image 3)
  const [showAssetAddedBadge, setShowAssetAddedBadge] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{
    fileName: string;
    fileSize: string;
    fileIndex: number;
    totalFiles: number;
    percentage: number;
  } | null>({
    fileName: "rolling_wide_v3.mov",
    fileSize: "312 MB",
    fileIndex: 1,
    totalFiles: 3,
    percentage: 70,
  });

  // Share Dialog Controls State (Image 1)
  const [sharePassphrase, setSharePassphrase] = useState(false);
  const [shareComments, setShareComments] = useState(true);
  const [shareDownloads, setShareDownloads] = useState(false);
  const [shareExpires, setShareExpires] = useState<"24 hours" | "7 days" | "30 days" | "Never">("24 hours");
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyDownloads, setNotifyDownloads] = useState(true);

  // Gallery items initialized from real delivery assets or demo fallbacks
  const initialItems =
    assets && assets.length > 0
      ? assets.map((a) => {
          const activeVer = a.activeVersion || a.versions[0];
          const isPhoto = a.type === "still" || a.type === "photo";
          let durationStr = "STILL";
          if (!isPhoto) {
            if (activeVer?.durationSeconds) {
              const mins = Math.floor(activeVer.durationSeconds / 60);
              const secs = Math.round(activeVer.durationSeconds % 60);
              durationStr = `${mins.toString().padStart(2, "0")}:${secs
                .toString()
                .padStart(2, "0")}`;
            } else {
              durationStr = "00:45";
            }
          }
          return {
            id: a.id,
            versionId: activeVer?.id,
            title: a.title,
            type: isPhoto ? "photo" : "video",
            aspectRatio: a.aspectRatio || "16:9",
            duration: durationStr,
            src:
              activeVer?.thumbnailUrl ||
              activeVer?.rawFileUrl ||
              "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80",
            status: a.isApproved ? "approved" : "review",
            rawUrl: activeVer?.rawFileUrl,
            hlsUrl: activeVer?.hlsManifestUrl,
            videoUrl:
              activeVer?.hlsManifestUrl ||
              activeVer?.rawFileUrl ||
              (isPhoto ? undefined : "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"),
          };
        })
      : INITIAL_DEMO_GALLERY_ITEMS;

  const [galleryItems, setGalleryItems] = useState(initialItems);
  const [coverThumbnailUrl, setCoverThumbnailUrl] = useState(
    galleryItems[0]?.src ||
      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80"
  );

  // Editable Project Details State (Image 2)
  const [projectTitle, setProjectTitle] = useState(project.title || "Boxing Event");
  const [clientName, setClientName] = useState(project.clientName || "Boxing Event");
  const [projectDescription, setProjectDescription] = useState(
    project.description ||
      "A cinematic boxing project featuring films and stills captured across the event."
  );
  const [projectStatus, setProjectStatus] = useState(project.status || "draft");
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Appearance Settings State (Image 1)
  const [cardSize, setCardSize] = useState<"S" | "M" | "L">("M");
  const [aspectRatioSetting, setAspectRatioSetting] = useState<"masonry" | "16:9" | "1:1" | "9:16">("masonry");
  const [thumbnailScale, setThumbnailScale] = useState<"Fit" | "Fill">("Fill");
  const [showCardInfo, setShowCardInfo] = useState(true);
  const [watermarkMedia, setWatermarkMedia] = useState(true);

  // Gallery Filters & Active Item Lightbox Modal
  const [filterTab, setFilterTab] = useState<"ALL" | "VIDEOS" | "PHOTOS">("ALL");
  const [activeItem, setActiveItem] = useState<any | null>(null);

  // Feedback / Comments
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(initialFeedback);
  const [replyText, setReplyText] = useState("");
  const cutPlayerRef = useRef<CutReviewPlayerRef | null>(null);
  const [currentCutTime, setCurrentCutTime] = useState(0);
  const [currentCutTimecode, setCurrentCutTimecode] = useState("00:00:00");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  const projectDetailsRef = useRef<HTMLDivElement | null>(null);

  const shareUrl = `/deliver/${project.shareToken}`;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${shareUrl}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    triggerToast("Review link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProjectDetails = async () => {
    setIsSavingDetails(true);
    const res = await updateDeliveryDetailsAction(project.id, {
      title: projectTitle,
      clientName: clientName,
      description: projectDescription,
    });
    setIsSavingDetails(false);

    if (res.success) {
      setIsEditDialogOpen(false);
      triggerToast("Delivery details updated successfully");
    } else {
      triggerToast(res.error || "Failed to update delivery details");
    }
  };

  const handleArchive = async () => {
    if (confirm("Are you sure you want to archive this delivery to the Silo?")) {
      const res = await archiveDeliveryAction(project.id);
      if (res.success) {
        setProjectStatus("archived");
        triggerToast("Delivery archived to Silo");
      } else {
        triggerToast(res.error || "Failed to archive delivery");
      }
    }
  };

  const handleToggleAssetApproval = async (itemId: string, currentStatus: string) => {
    const newIsApproved = currentStatus !== "approved";
    const res = await toggleAssetApprovalAction(project.id, itemId, newIsApproved);
    if (res.success) {
      setGalleryItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: newIsApproved ? "approved" : "review" }
            : item
        )
      );
      if (activeItem && activeItem.id === itemId) {
        setActiveItem((prev: any) =>
          prev ? { ...prev, status: newIsApproved ? "approved" : "review" } : null
        );
      }
      triggerToast(newIsApproved ? "Asset approved" : "Asset marked for revision");
    } else {
      triggerToast(res.error || "Failed to toggle asset approval");
    }
  };

  const handleApproveCut = async () => {
    const res = await approveCutAction(project.id, workspace.brandName || "Filmmaker");
    if (res.success) {
      setProjectStatus("approved");
      setGalleryItems((prev) =>
        prev.map((item) => ({ ...item, status: "approved" }))
      );
      triggerToast("Delivery room marked as APPROVED");
    } else {
      triggerToast(res.error || "Failed to approve cut");
    }
  };

  const handlePublishToPortfolio = async () => {
    if (!portfolio?.id) {
      triggerToast("No portfolio found for this workspace");
      return;
    }
    setIsPublishing(true);
    const res = await publishDeliveryToPortfolioAction(project.id, portfolio.id, {
      title: projectTitle,
      description: projectDescription,
      category: publishCategory,
    });
    setIsPublishing(false);

    if (res.success) {
      setIsPublishDialogOpen(false);
      triggerToast("✨ Published cut to your public Portfolio!");
    } else {
      triggerToast(res.error || "Failed to publish to portfolio");
    }
  };

  const handleDeleteItemFromGallery = (itemId: string) => {
    setGalleryItems((prev) => prev.filter((item) => item.id !== itemId));
    triggerToast("Asset removed from delivery");
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newCommentText = replyText.trim();
    setReplyText("");

    const capturedTime = cutPlayerRef.current?.getCurrentTime() ?? currentCutTime;
    const roundedTime = Math.round(capturedTime * 100) / 100;

    const tempFeedback: FeedbackItem = {
      id: `temp_${Date.now()}`,
      authorName: workspace.brandName || "Filmmaker",
      commentText: newCommentText,
      timestampSeconds: roundedTime,
      createdAt: new Date().toISOString(),
    };

    setFeedbackList((prev) => [...prev, tempFeedback]);
    setActiveCommentId(tempFeedback.id);
    triggerToast(`Note tagged at [${formatTimecode(roundedTime, 24)}]`);

    if (activeItem?.versionId) {
      addFeedbackAction({
        assetVersionId: activeItem.versionId,
        authorName: workspace.brandName || "Filmmaker",
        commentText: newCommentText,
        timestampSeconds: roundedTime,
      }).catch((err) => console.error("Error saving feedback note:", err));
    }
  };

  const scrollToProjectDetails = () => {
    if (projectDetailsRef.current) {
      projectDetailsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const filteredGalleryItems = galleryItems.filter((item) => {
    if (filterTab === "VIDEOS") return item.type === "video";
    if (filterTab === "PHOTOS") return item.type === "photo";
    return true;
  });

  const totalAssetsCount = galleryItems.length;
  const approvedCount =
    projectStatus === "approved"
      ? totalAssetsCount
      : galleryItems.filter((item) => item.status === "approved").length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200 text-foreground selection:bg-[#f5551d] selection:text-black">
      {/* 1. Header Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${workspace.slug}/deliveries`}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span>Projects</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span>Share Token:</span>
          <span className="bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
            {project.shareToken}
          </span>
        </div>
      </div>

      {/* 2. Main Hero Banner Container (Matching Image 1 & Image 3) */}
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
              onClick={() => setIsShareDialogOpen(true)}
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
              onClick={() => setIsEditDialogOpen(true)}
              variant="outline"
              className="rounded-full border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10 text-white font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer flex items-center gap-2"
            >
              <Pencil className="size-3.5" />
              <span>EDIT DELIVERY</span>
            </Button>

            {/* ARCHIVE TO THE SILO Button */}
            <Button
              onClick={handleArchive}
              variant="outline"
              className="rounded-full border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10 text-white font-extrabold text-xs px-5 py-2.5 transition-all cursor-pointer flex items-center gap-2"
            >
              <Lock className="size-3.5 text-muted-foreground" />
              <span>ARCHIVE TO THE SILO</span>
            </Button>

            {/* PUBLISH TO PORTFOLIO Button */}
            <Button
              onClick={() => setIsPublishDialogOpen(true)}
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

      {/* 3. Client Approval Progress Bar Container */}
      <div className="rounded-2xl bg-[#121215] border border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        {/* Progress Info & Bar */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>
              {approvedCount} of {totalAssetsCount} approved by client
            </span>
            <span>{totalAssetsCount > 0 ? Math.round((approvedCount / totalAssetsCount) * 100) : 0}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#f5551d] to-[#ff8a45] transition-all duration-500 rounded-full"
              style={{
                width: `${totalAssetsCount > 0 ? (approvedCount / totalAssetsCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          {/* MARK APPROVED / APPROVE CUT Button */}
          {projectStatus !== "approved" && (
            <Button
              onClick={handleApproveCut}
              variant="outline"
              className="rounded-full border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-extrabold text-xs px-4 py-2.5 shadow-md cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <Check className="size-4" />
              <span>APPROVE CUT</span>
            </Button>
          )}

          {/* UPLOAD ASSET Button */}
          <Button
            onClick={() => {
              setShowUploader(!showUploader);
            }}
            className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs px-5 py-2.5 shadow-md shrink-0 cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <Plus className="size-4" />
            <span>UPLOAD ASSET</span>
          </Button>
        </div>
      </div>

      {/* Direct Cloudflare Video Uploader Area */}
      {showUploader && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-200">
          <VideoUploader
            workspaceId={workspace.id}
            projectId={project.id}
            onUploadComplete={() => {
              setShowUploader(false);
              triggerToast("Asset uploaded successfully");
            }}
          />
        </div>
      )}

      {/* 4. Appearance Settings Card */}
      <div className="rounded-2xl bg-[#121215] border border-white/10 p-6 space-y-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5 text-white font-heading font-bold text-base">
            <Pencil className="size-4 text-[#f5551d]" />
            <span>Appearance</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Lock className="size-3.5" />
            <span>How your client sees this gallery</span>
          </div>
        </div>

        <div className="space-y-4 text-xs font-medium">
          {/* Card size row */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-muted-foreground font-sans">Card size</span>
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
              {(["S", "M", "L"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setCardSize(size)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    cardSize === size
                      ? "bg-[#f5551d] text-black"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio row */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-muted-foreground font-sans">Aspect ratio</span>
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setAspectRatioSetting("16:9")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  aspectRatioSetting === "16:9"
                    ? "bg-[#f5551d] text-black"
                    : "text-muted-foreground hover:text-white"
                }`}
                title="16:9 Landscape"
              >
                <RectangleHorizontal className="size-4" />
              </button>
              <button
                onClick={() => setAspectRatioSetting("1:1")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  aspectRatioSetting === "1:1"
                    ? "bg-[#f5551d] text-black"
                    : "text-muted-foreground hover:text-white"
                }`}
                title="1:1 Square"
              >
                <Square className="size-4" />
              </button>
              <button
                onClick={() => setAspectRatioSetting("9:16")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  aspectRatioSetting === "9:16"
                    ? "bg-[#f5551d] text-black"
                    : "text-muted-foreground hover:text-white"
                }`}
                title="9:16 Vertical"
              >
                <RectangleVertical className="size-4" />
              </button>
              <button
                onClick={() => setAspectRatioSetting("masonry")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  aspectRatioSetting === "masonry"
                    ? "bg-[#f5551d] text-black"
                    : "text-muted-foreground hover:text-white"
                }`}
                title="Masonry Grid"
              >
                <Grid className="size-4" />
              </button>
            </div>
          </div>

          {/* Thumbnail scale row */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-muted-foreground font-sans">Thumbnail scale</span>
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
              {(["Fit", "Fill"] as const).map((scale) => (
                <button
                  key={scale}
                  onClick={() => setThumbnailScale(scale)}
                  className={`px-3.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    thumbnailScale === scale
                      ? "bg-[#f5551d] text-black"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>

          {/* Show card info row */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-muted-foreground font-sans">Show card info</span>
            <button
              onClick={() => setShowCardInfo(!showCardInfo)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                showCardInfo ? "bg-[#f5551d]" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                  showCardInfo ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Watermark media PRO row */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-sans">Watermark media</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#f5551d]/20 text-[#f5551d] border border-[#f5551d]/30">
                PRO
              </span>
            </div>
            <button
              onClick={() => setWatermarkMedia(!watermarkMedia)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                watermarkMedia ? "bg-[#f5551d]" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                  watermarkMedia ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Deliverables & PROJECT ASSETS Gallery */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#f5551d] uppercase tracking-widest block">
              Deliverables
            </span>
            <h2 className="text-3xl font-black font-heading tracking-tight text-white uppercase">
              PROJECT ASSETS
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-[#121215] p-1.5 rounded-full border border-white/10">
              {(["ALL", "VIDEOS", "PHOTOS"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    filterTab === tab
                      ? "bg-white text-black shadow-md"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Floating ✓ Asset added pill badge (Matching Image 3) */}
            {showAssetAddedBadge && (
              <div className="flex items-center gap-1.5 bg-white text-black px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg animate-in fade-in duration-200">
                <Check className="size-3.5 stroke-[3]" />
                <span>Asset added</span>
              </div>
            )}
          </div>
        </div>

        {/* Masonry / Responsive Asset Grid */}
        <div
          className={`columns-1 ${
            cardSize === "S"
              ? "sm:columns-2 md:columns-4"
              : cardSize === "L"
              ? "sm:columns-1 md:columns-2"
              : "sm:columns-2 md:columns-3"
          } gap-4 space-y-4`}
        >
          {filteredGalleryItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveItem(item)}
              className="break-inside-avoid rounded-2xl bg-[#121215] border border-white/10 overflow-hidden group hover:border-[#f5551d]/50 transition-all duration-300 cursor-pointer relative shadow-lg"
            >
              <div
                className={`relative overflow-hidden ${
                  aspectRatioSetting === "16:9"
                    ? "aspect-video"
                    : aspectRatioSetting === "1:1"
                    ? "aspect-square"
                    : aspectRatioSetting === "9:16"
                    ? "aspect-[9/16]"
                    : item.aspectRatio === "9:16"
                    ? "aspect-[9/16]"
                    : "aspect-video"
                }`}
              >
                <img
                  src={item.src}
                  alt={item.title}
                  className={`w-full h-full ${
                    thumbnailScale === "Fit" ? "object-contain bg-black" : "object-cover"
                  } group-hover:scale-105 transition-transform duration-500`}
                />

                <div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                  {item.type === "video" ? (
                    <Video className="size-3.5" />
                  ) : (
                    <ImageIcon className="size-3.5" />
                  )}
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#f5551d] text-black flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                    <Play className="size-5 fill-current ml-0.5" />
                  </div>
                </div>

                <span className="absolute bottom-3 right-3 z-10 text-[10px] font-mono bg-black/80 px-2 py-0.5 rounded text-white border border-white/10">
                  {item.duration}
                </span>
              </div>

              {showCardInfo && (
                <div className="p-3.5 border-t border-white/5 space-y-1">
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>Aspect: {item.aspectRatio}</span>
                    <span
                      className={`font-semibold ${
                        item.status === "approved"
                          ? "text-emerald-400 flex items-center gap-1"
                          : "text-[#f5551d]"
                      }`}
                    >
                      {item.status === "approved" ? "✓ Approved" : "In Review"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 6. Project Details Card */}
      <div
        ref={projectDetailsRef}
        className="rounded-2xl bg-[#121215] border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-base font-bold font-heading text-white">Project details</h3>
          <Button
            onClick={handleSaveProjectDetails}
            disabled={isSavingDetails}
            size="sm"
            className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] cursor-pointer"
          >
            {isSavingDetails ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="space-y-5 text-xs">
          <div className="space-y-2">
            <label className="text-muted-foreground font-mono block">Title</label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-4 py-3 text-white font-medium text-sm focus:outline-none focus:border-[#f5551d] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground font-mono block">Client</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-4 py-3 text-white font-medium text-sm focus:outline-none focus:border-[#f5551d] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground font-mono block">
              Description (shows on your public page)
            </label>
            <textarea
              rows={3}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-4 py-3 text-white font-medium text-sm focus:outline-none focus:border-[#f5551d] transition-colors resize-y"
            />
          </div>
        </div>
      </div>

      {/* 🟢 7. SHARE A LINK MODAL DIALOG (Matching Image 1) */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#141418]/95 backdrop-blur-xl border border-white/15 text-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#f5551d] uppercase tracking-wider block">
                Client link
              </span>
              <h3 className="text-lg font-black font-heading tracking-wide uppercase text-white">
                SHARE A LINK
              </h3>
            </div>
            <button
              onClick={() => setIsShareDialogOpen(false)}
              className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* URL Input Bar */}
          <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground truncate">
              <Link2 className="size-4 shrink-0 text-[#f5551d]" />
              <span className="font-mono text-white truncate">
                cinespace.film/{projectTitle.toLowerCase().replace(/\s+/g, "-")}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/15">
              Public
            </span>
          </div>

          {/* SECURITY */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              SECURITY
            </span>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5 text-xs text-white">
                <Lock className="size-4 text-muted-foreground" />
                <span>Passphrase</span>
              </div>
              <button
                onClick={() => setSharePassphrase(!sharePassphrase)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  sharePassphrase ? "bg-[#f5551d]" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                    sharePassphrase ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* PERMISSIONS */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              PERMISSIONS
            </span>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white">
                  <MessageCircle className="size-4 text-muted-foreground" />
                  <span>Comments</span>
                </div>
                <button
                  onClick={() => setShareComments(!shareComments)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    shareComments ? "bg-[#f5551d]" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                      shareComments ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white">
                  <Download className="size-4 text-muted-foreground" />
                  <span>Downloads</span>
                </div>
                <button
                  onClick={() => setShareDownloads(!shareDownloads)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    shareDownloads ? "bg-[#f5551d]" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                      shareDownloads ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* LINK EXPIRES */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              LINK EXPIRES
            </span>
            <div className="grid grid-cols-4 gap-1 bg-black/60 p-1 rounded-2xl border border-white/10 text-xs">
              {(["24 hours", "7 days", "30 days", "Never"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setShareExpires(opt)}
                  className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                    shareExpires === opt
                      ? "bg-[#f5551d] text-black"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* NOTIFY ME WHEN THE CLIENT... */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              NOTIFY ME WHEN THE CLIENT...
            </span>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white">
                  <MessageCircle className="size-4 text-muted-foreground" />
                  <span>Leaves a comment</span>
                </div>
                <button
                  onClick={() => setNotifyComments(!notifyComments)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notifyComments ? "bg-[#f5551d]" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                      notifyComments ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white">
                  <Download className="size-4 text-muted-foreground" />
                  <span>Downloads files</span>
                </div>
                <button
                  onClick={() => setNotifyDownloads(!notifyDownloads)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notifyDownloads ? "bg-[#f5551d]" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                      notifyDownloads ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/20 bg-black/40 hover:bg-white/10 text-white font-extrabold text-xs py-3 h-auto cursor-pointer"
            >
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Here is your review link: ${
                    typeof window !== "undefined" ? window.location.origin : ""
                  }${shareUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-3.5 mr-1.5 text-emerald-400" />
                SEND ON WHATSAPP
              </a>
            </Button>

            <Button
              onClick={handleCopyLink}
              className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs py-3 h-auto shadow-lg shadow-[#f5551d]/20 cursor-pointer"
            >
              <Link2 className="size-3.5 mr-1.5" />
              {copied ? "COPIED!" : "COPY LINK"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔴 8. EDIT DELIVERY MODAL DIALOG (Matching Image 2) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#141418]/95 backdrop-blur-xl border border-white/15 text-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-black font-heading tracking-wide uppercase text-white">
                EDIT DELIVERY
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update the cover, manage assets, or delete this delivery.
              </p>
            </div>
            <button
              onClick={() => setIsEditDialogOpen(false)}
              className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* COVER THUMBNAIL */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              COVER THUMBNAIL
            </span>
            <div className="flex items-center gap-3">
              <div className="w-14 h-10 rounded-lg overflow-hidden border border-white/15 bg-black shrink-0">
                <img
                  src={coverThumbnailUrl}
                  alt="Cover Thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newCover = prompt("Enter new cover image URL:", coverThumbnailUrl);
                  if (newCover) setCoverThumbnailUrl(newCover);
                }}
                className="rounded-full border-white/20 bg-black/40 hover:bg-white/10 text-white font-bold text-xs px-4 py-2 cursor-pointer"
              >
                <UploadCloud className="size-3.5 mr-1.5" /> CHANGE COVER
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Shown at the top of the delivery page.
            </p>
          </div>

          {/* ASSETS (X) */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              ASSETS ({galleryItems.length})
            </span>

            <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-1">
              {galleryItems.map((item) => (
                <div
                  key={item.id}
                  className="aspect-square rounded-xl overflow-hidden border border-white/10 relative group bg-black"
                >
                  <img
                    src={item.src}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleDeleteItemFromGallery(item.id)}
                    className="absolute top-1.5 right-1.5 size-5 rounded-full bg-black/70 text-white hover:bg-red-500 flex items-center justify-center transition-colors cursor-pointer"
                    title="Remove asset"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {/* Add Asset dashed tile */}
              <button
                onClick={() => setShowUploader(true)}
                className="aspect-square rounded-xl border border-dashed border-white/20 hover:border-[#f5551d] bg-black/40 flex items-center justify-center text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="size-6" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <Button
              onClick={handleSaveProjectDetails}
              className="w-full rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs py-3.5 h-auto shadow-lg shadow-[#f5551d]/20 cursor-pointer"
            >
              <Check className="size-4 mr-1.5" /> SAVE CHANGES
            </Button>

            <Button
              onClick={() => {
                if (confirm("Are you sure you want to delete this delivery?")) {
                  triggerToast("Delivery deleted");
                  setIsEditDialogOpen(false);
                }
              }}
              variant="outline"
              className="w-full rounded-full border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold text-xs py-3 h-auto cursor-pointer"
            >
              <Trash2 className="size-3.5 mr-1.5" /> Delete delivery
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🟡 9. FLOATING UPLOAD INFO COMPONENT (Matching Image 3 Bottom-Right) */}
      {uploadProgress && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121215] border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[340px] max-w-sm space-y-3 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-xl bg-white/10 text-[#f5551d] flex items-center justify-center shrink-0 border border-white/10">
                <UploadCloud className="size-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">
                  {uploadProgress.fileName}
                </h4>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {uploadProgress.fileSize} · {uploadProgress.fileIndex} of{" "}
                  {uploadProgress.totalFiles} files
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold font-mono text-white">
                {uploadProgress.percentage}%
              </span>
              <button
                onClick={() => setUploadProgress(null)}
                className="size-6 rounded-full bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Progress Bar Line */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#f5551d] to-[#ff8a45] transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 🔵 10. Lightbox Video Player Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#121215] rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 space-y-6 text-white border border-white/20 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <FileVideo className="size-6 text-[#f5551d]" />
                <div>
                  <h3 className="font-bold text-base">{activeItem.title}</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Aspect: {activeItem.aspectRatio} · Format: 4K ProRes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Button
                  onClick={() => handleToggleAssetApproval(activeItem.id, activeItem.status)}
                  size="sm"
                  className={`rounded-full text-xs font-bold px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5 ${
                    activeItem.status === "approved"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Check className="size-3.5" />
                  <span>{activeItem.status === "approved" ? "Approved" : "Mark Approved"}</span>
                </Button>
                <button
                  onClick={() => setActiveItem(null)}
                  className="size-9 rounded-full bg-white/10 text-muted-foreground hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-3">
                <CutReviewPlayer
                  ref={cutPlayerRef}
                  isPhoto={activeItem.type === "photo"}
                  src={
                    activeItem.type === "photo"
                      ? activeItem.src
                      : activeItem.hlsUrl ||
                        activeItem.videoUrl ||
                        (activeItem.rawUrl &&
                        !activeItem.rawUrl.includes("unsplash.com") &&
                        (activeItem.rawUrl.endsWith(".mp4") ||
                          activeItem.rawUrl.endsWith(".m3u8") ||
                          activeItem.rawUrl.startsWith("/api/mock-upload"))
                          ? activeItem.rawUrl
                          : "https://files.vidstack.io/sprite-fight/hls/stream.m3u8")
                  }
                  title={activeItem.title}
                  poster={activeItem.src}
                  aspectRatio={activeItem.aspectRatio || "16:9"}
                  fps={24}
                  comments={feedbackList.map((f) => ({
                    id: f.id,
                    timestampSeconds: f.timestampSeconds,
                    authorName: f.authorName,
                    commentText: f.commentText,
                    isResolved: f.isResolved,
                  }))}
                  activeCommentId={activeCommentId}
                  onCommentSelect={(commentId, timestamp) => {
                    setActiveCommentId(commentId);
                    cutPlayerRef.current?.seekTo(timestamp);
                  }}
                  onTimeChange={(time, tc) => {
                    setCurrentCutTime(time);
                    setCurrentCutTimecode(tc);
                  }}
                />
              </div>

              <div className="lg:col-span-5 bg-[#1a1a1e] p-5 rounded-2xl border border-white/10 flex flex-col justify-between h-[450px]">
                <div className="space-y-3 overflow-hidden flex flex-col h-full">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
                    <h4 className="font-bold text-sm flex items-center gap-2 text-white">
                      <MessageCircle className="size-4 text-[#f5551d]" /> Timecoded Notes (
                      {feedbackList.length})
                    </h4>
                    <span className="text-[11px] font-mono text-[#ff8a45] bg-[#f5551d]/10 px-2 py-0.5 rounded border border-[#f5551d]/20">
                      Playhead: {currentCutTimecode}
                    </span>
                  </div>

                  <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                    {feedbackList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                        <MessageCircle className="size-8 opacity-30 mb-2" />
                        <p className="text-xs">No timecoded notes yet.</p>
                        <p className="text-[11px] text-muted-foreground/60">
                          Pause the video at any frame and leave a precise comment.
                        </p>
                      </div>
                    ) : (
                      feedbackList.map((f) => {
                        const tcDisplay =
                          f.timestampSeconds !== undefined && f.timestampSeconds !== null
                            ? formatTimecode(f.timestampSeconds, 24)
                            : "General";
                        const isSelected = activeCommentId === f.id;

                        return (
                          <div
                            key={f.id}
                            onClick={() => {
                              if (f.timestampSeconds !== undefined && f.timestampSeconds !== null) {
                                cutPlayerRef.current?.seekTo(f.timestampSeconds);
                                setActiveCommentId(f.id);
                              }
                            }}
                            className={`p-3 rounded-xl text-xs space-y-1 border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#f5551d]/15 border-[#f5551d] text-white ring-1 ring-[#f5551d]"
                                : "bg-black/40 border-white/10 text-white/90 hover:bg-black/60 hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                              <span className="font-semibold text-white">{f.authorName}</span>
                              <span className="text-[#ff8a45] font-bold">[{tcDisplay}]</span>
                            </div>
                            <p className="text-white/90 leading-snug">{f.commentText}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendFeedback} className="pt-2 border-t border-white/10 flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>Tagging at:</span>
                      <span className="text-[#ff8a45] font-bold">[{currentCutTimecode}]</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Add note at ${currentCutTimecode}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#f5551d] text-white"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="size-8 p-0 rounded-xl bg-[#f5551d] text-black font-bold hover:bg-[#ff8a45] cursor-pointer"
                      >
                        <Send className="size-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 Publish to Portfolio Dialog */}
      <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <DialogContent className="bg-[#121215] text-white border-white/20 rounded-3xl p-6 sm:p-8 max-w-md">
          <DialogHeader className="space-y-2">
            <span className="text-[11px] font-mono font-bold text-[#f5551d] uppercase tracking-wider">
              SHOWCASE SPOTLIGHT
            </span>
            <DialogTitle className="text-xl font-bold font-heading text-white">
              Publish Cut to Portfolio
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Instantly promote this approved delivery cut into your public portfolio showcase without re-uploading files.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                Showcase Category
              </label>
              <select
                value={publishCategory}
                onChange={(e) => setPublishCategory(e.target.value)}
                className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#f5551d]"
              >
                <option value="Commercial">Commercial / Brand</option>
                <option value="Narrative">Narrative / Short Film</option>
                <option value="Music Video">Music Video</option>
                <option value="Documentary">Documentary</option>
                <option value="Automotive">Automotive</option>
                <option value="Fashion">Fashion / Editorial</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs">
              <div className="text-[11px] font-mono text-muted-foreground uppercase">Target Showcase:</div>
              <div className="font-bold text-white">{projectTitle}</div>
              <div className="text-muted-foreground text-[11px]">Client: {clientName}</div>
              <div className="text-[#f5551d] text-[11px] font-mono">
                {portfolio ? `Publishes to /${workspace.slug}/portfolio` : "Creates your public portfolio showcase"}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsPublishDialogOpen(false)}
                className="rounded-full text-xs text-muted-foreground hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublishToPortfolio}
                disabled={isPublishing}
                className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs px-5 py-2.5 cursor-pointer shadow-lg shadow-[#f5551d]/20 flex items-center gap-2"
              >
                <Sparkles className="size-3.5" />
                <span>{isPublishing ? "Publishing..." : "Publish to Portfolio"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#121215] border border-[#f5551d] text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="size-4 text-[#f5551d]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

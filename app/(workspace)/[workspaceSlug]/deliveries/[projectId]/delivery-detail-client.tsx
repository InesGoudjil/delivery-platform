"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Play,
  Pause,
  Send,
  Link2,
  MessageCircle,
  Clock,
  Check,
  Lock,
  Download,
  Copy,
  ExternalLink,
  Sparkles,
  Layers,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoUploader } from "@/components/workspaces/video-uploader";
import { addFeedbackAction } from "@/app/actions/feedback";
import { approveCutAction } from "@/app/actions/projects";

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
    versions: AssetVersionItem[];
    activeVersion?: AssetVersionItem | null;
  }>;
  initialFeedback: FeedbackItem[];
}

export function DeliveryDetailClient({
  workspace,
  project,
  assets,
  initialFeedback,
}: DeliveryDetailClientProps) {
  const [isPending, startTransition] = useTransition();

  const [showUploader, setShowUploader] = useState(false);
  const [copied, setCopied] = useState(false);
  const [projectStatus, setProjectStatus] = useState(project.status);

  // Versions from primary asset
  const primaryAsset = assets[0];
  const versionsList = primaryAsset?.versions || [];
  const defaultVersion =
    primaryAsset?.activeVersion ||
    versionsList[0] || {
      id: "v_default",
      versionNumber: 1,
      rawFileUrl: "",
      thumbnailUrl: "/images/hero.jpg",
      durationSeconds: 47,
      fileSizeBytes: 1024 * 1024 * 50,
      transcodingStatus: "ready",
      isActiveVersion: true,
      createdAt: new Date().toISOString(),
    };

  const [selectedVersion, setSelectedVersion] = useState<AssetVersionItem>(defaultVersion);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(initialFeedback);
  const [replyText, setReplyText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const shareUrl = `/deliver/${project.shareToken}`;

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${shareUrl}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newCommentText = replyText.trim();
    setReplyText("");

    const tempFeedback: FeedbackItem = {
      id: `temp_${Date.now()}`,
      authorName: workspace.brandName || "Filmmaker",
      commentText: newCommentText,
      timestampSeconds: videoRef.current ? Math.floor(videoRef.current.currentTime) : null,
      createdAt: new Date().toISOString(),
    };

    setFeedbackList((prev) => [...prev, tempFeedback]);

    if (selectedVersion.id && !selectedVersion.id.startsWith("v_default")) {
      await addFeedbackAction({
        assetVersionId: selectedVersion.id,
        authorName: workspace.brandName,
        commentText: newCommentText,
        timestampSeconds: tempFeedback.timestampSeconds || undefined,
      });
    }
  };

  const handleApproveCut = async () => {
    startTransition(async () => {
      const res = await approveCutAction(project.id, workspace.brandName);
      if (res.success) {
        setProjectStatus("approved");
      }
    });
  };

  const handleUploadDone = (newAsset: any) => {
    setShowUploader(false);
    window.location.reload();
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "00:47";
    const totalSec = Math.round(seconds);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: string) => {
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
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Back Navigation & Delivery Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground -ml-2.5 rounded-full self-start"
        >
          <Link href={`/${workspace.slug}/deliveries`}>
            <ArrowLeft className="size-4 mr-1.5" /> Back to Deliveries
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {/* Copy Review Link */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="rounded-full text-xs h-8 px-3 gap-1.5 cursor-pointer hover:bg-accent"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-muted-foreground" />
                <span>Copy Review Link</span>
              </>
            )}
          </Button>

          {/* WhatsApp Direct Share */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="size-8 p-0 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 border border-emerald-500/20"
            title="Broadcast via WhatsApp"
          >
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hi ${project.clientName}, your review cut for ${project.title} is ready to watch in 4K: ${typeof window !== "undefined" ? window.location.origin : ""}${shareUrl}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4" />
            </a>
          </Button>

          {/* Preview Delivery Room */}
          <Button
            asChild
            className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] shadow-lg shadow-[#f5551d]/20 cursor-pointer h-8 px-3.5"
          >
            <Link href={shareUrl} target="_blank">
              <ExternalLink className="size-3.5 mr-1.5" /> Open Review Room
            </Link>
          </Button>
        </div>
      </div>

      {/* Project Meta Card */}
      <div className="rounded-2xl bg-card border border-border p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            {getStatusBadge(projectStatus)}
            <span className="text-xs text-muted-foreground font-mono">
              Share Token: {project.shareToken}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold font-heading text-card-foreground">
            {project.title}
          </h1>

          <p className="text-xs text-muted-foreground">
            Client: <span className="text-foreground font-semibold">{project.clientName}</span>
            {project.description && (
              <> · <span className="text-muted-foreground">{project.description}</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {projectStatus !== "approved" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleApproveCut}
              disabled={isPending}
              className="rounded-full text-xs font-semibold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Check className="size-3.5 mr-1.5" /> Mark as Approved
            </Button>
          )}

          <Button
            onClick={() => setShowUploader(!showUploader)}
            variant={showUploader ? "outline" : "default"}
            className={`rounded-full text-xs font-bold cursor-pointer transition-all ${
              showUploader
                ? "border-primary text-primary"
                : "bg-primary text-black hover:bg-primary/90 shadow-md shadow-primary/20"
            }`}
          >
            <Upload className="size-3.5 mr-1.5" />
            {showUploader ? "Close Uploader" : "Upload New Cut (5GB)"}
          </Button>
        </div>
      </div>

      {/* Direct Cloudflare Video Uploader Area */}
      {showUploader && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-200">
          <VideoUploader
            workspaceId={workspace.id}
            projectId={project.id}
            onUploadComplete={handleUploadDone}
          />
        </div>
      )}

      {/* Player Preview and Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: 4K Video Player & Version History */}
        <div className="md:col-span-2 space-y-4">
          <div className="aspect-video bg-black rounded-2xl border border-border relative overflow-hidden flex items-center justify-center group shadow-xl">
            {selectedVersion?.rawFileUrl && selectedVersion.rawFileUrl.startsWith("http") ? (
              <video
                ref={videoRef}
                src={selectedVersion.rawFileUrl}
                poster={selectedVersion.thumbnailUrl || "/images/hero.jpg"}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform group-hover:scale-102 duration-700"
                  style={{
                    backgroundImage: `url('${selectedVersion?.thumbnailUrl || "/images/hero.jpg"}')`,
                  }}
                />
                <div
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="relative z-10 size-16 rounded-full bg-[#f5551d] text-black flex items-center justify-center cursor-pointer shadow-2xl group-hover:scale-110 transition-transform"
                >
                  <Play className="size-6 fill-current ml-0.5" />
                </div>
              </>
            )}

            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between bg-black/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-xs">
              <span className="font-mono text-muted-foreground">
                Duration: {formatDuration(selectedVersion?.durationSeconds)} (4K HDR Master)
              </span>
              <span className="font-bold text-[#f5551d]">
                Playing Cut V{selectedVersion?.versionNumber || 1}
              </span>
            </div>
          </div>

          {/* Version Switcher Bar */}
          <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Version History ({versionsList.length || 1}):
            </span>
            <div className="flex gap-2">
              {versionsList.length > 0 ? (
                versionsList.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersion(v)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      selectedVersion.id === v.id
                        ? "bg-primary text-black"
                        : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    V{v.versionNumber}
                    {v.isActiveVersion && " (Active)"}
                  </button>
                ))
              ) : (
                ["V1", "V2", "Final"].map((v, i) => (
                  <button
                    key={v}
                    onClick={() =>
                      setSelectedVersion({
                        ...defaultVersion,
                        versionNumber: i + 1,
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      selectedVersion.versionNumber === i + 1
                        ? "bg-primary text-black"
                        : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {v}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Client Notes & Timecoded Feedback */}
        <div className="rounded-2xl bg-card border border-border p-5 flex flex-col justify-between h-[480px] shadow-sm">
          <div>
            <h3 className="font-heading font-bold text-sm text-card-foreground mb-3 flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-primary" />
                <span>Client Notes ({feedbackList.length})</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Timecoded
              </span>
            </h3>

            <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1">
              {feedbackList.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                  <p>No client notes yet for this cut.</p>
                  <p className="text-[11px] text-[#71717a]">
                    Comments added on the review link appear here in real-time.
                  </p>
                </div>
              ) : (
                feedbackList.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl text-xs space-y-1 bg-muted border border-border text-foreground"
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span className="font-semibold text-foreground">
                        {c.authorName}
                      </span>
                      {c.timestampSeconds !== undefined && c.timestampSeconds !== null && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                          {formatDuration(c.timestampSeconds)}
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed text-foreground/90">
                      {c.commentText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reply Input Form */}
          <form onSubmit={handleSendFeedback} className="pt-3 border-t border-border flex gap-2">
            <input
              type="text"
              placeholder="Reply to client note..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
            <Button
              type="submit"
              size="sm"
              className="size-8 p-0 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 cursor-pointer"
            >
              <Send className="size-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

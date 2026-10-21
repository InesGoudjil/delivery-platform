"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileVideo,
  Check,
  X,
  MessageCircle,
  Send,
  Layers,
  Image as ImageIcon,
  Trash2,
  Pencil,
  Download,
  CornerDownRight,
  UploadCloud,
  Plus,
  Loader2,
  Star,
  Upload,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographyH3 } from "@/components/ui/typography";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
import { CutReviewPlayer, type CutReviewPlayerRef } from "@/components/video/cut-review-player";
import { directUploadMediaFile, formatBytes } from "@/components/workspaces/video-uploader";
import { setActiveVersionAction } from "@/app/actions/deliveries";
import { formatTimecode } from "@/lib/timecode";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import { getDownloadFilename, triggerDirectDownload } from "@/lib/download";
import { addFeedbackAction, addFeedbackReplyAction } from "@/app/actions/feedback";
import { toast } from "sonner";
import type { GalleryItem, FeedbackItem, FeedbackReplyItem } from "./types";

interface AssetLightboxModalProps {
  activeItem: GalleryItem | null;
  onClose: () => void;
  feedbackList?: FeedbackItem[];
  onAddFeedback: (feedback: FeedbackItem) => void;
  onAddReply?: (feedbackId: string, reply: FeedbackReplyItem) => void;
  onToggleApproval: (itemId: string, currentStatus: string) => void;
  onDeleteAsset?: (item: GalleryItem) => Promise<void> | void;
  onEditAsset?: (item: GalleryItem) => void;
  authorName: string;
  triggerToast: (msg: string) => void;
  watermarkMedia?: boolean;
  watermarkText?: string;
  workspaceId?: string;
  projectId?: string;
  workspaceSlug?: string;
  onAssetUploaded?: (asset: any, version?: any) => void;
}

export function AssetLightboxModal({
  activeItem,
  onClose,
  feedbackList,
  onAddFeedback,
  onAddReply,
  onToggleApproval,
  onDeleteAsset,
  onEditAsset,
  authorName,
  triggerToast,
  watermarkMedia = false,
  watermarkText,
  workspaceId,
  projectId,
  workspaceSlug,
  onAssetUploaded,
}: AssetLightboxModalProps) {
  const cutPlayerRef = useRef<CutReviewPlayerRef | null>(null);
  const [currentCutTime, setCurrentCutTime] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const [currentCutTimecode, setCurrentCutTimecode] = useState("00:00:00");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Version Upload States
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Synchronize selectedVersionId when activeItem changes
  useEffect(() => {
    if (activeItem) {
      const defaultVer =
        (activeItem.versionId && activeItem.versions?.find((v) => v.id === activeItem.versionId)) ||
        activeItem.versions?.find((v) => v.isActiveVersion) ||
        activeItem.versions?.[activeItem.versions.length - 1] ||
        activeItem.versions?.[0];
      setSelectedVersionId(defaultVer?.id || null);
      setActiveCommentId(null);
      setCurrentCutTime(0);
      setCurrentCutTimecode("00:00:00");
    } else {
      setSelectedVersionId(null);
      setActiveCommentId(null);
    }
  }, [activeItem?.id, activeItem?.versionId]);

  if (!activeItem) return null;

  const isStill = activeItem.type === "photo" || activeItem.duration === "STILL";

  const currentVersion =
    (selectedVersionId && activeItem.versions?.find((v) => v.id === selectedVersionId)) ||
    (activeItem.versionId && activeItem.versions?.find((v) => v.id === activeItem.versionId)) ||
    activeItem.versions?.find((v) => v.isActiveVersion) ||
    activeItem.versions?.[activeItem.versions.length - 1] ||
    activeItem.versions?.[0] ||
    null;

  const activeVersionNumber = currentVersion?.versionNumber || activeItem.versionNumber || 1;
  const targetVersionId = currentVersion?.id || activeItem.versionId;

  // Source all feedback: prefer activeItem.feedback if populated, otherwise feedbackList prop
  const allAssetFeedback =
    activeItem.feedback && activeItem.feedback.length > 0
      ? activeItem.feedback
      : (feedbackList || []);

  // Filter feedback for the currently selected version
  const currentVersionFeedback = allAssetFeedback.filter((f) => {
    if (f.assetVersionId && targetVersionId) {
      return f.assetVersionId === targetVersionId;
    }
    // For legacy feedback items without an assetVersionId, show them on V1
    return activeVersionNumber === 1;
  });

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newCommentText = replyText.trim();
    setReplyText("");

    const capturedTime = isStill ? null : (cutPlayerRef.current?.getCurrentTime() ?? currentCutTime);
    const roundedTime = capturedTime !== null ? Math.round(capturedTime * 100) / 100 : null;

    const tempFeedback: FeedbackItem = {
      id: `temp_${Date.now()}`,
      assetVersionId: targetVersionId,
      authorName: authorName || "Filmmaker",
      commentText: newCommentText,
      timestampSeconds: roundedTime,
      createdAt: new Date().toISOString(),
    };

    onAddFeedback(tempFeedback);
    setActiveCommentId(tempFeedback.id);
    triggerToast(
      isStill
        ? `Note added to V${activeVersionNumber} still photo`
        : `Note tagged at [${formatTimecode(roundedTime || 0, 24)}] on V${activeVersionNumber}`
    );

    if (targetVersionId) {
      addFeedbackAction({
        assetVersionId: targetVersionId,
        authorName: authorName || "Filmmaker",
        commentText: newCommentText,
        timestampSeconds: roundedTime,
      }).catch((err) => {
        console.error("Error saving feedback note:", err);
        toast.error("Failed to save feedback note");
      });
    }
  };

  const handleSendReply = async (feedbackId: string) => {
    if (!replyInputText.trim()) return;
    const content = replyInputText.trim();
    const author = authorName || "Filmmaker";
    const tempReplyId = `temp_reply_${Date.now()}`;

    const tempReply: FeedbackReplyItem = {
      id: tempReplyId,
      feedbackId,
      authorName: author,
      commentText: content,
      createdAt: new Date().toISOString(),
    };

    onAddReply?.(feedbackId, tempReply);
    setReplyInputText("");
    setReplyingToCommentId(null);
    triggerToast("Reply posted");

    addFeedbackReplyAction({
      feedbackId,
      commentText: content,
      authorName: author,
    }).catch((err) => {
      console.error("Error saving feedback reply:", err);
      toast.error("Failed to save reply");
    });
  };

  const allVersions =
    activeItem.versions && activeItem.versions.length > 0
      ? activeItem.versions
      : currentVersion
      ? [currentVersion]
      : [];

  const highestVersionNumber =
    allVersions.length > 0
      ? Math.max(...allVersions.map((v) => v.versionNumber || 1))
      : activeItem.versionNumber || 1;

  const nextVersionNumber = highestVersionNumber + 1;

  const handleUploadNewVersion = async (file: File) => {
    if (!activeItem || !workspaceId || !projectId || isUploadingVersion) return;

    setIsUploadingVersion(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadStatusText("Requesting direct upload token...");

    try {
      const resolvedType =
        activeItem.type === "photo" ? ("photo_gallery" as const) : ("video" as const);
      const result = await directUploadMediaFile({
        workspaceId,
        projectId,
        file,
        title: activeItem.title,
        assetType: resolvedType,
        assetId: activeItem.id,
        onProgress: (percent, loaded, total) => {
          setUploadProgress(percent);
          setUploadStatusText(
            `Uploading V${nextVersionNumber}: ${percent}% (${formatBytes(loaded)} / ${formatBytes(total)})`
          );
        },
        onStatusChange: (status) => {
          setUploadStatusText(status);
        },
        onXhrCreated: (xhr) => {
          xhrRef.current = xhr;
        },
      });

      setUploadProgress(100);
      setUploadStatusText("Upload complete & ready!");
      toast.success(
        `Version V${result.assetVersion?.versionNumber || nextVersionNumber} uploaded successfully!`
      );

      if (onAssetUploaded) {
        onAssetUploaded(result.asset, result.assetVersion);
      }

      if (result.assetVersion?.id) {
        setSelectedVersionId(result.assetVersion.id);
      }
      setShowUploadZone(false);
    } catch (err: any) {
      const msg = err.message || "Failed to upload new version.";
      setUploadError(msg);
      if (!msg.toLowerCase().includes("cancel")) {
        toast.error(msg);
      }
    } finally {
      setIsUploadingVersion(false);
      xhrRef.current = null;
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    setIsUploadingVersion(false);
    setUploadProgress(0);
    setUploadStatusText("");
    toast.info("Version upload cancelled");
  };

  const handleMakeVersionActive = async (versionId: string, versionNum: number) => {
    if (!activeItem) return;
    try {
      const res = await setActiveVersionAction(activeItem.id, versionId, {
        deliveryId: projectId,
        workspaceSlug,
      });
      if (res.success) {
        triggerToast(`V${versionNum} is now the active version for this asset`);
        if (activeItem.versions) {
          const updatedVers = activeItem.versions.map((v) => ({
            ...v,
            isActiveVersion: v.id === versionId,
          }));
          const targetVer = updatedVers.find((v) => v.id === versionId);
          onAssetUploaded?.(
            { ...activeItem, versionId, versionNumber: versionNum },
            targetVer
          );
        }
      } else {
        toast.error(res.error || "Failed to set active version");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to set active version");
    }
  };

  const videoOrPhotoSrc = isStill
    ? resolveMediaUrl(currentVersion?.rawFileUrl || activeItem.src)
    : (resolveMediaUrl(currentVersion?.hlsManifestUrl) ||
      resolveMediaUrl(currentVersion?.rawFileUrl) ||
      resolveMediaUrl(activeItem.hlsUrl) ||
      resolveMediaUrl(activeItem.videoUrl) ||
      resolveMediaUrl(activeItem.rawUrl) ||
      "https://files.vidstack.io/sprite-fight/hls/stream.m3u8");

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#121215] rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 space-y-6 text-white border border-white/20 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            {isStill ? (
              <ImageIcon className="size-6 text-primary" />
            ) : (
              <FileVideo className="size-6 text-primary" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <TypographyH3 className="font-bold text-base text-white">{activeItem.title}</TypographyH3>
                <Badge variant="orange" className="text-[10px] font-mono font-bold">
                  V{activeVersionNumber}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Aspect: {activeItem.aspectRatio} · Format: {isStill ? "Hi-Res Still" : "ProRes Master"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const dlUrl =
                        currentVersion?.downloadUrl ||
                        currentVersion?.rawFileUrl ||
                        activeItem.downloadUrl ||
                        activeItem.rawUrl ||
                        (isStill ? activeItem.src : "");
                      if (!dlUrl) {
                        toast.error("No master file available for download.");
                        return;
                      }
                      const filename = getDownloadFilename(
                        activeItem.title,
                        currentVersion?.versionNumber || activeVersionNumber,
                        dlUrl,
                        activeItem.type
                      );
                      triggerDirectDownload(dlUrl, filename);
                      triggerToast(`Downloading ${activeItem.title} (V${activeVersionNumber})`);
                    }}
                    className="rounded-full border-white/20 text-white bg-white/10 hover:bg-white/20 text-xs font-bold px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="size-3.5 text-primary" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                }
              />
              <TooltipContent>Download master file to disk</TooltipContent>
            </Tooltip>

            {workspaceId && projectId && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUploadZone((prev) => !prev)}
                      disabled={isUploadingVersion}
                      className="rounded-full border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 text-xs font-bold px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5"
                    >
                      <UploadCloud className="size-3.5 text-primary" />
                      <span className="hidden sm:inline">Upload New Version</span>
                    </Button>
                  }
                />
                <TooltipContent>Upload a new cut or still version (V{nextVersionNumber})</TooltipContent>
              </Tooltip>
            )}

            {onEditAsset && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEditAsset(activeItem)}
                      className="rounded-full border-white/20 text-white bg-white/10 hover:bg-white/20 text-xs font-bold px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5"
                    >
                      <Pencil className="size-3.5" />
                      <span className="hidden sm:inline">Edit Asset</span>
                    </Button>
                  }
                />
                <TooltipContent>Edit asset title &amp; aspect ratio</TooltipContent>
              </Tooltip>
            )}
            {onDeleteAsset && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="rounded-full border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      <span className="hidden sm:inline">Delete Asset</span>
                    </Button>
                  }
                />
                <TooltipContent>Move asset to trash</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    onClick={() => onToggleApproval(activeItem.id, activeItem.status)}
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
                }
              />
              <TooltipContent>
                {activeItem.status === "approved" ? "Click to request revisions" : "Approve asset"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="size-9 rounded-full bg-white/10 text-muted-foreground hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="size-5" />
                  </Button>
                }
              />
              <TooltipContent>Close preview (Esc)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Version Switcher Bar */}
        {allVersions.length > 0 && (
          <div className="flex items-center justify-between gap-3 bg-[#1a1a1e] p-2.5 rounded-2xl border border-white/10 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-2 flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" /> Versions ({allVersions.length}):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {allVersions.map((ver) => {
                  const isSelected = (currentVersion?.id || activeItem.versionId) === ver.id;
                  const isMarkedActive = Boolean(ver.isActiveVersion);
                  const verFeedbackCount = allAssetFeedback.filter(
                    (f) => f.assetVersionId === ver.id || (!f.assetVersionId && ver.versionNumber === 1)
                  ).length;
                  return (
                    <div key={ver.id} className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => {
                          setSelectedVersionId(ver.id);
                          setActiveCommentId(null);
                          setCurrentCutTime(0);
                          setCurrentCutTimecode("00:00:00");
                        }}
                        className={`px-3 py-1 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 border-transparent"
                            : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <span>V{ver.versionNumber}</span>
                        {isMarkedActive && (
                          <span className="text-[10px] text-amber-300 font-bold" title="Active Client Version">★</span>
                        )}
                        {verFeedbackCount > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                              isSelected
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-white/15 text-white/90"
                            }`}
                          >
                            {verFeedbackCount}
                          </span>
                        )}
                      </Button>
                      {!isMarkedActive && isSelected && workspaceId && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleMakeVersionActive(ver.id, ver.versionNumber)}
                                className="size-7 text-muted-foreground hover:text-amber-300 transition-colors cursor-pointer"
                              >
                                <Star className="size-3" />
                              </Button>
                            }
                          />
                          <TooltipContent>Set V{ver.versionNumber} as active version for client review</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {workspaceId && projectId && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowUploadZone((prev) => !prev)}
                disabled={isUploadingVersion}
                className={`px-3 py-1 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  showUploadZone
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-dashed border-primary/40 text-primary bg-primary/5 hover:bg-primary/15"
                }`}
              >
                <Plus className="size-3" />
                <span>Upload V{nextVersionNumber}</span>
              </Button>
            )}
          </div>
        )}

        {/* Expandable Version Upload Dropzone */}
        {showUploadZone && (
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(true);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleUploadNewVersion(e.dataTransfer.files[0]);
              }
            }}
            className={`p-5 rounded-2xl border transition-all duration-200 ${
              isDragOver
                ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                : "border-primary/30 bg-primary/5 hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <UploadCloud className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Upload Version V{nextVersionNumber}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {isStill
                      ? "High-resolution photo still (PNG, JPG, WEBP, AVIF up to 5GB)"
                      : "ProRes 422/4444, MP4, or MOV video cut directly uploaded (up to 5GB)"}
                  </p>
                </div>
              </div>
              {!isUploadingVersion && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setShowUploadZone(false);
                    setUploadError(null);
                  }}
                  className="size-7 rounded-lg text-muted-foreground hover:text-white"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>

            {uploadError && (
              <div className="mt-3 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {isUploadingVersion ? (
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/80 flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    {uploadStatusText || `Uploading V${nextVersionNumber}...`}
                  </span>
                  <span className="font-bold text-primary">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelUpload}
                    className="rounded-full text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 h-7 px-3 cursor-pointer"
                  >
                    Cancel Upload
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Drop your file here, or click to browse from disk
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={isStill ? "image/*,.png,.jpg,.jpeg,.webp,.avif" : "video/*,.mov,.mp4,.mkv,.m4v"}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleUploadNewVersion(e.target.files[0]);
                        e.target.value = "";
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 px-4 py-1.5 h-8 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="size-3.5" /> Select File for V{nextVersionNumber}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <CutReviewPlayer
              key={currentVersion?.id || activeItem.id}
              ref={cutPlayerRef}
              isPhoto={isStill}
              src={videoOrPhotoSrc}
              title={`${activeItem.title} (V${activeVersionNumber})`}
              poster={resolveThumbnailUrl(currentVersion?.thumbnailUrl || activeItem.src, videoOrPhotoSrc, isStill)}
              aspectRatio={activeItem.aspectRatio || "16:9"}
              fps={24}
              showWatermark={watermarkMedia}
              watermarkText={watermarkText || "PREVIEW WATERMARK"}
              comments={currentVersionFeedback.map((f) => ({
                id: f.id,
                timestampSeconds: f.timestampSeconds,
                authorName: f.authorName,
                commentText: f.commentText,
                isResolved: f.isResolved,
              }))}
              activeCommentId={activeCommentId}
              onCommentSelect={(commentId, timestamp) => {
                setActiveCommentId(commentId);
                if (!isStill && timestamp !== null && timestamp !== undefined) {
                  cutPlayerRef.current?.seekTo(timestamp);
                }
              }}
              onTimeChange={(time, tc) => {
                if (!isStill) {
                  setCurrentCutTime(time);
                  setCurrentCutTimecode(tc);
                }
              }}
            />
          </div>

          <div className="lg:col-span-5 bg-[#1a1a1e] p-5 rounded-2xl border border-white/10 flex flex-col justify-between h-[450px]">
            <div className="space-y-3 overflow-hidden flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
                <h4 className="font-bold text-sm flex items-center gap-2 text-white">
                  <MessageCircle className="size-4 text-primary" />
                  {isStill ? "Photo Notes" : "Timecoded Notes"} (V{activeVersionNumber}: {currentVersionFeedback.length})
                </h4>
                {isStill ? (
                  <Badge variant="sage" className="text-[11px] font-mono px-2 py-0.5">
                    Still Inspection
                  </Badge>
                ) : (
                  <Badge variant="orange" className="text-[11px] font-mono px-2 py-0.5">
                    Playhead: {currentCutTimecode}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {currentVersionFeedback.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    {isStill ? (
                      <>
                        <ImageIcon className="size-8 opacity-30 mb-2" />
                        <p className="text-xs">No feedback notes yet for V{activeVersionNumber}.</p>
                        <p className="text-[11px] text-muted-foreground/60">
                          Leave comments or revision notes on this still photo.
                        </p>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="size-8 opacity-30 mb-2" />
                        <p className="text-xs">No timecoded notes yet for V{activeVersionNumber}.</p>
                        <p className="text-[11px] text-muted-foreground/60">
                          Pause the video at any frame and leave a precise comment for V{activeVersionNumber}.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  currentVersionFeedback.map((f) => {
                    const isTimecoded =
                      !isStill &&
                      f.timestampSeconds !== undefined &&
                      f.timestampSeconds !== null;
                    const tcDisplay = isTimecoded
                      ? formatTimecode(f.timestampSeconds as number, 24)
                      : "Photo Note";
                    const isSelected = activeCommentId === f.id;

                    return (
                      <div
                        key={f.id}
                        onClick={() => {
                          if (isTimecoded) {
                            cutPlayerRef.current?.seekTo(f.timestampSeconds as number);
                          }
                          setActiveCommentId(f.id);
                        }}
                        className={`p-3 rounded-xl text-xs space-y-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary/15 border-primary text-white ring-1 ring-primary"
                            : "bg-black/40 border-white/10 text-white/90 hover:bg-black/60 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="size-5 text-[9px] shrink-0">
                              <AvatarFallback className="text-[9px] bg-white/10 text-white font-mono">
                                {f.authorName ? f.authorName.slice(0, 2).toUpperCase() : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-white">{f.authorName}</span>
                          </div>
                          <Badge
                            variant={isTimecoded ? "orange" : "outline"}
                            className="text-[10px] font-mono py-0 h-4"
                          >
                            {tcDisplay}
                          </Badge>
                        </div>
                        <p className="text-white/90 leading-snug">{f.commentText}</p>

                        {/* Reply Action Button */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (replyingToCommentId === f.id) {
                                setReplyingToCommentId(null);
                              } else {
                                setReplyingToCommentId(f.id);
                                setReplyInputText("");
                              }
                            }}
                            className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1 font-mono transition-colors"
                          >
                            <CornerDownRight className="size-3" />
                            {replyingToCommentId === f.id ? "Cancel" : "Reply"}
                          </button>
                        </div>

                        {/* Threaded Replies */}
                        {f.replies && f.replies.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                            {f.replies.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-start gap-2 pl-2 border-l-2 border-primary/40 text-[11px]"
                              >
                                <Avatar className="size-4 text-[8px] shrink-0 mt-0.5">
                                  <AvatarFallback className="text-[8px] bg-white/10 text-white font-mono">
                                    {r.authorName ? r.authorName.slice(0, 2).toUpperCase() : "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-white/90 text-[10px] block font-mono">
                                    {r.authorName}
                                  </span>
                                  <p className="text-white/80 leading-snug">{r.commentText}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline Reply Input */}
                        {replyingToCommentId === f.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 pt-2 border-t border-white/10 flex gap-2"
                          >
                            <Input
                              type="text"
                              placeholder={`Reply to ${f.authorName}...`}
                              value={replyInputText}
                              onChange={(e) => setReplyInputText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendReply(f.id);
                                }
                              }}
                              autoFocus
                              className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white h-7 focus-visible:ring-1 focus-visible:ring-primary"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={!replyInputText.trim()}
                              onClick={() => handleSendReply(f.id)}
                              className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-white rounded-lg cursor-pointer"
                            >
                              <Send className="size-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendFeedback} className="pt-2 border-t border-white/10 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>{isStill ? "Note on:" : "Tagging at:"}</span>
                  <Badge variant={isStill ? "sage" : "orange"} className="text-[10px] font-mono py-0 h-4">
                    {isStill ? `Full Still (V${activeVersionNumber})` : `${currentCutTimecode} (V${activeVersionNumber})`}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={
                      isStill
                        ? `Add note for V${activeVersionNumber} still photo...`
                        : `Add note at ${currentCutTimecode} on V${activeVersionNumber}...`
                    }
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary text-white h-9"
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="submit"
                          size="sm"
                          className="size-9 p-0 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 cursor-pointer shrink-0 flex items-center justify-center"
                        >
                          <Send className="size-3.5" />
                        </Button>
                      }
                    />
                    <TooltipContent>Post timecoded feedback</TooltipContent>
                  </Tooltip>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Deliverable Asset"
        itemName={activeItem.title}
        description="Are you sure you want to permanently delete this asset from the delivery? All versions and feedback notes for this asset will also be removed."
        isDeleting={isDeletingAsset}
        onConfirm={async () => {
          if (!onDeleteAsset) return;
          setIsDeletingAsset(true);
          try {
            await onDeleteAsset(activeItem);
            setShowDeleteConfirm(false);
            onClose();
          } finally {
            setIsDeletingAsset(false);
          }
        }}
      />
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Clock, CheckCircle2, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  UniversalDialogRoot,
  UniversalDialogContent,
} from "@/components/ui/universal-dialog";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
import { CutReviewPlayerRef, isImageSource } from "@/components/video/cut-review-player";
import { directUploadMediaFile, formatBytes } from "@/components/workspaces/video-uploader";
import { setActiveVersionAction } from "@/app/actions/deliveries";
import { formatTimecode } from "@/lib/timecode";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import { parseAspectRatio, type ParsedAspectRatio } from "@/lib/media-ratios";
import { getDownloadFilename, triggerDirectDownload } from "@/lib/download";
import {
  addFeedbackAction,
  addFeedbackReplyAction,
  toggleFeedbackResolvedAction,
} from "@/app/actions/feedback";

import {
  AssetLightboxModalProps,
  FeedbackItem,
  FeedbackReplyItem,
  AssetVersionItem,
} from "./types";
import { LightboxHeader } from "./lightbox-header";
import { LightboxVersionBar } from "./lightbox-version-bar";
import { LightboxVersionUpload } from "./lightbox-version-upload";
import { LightboxFeedbackDrawer } from "./lightbox-feedback-drawer";
import { LightboxPlayerStage } from "./lightbox-player-stage";

export function AssetLightboxModal({
  activeItem,
  onClose,
  onBack,
  onNext,
  onPrev,
  feedbackList,
  onAddFeedback,
  onAddReply,
  onReconcileFeedbackId,
  onReconcileReplyId,
  onToggleResolve,
  onToggleFeedbackResolved,
  onToggleApproval,
  onDeleteAsset,
  onEditAsset,
  authorName = "Filmmaker",
  triggerToast = (msg: string) => toast(msg),
  watermarkMedia = false,
  watermarkText,
  workspaceId,
  projectId,
  workspaceSlug,
  shareToken,
  deliveryId,
  onAssetUploaded,
  showFeedback,
  showVersions = true,
  showDownload = true,
  onDownload,
  showShareLink = false,
  showApproval,
  headerExtra,
  footerExtra,
}: AssetLightboxModalProps) {
  const cutPlayerRef = useRef<CutReviewPlayerRef | null>(null);
  const [currentCutTime, setCurrentCutTime] = useState(0);
  const [currentCutTimecode, setCurrentCutTimecode] = useState("00:00:00");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Version Upload States
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Delete Confirm State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);

  // Sync selectedVersionId when activeItem changes
  useEffect(() => {
    if (activeItem) {
      const defaultVer =
        (activeItem.versionId &&
          activeItem.versions?.find((v) => v.id === activeItem.versionId)) ||
        activeItem.versions?.find((v) => v.isActiveVersion) ||
        activeItem.versions?.[activeItem.versions.length - 1] ||
        activeItem.versions?.[0];
      setSelectedVersionId(defaultVer?.id || null);
      setActiveCommentId(null);
      setCurrentCutTime(0);
      setCurrentCutTimecode("00:00:00");
      setShowUploadZone(false);
      setUploadError(null);
    } else {
      setSelectedVersionId(null);
      setActiveCommentId(null);
    }
  }, [activeItem?.id, activeItem?.versionId]);

  // Keyboard navigation for Next / Prev
  useEffect(() => {
    if (!activeItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isInput) return;
      if (e.key === "ArrowLeft" && onPrev) {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight" && onNext) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem?.id, onPrev, onNext]);

  if (!activeItem) return null;

  const allVersions: AssetVersionItem[] = activeItem.versions || [];
  const currentVersion =
    (selectedVersionId && allVersions.find((v) => v.id === selectedVersionId)) ||
    (activeItem.versionId && allVersions.find((v) => v.id === activeItem.versionId)) ||
    allVersions.find((v) => v.isActiveVersion) ||
    allVersions[allVersions.length - 1] ||
    allVersions[0] ||
    null;

  const rawUrl =
    currentVersion?.rawFileUrl ||
    activeItem.image ||
    activeItem.mediaUrl ||
    activeItem.url ||
    activeItem.rawUrl ||
    activeItem.src ||
    "";

  // Check if asset is explicitly video or film
  const isExplicitVideo =
    activeItem.type === "video" ||
    activeItem.type === "film" ||
    activeItem.kind === "film";

  // Check if asset is explicitly still or photo
  const isExplicitStill =
    activeItem.type === "photo" ||
    activeItem.type === "still" ||
    activeItem.type === "photo_gallery" ||
    activeItem.type === "image" ||
    activeItem.kind === "still" ||
    activeItem.duration === "STILL";

  // Check if any video stream/manifest or raw video file extension exists
  const cleanRaw = rawUrl.toLowerCase().split("?")[0];
  const hasRawVideoExtension =
    cleanRaw.endsWith(".mp4") ||
    cleanRaw.endsWith(".mov") ||
    cleanRaw.endsWith(".webm") ||
    cleanRaw.endsWith(".m4v") ||
    cleanRaw.endsWith(".m3u8") ||
    cleanRaw.endsWith(".ts");

  const hasVideoSource = Boolean(
    activeItem.hlsUrl ||
      activeItem.videoUrl ||
      currentVersion?.hlsManifestUrl ||
      hasRawVideoExtension
  );

  // Still assets only when explicitly classified as photo or when non-video with image source
  const isStill = isExplicitStill
    ? true
    : isExplicitVideo
    ? false
    : hasVideoSource
    ? false
    : Boolean(
        (rawUrl && isImageSource(rawUrl)) ||
          (!hasVideoSource && Boolean(activeItem.image || activeItem.src))
      );

  // Robust aspect ratio resolution
  const parsedRatio: ParsedAspectRatio = parseAspectRatio(
    typeof activeItem.aspectRatio === "object" && activeItem.aspectRatio !== null
      ? (activeItem.aspectRatio as any).id ||
          (activeItem.aspectRatio as any).cssRatio ||
          (activeItem.aspectRatio as any).numeric
      : activeItem.aspectRatio ||
          (typeof activeItem.ar === "number" && activeItem.ar > 0
            ? activeItem.ar
            : "16:9")
  );

  const resolvedAspectRatio: string =
    parsedRatio.id === "custom" ? parsedRatio.cssRatio : parsedRatio.id;
  const displayAspectRatio: string =
    parsedRatio.matchedPreset?.shortLabel || parsedRatio.id || "16:9";

  const activeVersionNumber =
    currentVersion?.versionNumber || activeItem.versionNumber || 1;
  const targetVersionId = currentVersion?.id || activeItem.versionId;

  // Source all feedback: prefer feedbackList prop if provided, otherwise activeItem.feedback
  const allAssetFeedback =
    feedbackList !== undefined
      ? feedbackList
      : activeItem.feedback || [];

  // Filter feedback for currently selected version
  const currentVersionFeedback = allAssetFeedback.filter((f) => {
    if (allVersions.length <= 1) return true;
    if (f.assetVersionId && targetVersionId) {
      return f.assetVersionId === targetVersionId;
    }
    return activeVersionNumber === 1;
  });

  const hasFeedbackMode =
    (showFeedback ?? true) &&
    (Boolean(onAddFeedback) ||
      Boolean(feedbackList && feedbackList.length > 0) ||
      Boolean(activeItem.feedback && activeItem.feedback.length > 0));

  const nextVersionNumber =
    allVersions.length > 0
      ? Math.max(...allVersions.map((v) => v.versionNumber)) + 1
      : (activeVersionNumber || 1) + 1;

  const videoOrPhotoSrc = isStill
    ? resolveMediaUrl(rawUrl) ||
      resolveThumbnailUrl(
        activeItem.thumbnailUrl || activeItem.poster || activeItem.image,
        rawUrl,
        true
      )
    : resolveMediaUrl(currentVersion?.hlsManifestUrl) ||
      resolveMediaUrl(activeItem.hlsUrl) ||
      resolveMediaUrl(activeItem.videoUrl) ||
      resolveMediaUrl(currentVersion?.rawFileUrl) ||
      resolveMediaUrl(activeItem.rawUrl) ||
      resolveMediaUrl(activeItem.playbackUrl) ||
      resolveMediaUrl(activeItem.mediaUrl) ||
      resolveMediaUrl(activeItem.url) ||
      "https://files.vidstack.io/sprite-fight/hls/stream.m3u8";

  const posterUrl = resolveThumbnailUrl(
    currentVersion?.thumbnailUrl ||
      activeItem.thumbnailUrl ||
      activeItem.poster ||
      activeItem.image,
    rawUrl,
    isStill
  );

  const rawBytes =
    currentVersion?.fileSizeBytes ||
    activeItem.fileSizeBytes ||
    activeItem.fileSize;
  const fileSizeText =
    typeof rawBytes === "number" && rawBytes > 0
      ? formatBytes(rawBytes)
      : typeof activeItem.size === "string"
      ? activeItem.size
      : "-- MB";

  // Handlers
  const handleSendFeedback = async (text: string, attachTime: boolean = true) => {
    if (!onAddFeedback) return;
    const capturedTime = isStill || !attachTime
      ? null
      : cutPlayerRef.current?.getCurrentTime() ?? currentCutTime;
    const roundedTime =
      capturedTime !== null ? Math.round(capturedTime * 100) / 100 : null;

    const targetVerId =
      targetVersionId ||
      currentVersion?.id ||
      activeItem.versionId ||
      (allVersions.length > 0 ? allVersions[0].id : undefined);

    const tempFeedback: FeedbackItem = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      assetVersionId: targetVerId,
      authorName: authorName || "Filmmaker",
      commentText: text,
      timestampSeconds: roundedTime,
      isResolved: false,
      createdAt: new Date().toISOString(),
    };

    onAddFeedback(tempFeedback);
    setActiveCommentId(tempFeedback.id);
    triggerToast(
      isStill || roundedTime === null
        ? `Note added to V${activeVersionNumber}${isStill ? " still photo" : ""}`
        : `Note tagged at [${formatTimecode(roundedTime || 0, 24)}] on V${activeVersionNumber}`
    );

    if (targetVerId) {
      try {
        const res = await addFeedbackAction({
          assetVersionId: targetVerId,
          authorName: authorName || "Filmmaker",
          commentText: text,
          timestampSeconds: roundedTime,
          shareToken,
          deliveryId,
        });

        if (res?.error) {
          console.error("Error saving feedback note:", res.error);
          toast.error(res.error || "Failed to save feedback note");
        } else if (res?.success && res.feedback) {
          onReconcileFeedbackId?.(tempFeedback.id, res.feedback.id);
        }
      } catch (err: any) {
        console.error("Error saving feedback note:", err);
        toast.error("Failed to save feedback note");
      }
    }
  };

  const handleSendReply = async (feedbackId: string, text: string) => {
    if (!onAddReply) return;
    const author = authorName || "Filmmaker";
    const tempReply: FeedbackReplyItem = {
      id: `temp_reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      feedbackId,
      authorName: author,
      commentText: text,
      createdAt: new Date().toISOString(),
    };

    onAddReply(feedbackId, tempReply);
    triggerToast("Reply posted");

    try {
      const res = await addFeedbackReplyAction({
        feedbackId,
        authorName: author,
        commentText: text,
        shareToken,
        deliveryId,
      });

      if (res?.error) {
        console.error("Error saving feedback reply:", res.error);
        toast.error(res.error || "Failed to persist reply");
      } else if (res?.success && res.reply) {
        onReconcileReplyId?.(feedbackId, tempReply.id, res.reply.id);
      }
    } catch (err: any) {
      console.error("Error saving feedback reply:", err);
      toast.error("Failed to persist reply");
    }
  };

  const handleToggleResolve = async (feedbackId: string, currentResolved: boolean) => {
    const nextResolved = !currentResolved;

    if (onToggleResolve) {
      onToggleResolve(feedbackId, currentResolved);
    } else if (onToggleFeedbackResolved) {
      onToggleFeedbackResolved(feedbackId, currentResolved);
    } else {
      try {
        const res = await toggleFeedbackResolvedAction(
          feedbackId,
          nextResolved,
          shareToken,
          deliveryId
        );
        if (res?.error) {
          toast.error(res.error || "Failed to update resolution status");
        }
      } catch (err: any) {
        console.error("Failed to toggle resolve:", err);
        toast.error("Failed to update resolution status");
      }
    }
  };

  const handleUploadNewVersion = async (file: File) => {
    if (!workspaceId || !projectId) {
      toast.error("Missing workspace or project configuration for version upload.");
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024 * 1024; // 5 GB limit
    if (file.size > maxSizeBytes) {
      setUploadError("File exceeds the 5GB limit for version uploads.");
      return;
    }

    setIsUploadingVersion(true);
    setUploadProgress(0);
    setUploadStatusText("Requesting version upload slot...");
    setUploadError(null);

    try {
      const res = await directUploadMediaFile({
        workspaceId,
        projectId,
        file,
        title: `${activeItem.title} V${nextVersionNumber}`,
        assetType: isStill ? "photo_gallery" : "video",
        assetId: String(activeItem.id),
        aspectRatio: resolvedAspectRatio,
        onProgress: (percent, loaded, total) => {
          setUploadProgress(percent);
          setUploadStatusText(
            `Uploading ${formatBytes(loaded)} of ${formatBytes(total)} (${percent}%)`
          );
        },
        onStatusChange: (status) => setUploadStatusText(status),
        onXhrCreated: (xhr) => {
          xhrRef.current = xhr;
        },
      });

      if (res && res.assetVersion) {
        triggerToast(
          `Version V${res.assetVersion.versionNumber || nextVersionNumber} uploaded successfully!`
        );
        setShowUploadZone(false);
        setSelectedVersionId(res.assetVersion.id);

        if (onAssetUploaded) {
          onAssetUploaded(res.asset, res.assetVersion);
        }
      }
    } catch (err: any) {
      console.error("Failed to upload asset version:", err);
      setUploadError(
        err.message || "Failed to upload new version. Please try again."
      );
    } finally {
      setIsUploadingVersion(false);
      xhrRef.current = null;
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setIsUploadingVersion(false);
    setUploadProgress(0);
    setUploadStatusText("");
    setUploadError("Upload was cancelled.");
  };

  const handleMakeVersionActive = async (versionId: string, versionNum: number) => {
    if (!projectId) return;
    try {
      const res = await setActiveVersionAction(String(activeItem.id), versionId, {
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

  const handleDownload = () => {
    if (onDownload) {
      onDownload(activeItem, currentVersion);
      return;
    }
    const dlUrl =
      currentVersion?.downloadUrl ||
      currentVersion?.rawFileUrl ||
      activeItem.downloadUrl ||
      activeItem.mediaUrl ||
      activeItem.url ||
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
      activeItem.type || (isStill ? "photo" : "video")
    );
    triggerDirectDownload(dlUrl, filename);
    triggerToast(`Downloading ${activeItem.title}`);
  };

  const isApproved =
    activeItem.status === "approved" || Boolean(activeItem.isApproved);
  const hasApprovalSection =
    showApproval !== undefined
      ? showApproval
      : Boolean(
          onToggleApproval ||
            activeItem.status ||
            activeItem.isApproved !== undefined
        );

  return (
    <UniversalDialogRoot
      open={Boolean(activeItem)}
      onOpenChange={(open) => !open && onClose()}
    >
      <UniversalDialogContent
        size="3xl"
        showCloseButton={false}
        overlayClassName="bg-black/85 backdrop-blur-md"
        className="w-full sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 bg-[#141418]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl text-white outline-none"
      >
        <div className="flex flex-col h-full max-h-[92vh] w-full overflow-hidden">
          {/* 1. Top Minimalist Header */}
          <div className="p-5 sm:p-6 pb-2 shrink-0">
            <LightboxHeader
              title={activeItem.title}
              isStill={isStill}
              fileSizeText={fileSizeText}
              activeVersionNumber={activeVersionNumber}
              hasVersions={allVersions.length > 0}
              category={activeItem.category}
              displayAspectRatio={displayAspectRatio}
              timecode={activeItem.tc}
              status={activeItem.status}
              onBack={onBack}
              onClose={onClose}
              headerExtra={headerExtra}
              showShareLink={showShareLink}
              onShareLink={() => {
                if (typeof window !== "undefined") {
                  navigator.clipboard.writeText(window.location.href);
                  triggerToast("Link copied to clipboard");
                }
              }}
              onDeleteAsset={
                onDeleteAsset ? () => setShowDeleteConfirm(true) : undefined
              }
            />
          </div>

          {/* Scrollable Stage & Feedback Content */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 sm:px-6 pb-6 pt-1 flex flex-col gap-4">
            {/* 2. Media Player Stage */}
        <div className="w-full shrink-0">
          <LightboxPlayerStage
            keyId={currentVersion?.id || String(activeItem.id)}
            playerRef={cutPlayerRef}
            isStill={isStill}
            mediaSrc={videoOrPhotoSrc}
            posterUrl={posterUrl}
            title={`${activeItem.title}${
              allVersions.length > 0 ? ` (V${activeVersionNumber})` : ""
            }`}
            resolvedAspectRatio={resolvedAspectRatio}
            watermarkMedia={watermarkMedia}
            watermarkText={watermarkText || "PREVIEW WATERMARK"}
            feedbackList={currentVersionFeedback}
            activeCommentId={activeCommentId}
            onCommentSelect={(commentId, timestamp) => {
              setActiveCommentId(commentId);
              if (
                !isStill &&
                timestamp !== null &&
                timestamp !== undefined
              ) {
                cutPlayerRef.current?.seekTo(timestamp);
              }
            }}
            onTimeChange={(time, tc) => {
              if (!isStill) {
                setCurrentCutTime(time);
                setCurrentCutTimecode(tc);
              }
            }}
            onPrev={onPrev}
            onNext={onNext}
          />
        </div>

        {/* 3. Version Pills & Manage Versions Section */}
        {showVersions && (
          <div className="flex flex-col gap-3 w-full">
            <LightboxVersionBar
              versions={allVersions}
              selectedVersionId={currentVersion?.id || selectedVersionId}
              onSelectVersion={(verId) => {
                setSelectedVersionId(verId);
                setActiveCommentId(null);
                setCurrentCutTime(0);
                setCurrentCutTimecode("00:00:00");
              }}
              allFeedback={allAssetFeedback}
              canMakeActive={Boolean(workspaceId && projectId)}
              onMakeVersionActive={handleMakeVersionActive}
              canUploadVersion={Boolean(workspaceId && projectId)}
              showUploadZone={showUploadZone}
              onToggleUploadZone={() => setShowUploadZone((prev) => !prev)}
              isUploadingVersion={isUploadingVersion}
              nextVersionNumber={nextVersionNumber}
              onEditAsset={onEditAsset ? () => onEditAsset(activeItem) : undefined}
            />

            {/* Expandable Version Upload Dropzone */}
            {showUploadZone && (
              <LightboxVersionUpload
                nextVersionNumber={nextVersionNumber}
                isStill={isStill}
                isUploading={isUploadingVersion}
                uploadProgress={uploadProgress}
                uploadStatusText={uploadStatusText}
                uploadError={uploadError}
                onUploadFile={handleUploadNewVersion}
                onCancelUpload={cancelUpload}
                onClose={() => {
                  setShowUploadZone(false);
                  setUploadError(null);
                }}
              />
            )}
          </div>
        )}

        {/* 4. Action Buttons Row (Download & Approve) */}
        {(hasApprovalSection || showDownload) && (
          <div className="flex items-center gap-2.5 sm:gap-3 pt-1 flex-wrap">
            {/* Download Button */}
            {showDownload && (
              <Button
                type="button"
                onClick={handleDownload}
                className="relative overflow-hidden inline-flex items-center justify-center gap-2 font-bold text-xs sm:text-sm tracking-wider uppercase rounded-2xl px-5 sm:px-6 py-2.5 sm:py-3 text-white transition-all duration-200 cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98] border border-[rgba(var(--acc2-rgb,255,138,69),0.55)] bg-gradient-to-b from-[rgba(var(--acc2-rgb,255,138,69),0.55)] via-[rgba(var(--acc-rgb,245,85,29),0.48)] to-[rgba(var(--acc-dk-rgb,175,50,15),0.6)] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_-6px_rgba(var(--acc-rgb,245,85,29),0.55)] h-auto"
              >
                <Download className="size-4 shrink-0" />
                <span>DOWNLOAD</span>
              </Button>
            )}

            {/* Approval Button */}
            {hasApprovalSection &&
              (onToggleApproval ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        onClick={() =>
                          onToggleApproval(
                            String(activeItem.id),
                            activeItem.status || (isApproved ? "approved" : "in_review")
                          )
                        }
                        className={`inline-flex items-center justify-center gap-2 font-bold text-xs sm:text-sm tracking-wider uppercase rounded-2xl px-5 sm:px-6 py-2.5 sm:py-3 transition-all duration-200 cursor-pointer backdrop-blur-md shadow-md hover:scale-[1.02] active:scale-[0.98] h-auto ${
                          isApproved
                            ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-amber-300"
                            : "bg-white/[0.07] hover:bg-white/[0.12] border border-white/20 hover:border-white/30 text-white"
                        }`}
                      >
                        <Check className="size-4 stroke-[2.5] shrink-0" />
                        <span>
                          {isApproved ? "Approved · tap to undo" : "Approve this asset"}
                        </span>
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {isApproved
                      ? "Click to request revisions on this cut"
                      : "Approve this asset version"}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div
                  className={`inline-flex items-center justify-center gap-2 font-bold text-xs sm:text-sm tracking-wider uppercase rounded-2xl px-5 sm:px-6 py-2.5 sm:py-3 backdrop-blur-md shadow-md ${
                    isApproved
                      ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                      : "bg-white/[0.05] border border-white/10 text-zinc-400"
                  }`}
                >
                  {isApproved ? (
                    <>
                      <Check className="size-4 stroke-[2.5] shrink-0" />
                      <span>Approved</span>
                    </>
                  ) : (
                    <>
                      <Clock className="size-4 stroke-[2.5] shrink-0 text-primary" />
                      <span>Awaiting client approval</span>
                    </>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* 5. Client Comments Section */}
        {hasFeedbackMode && (
          <div className="w-full">
            <LightboxFeedbackDrawer
              assetTitle={activeItem.title}
              isStill={isStill}
              activeVersionNumber={activeVersionNumber}
              feedbackList={currentVersionFeedback}
              activeCommentId={activeCommentId}
              currentCutTimecode={currentCutTimecode}
              onSelectComment={(commentId, timestamp) => {
                setActiveCommentId(commentId);
                if (
                  !isStill &&
                  timestamp !== null &&
                  timestamp !== undefined
                ) {
                  cutPlayerRef.current?.seekTo(timestamp);
                }
              }}
              onAddFeedback={handleSendFeedback}
              onAddReply={handleSendReply}
              onToggleResolve={handleToggleResolve}
            />
          </div>
        )}

        {/* 6. Optional Custom Footer / Inquiry CTAs */}
        {footerExtra && (
          <div className="w-full pt-3 mt-1 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 shrink-0">
            {footerExtra}
          </div>
        )}
          </div>
        </div>
      </UniversalDialogContent>

      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Deliverable Asset"
        itemName={activeItem.title}
        description="Are you sure you want to permanently delete this asset? All versions and feedback notes for this asset will also be removed."
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
    </UniversalDialogRoot>
  );
}

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
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
import { addFeedbackAction, addFeedbackReplyAction } from "@/app/actions/feedback";

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
  onAssetUploaded,
  showFeedback,
  showVersions = true,
  showDownload = true,
  showShareLink = false,
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

  const isStill = Boolean(
    activeItem.type === "photo" ||
      activeItem.type === "still" ||
      activeItem.type === "photo_gallery" ||
      activeItem.type === "image" ||
      activeItem.kind === "still" ||
      activeItem.duration === "STILL" ||
      (activeItem.src && isImageSource(activeItem.src)) ||
      (activeItem.url && isImageSource(activeItem.url)) ||
      (!activeItem.videoUrl &&
        !activeItem.hlsUrl &&
        !activeItem.mediaUrl &&
        Boolean(activeItem.image || activeItem.src))
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

  const allVersions: AssetVersionItem[] = activeItem.versions || [];
  const currentVersion =
    (selectedVersionId && allVersions.find((v) => v.id === selectedVersionId)) ||
    (activeItem.versionId && allVersions.find((v) => v.id === activeItem.versionId)) ||
    allVersions.find((v) => v.isActiveVersion) ||
    allVersions[allVersions.length - 1] ||
    allVersions[0] ||
    null;

  const activeVersionNumber =
    currentVersion?.versionNumber || activeItem.versionNumber || 1;
  const targetVersionId = currentVersion?.id || activeItem.versionId;

  // Source all feedback: prefer activeItem.feedback if populated, otherwise feedbackList prop
  const allAssetFeedback =
    activeItem.feedback && activeItem.feedback.length > 0
      ? activeItem.feedback
      : feedbackList || [];

  // Filter feedback for currently selected version
  const currentVersionFeedback = allAssetFeedback.filter((f) => {
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

  const rawUrl =
    currentVersion?.rawFileUrl ||
    activeItem.image ||
    activeItem.mediaUrl ||
    activeItem.url ||
    activeItem.rawUrl ||
    activeItem.src ||
    "";

  const videoOrPhotoSrc = isStill
    ? resolveMediaUrl(rawUrl) ||
      resolveThumbnailUrl(
        activeItem.thumbnailUrl || activeItem.poster || activeItem.image,
        rawUrl,
        true
      )
    : resolveMediaUrl(currentVersion?.hlsManifestUrl) ||
      resolveMediaUrl(currentVersion?.rawFileUrl) ||
      resolveMediaUrl(activeItem.hlsUrl) ||
      resolveMediaUrl(activeItem.videoUrl) ||
      resolveMediaUrl(activeItem.playbackUrl) ||
      resolveMediaUrl(activeItem.mediaUrl) ||
      resolveMediaUrl(activeItem.url) ||
      resolveMediaUrl(activeItem.rawUrl) ||
      "https://files.vidstack.io/sprite-fight/hls/stream.m3u8";

  const posterUrl = resolveThumbnailUrl(
    currentVersion?.thumbnailUrl ||
      activeItem.thumbnailUrl ||
      activeItem.poster ||
      activeItem.image,
    rawUrl,
    isStill
  );

  // Handlers
  const handleSendFeedback = async (text: string) => {
    if (!onAddFeedback) return;
    const capturedTime = isStill
      ? null
      : cutPlayerRef.current?.getCurrentTime() ?? currentCutTime;
    const roundedTime =
      capturedTime !== null ? Math.round(capturedTime * 100) / 100 : null;

    const tempFeedback: FeedbackItem = {
      id: `temp_${Date.now()}`,
      assetVersionId: targetVersionId,
      authorName: authorName || "Filmmaker",
      commentText: text,
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
        commentText: text,
        timestampSeconds: roundedTime,
      }).catch((err) => {
        console.error("Error saving feedback note:", err);
        toast.error("Failed to save feedback note");
      });
    }
  };

  const handleSendReply = async (feedbackId: string, text: string) => {
    if (!onAddReply) return;
    const author = authorName || "Filmmaker";
    const tempReply: FeedbackReplyItem = {
      id: `temp_reply_${Date.now()}`,
      feedbackId,
      authorName: author,
      commentText: text,
      createdAt: new Date().toISOString(),
    };

    onAddReply(feedbackId, tempReply);
    triggerToast("Reply posted");

    try {
      await addFeedbackReplyAction({
        feedbackId,
        authorName: author,
        commentText: text,
      });
    } catch (err: any) {
      console.error("Error saving feedback reply:", err);
      toast.error("Failed to persist reply");
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

  return (
    <UniversalDialogRoot
      open={Boolean(activeItem)}
      onOpenChange={(open) => !open && onClose()}
    >
      <UniversalDialogContent
        size="full"
        showCloseButton={false}
        overlayClassName="bg-black/90 backdrop-blur-md"
        className="w-[96vw] max-w-[1540px] h-[92vh] max-h-[94vh] flex flex-col p-4 sm:p-6 bg-[#0f0f13] border border-white/15 shadow-2xl rounded-3xl text-white outline-none overflow-hidden"
      >
        {/* Top Header Bar */}
        <LightboxHeader
          title={activeItem.title}
          isStill={isStill}
          activeVersionNumber={activeVersionNumber}
          hasVersions={allVersions.length > 0}
          category={activeItem.category}
          displayAspectRatio={displayAspectRatio}
          timecode={activeItem.tc}
          status={activeItem.status}
          onToggleApproval={
            onToggleApproval
              ? () => onToggleApproval(String(activeItem.id), activeItem.status!)
              : undefined
          }
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
          showDownload={showDownload}
          onDownload={handleDownload}
          showVersions={showVersions}
          canUploadVersion={Boolean(workspaceId && projectId)}
          onToggleUploadZone={() => setShowUploadZone((prev) => !prev)}
          isUploadingVersion={isUploadingVersion}
          showUploadZone={showUploadZone}
          nextVersionNumber={nextVersionNumber}
          onEditAsset={onEditAsset ? () => onEditAsset(activeItem) : undefined}
          onDeleteAsset={
            onDeleteAsset ? () => setShowDeleteConfirm(true) : undefined
          }
        />

        {/* Content Body */}
        <div className="flex-1 min-h-0 flex flex-col gap-3.5 pt-3 overflow-hidden">
          {/* Version Switcher Bar */}
          {showVersions && (
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
            />
          )}

          {/* Expandable Version Upload Dropzone */}
          {showVersions && showUploadZone && (
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

          {/* Center Stage + Feedback Grid */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div
              className={
                hasFeedbackMode
                  ? "grid grid-cols-1 lg:grid-cols-12 gap-5 h-full min-h-0 items-stretch"
                  : "w-full h-full flex items-center justify-center min-h-0"
              }
            >
              {/* Left Media Stage Column */}
              <div
                className={
                  hasFeedbackMode
                    ? "lg:col-span-8 h-full min-h-0 relative flex items-center justify-center"
                    : "w-full h-full relative flex items-center justify-center"
                }
              >
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

              {/* Right Feedback Column (Delivery Review Mode) */}
              {hasFeedbackMode && (
                <div className="lg:col-span-4 h-full min-h-0">
                  <LightboxFeedbackDrawer
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
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional Custom Footer / Inquiry CTAs */}
        {footerExtra && (
          <div className="w-full pt-3 mt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400 shrink-0">
            {footerExtra}
          </div>
        )}
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

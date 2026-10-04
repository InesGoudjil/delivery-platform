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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographyH3 } from "@/components/ui/typography";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
import { CutReviewPlayer, type CutReviewPlayerRef } from "@/components/video/cut-review-player";
import { formatTimecode } from "@/lib/timecode";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import { getDownloadFilename, triggerDirectDownload } from "@/lib/download";
import { addFeedbackAction } from "@/app/actions/feedback";
import type { GalleryItem, FeedbackItem } from "./types";

interface AssetLightboxModalProps {
  activeItem: GalleryItem | null;
  onClose: () => void;
  feedbackList?: FeedbackItem[];
  onAddFeedback: (feedback: FeedbackItem) => void;
  onToggleApproval: (itemId: string, currentStatus: string) => void;
  onDeleteAsset?: (item: GalleryItem) => Promise<void> | void;
  onEditAsset?: (item: GalleryItem) => void;
  authorName: string;
  triggerToast: (msg: string) => void;
  watermarkMedia?: boolean;
  watermarkText?: string;
}

export function AssetLightboxModal({
  activeItem,
  onClose,
  feedbackList,
  onAddFeedback,
  onToggleApproval,
  onDeleteAsset,
  onEditAsset,
  authorName,
  triggerToast,
  watermarkMedia = false,
  watermarkText,
}: AssetLightboxModalProps) {
  const cutPlayerRef = useRef<CutReviewPlayerRef | null>(null);
  const [currentCutTime, setCurrentCutTime] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const [currentCutTimecode, setCurrentCutTimecode] = useState("00:00:00");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

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
      }).catch((err) => console.error("Error saving feedback note:", err));
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
              <ImageIcon className="size-6 text-[#f5551d]" />
            ) : (
              <FileVideo className="size-6 text-[#f5551d]" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <TypographyH3 className="font-bold text-base text-white">{activeItem.title}</TypographyH3>
                <Badge variant="orange" className="text-[10px] font-mono font-bold">
                  V{activeVersionNumber}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Aspect: {activeItem.aspectRatio} · Format: {isStill ? "Hi-Res Still" : "4K ProRes"}
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
                      const dlUrl = currentVersion?.downloadUrl || currentVersion?.rawFileUrl || activeItem.rawUrl;
                      if (!dlUrl) {
                        triggerToast("No master file available for download.");
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

        {/* Version Switcher if multiple versions exist */}
        {activeItem.versions && activeItem.versions.length > 1 && (
          <div className="flex items-center gap-2 bg-[#1a1a1e] p-2 rounded-xl border border-white/10">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-2 flex items-center gap-1.5">
              <Layers className="size-3.5 text-[#f5551d]" /> Version:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeItem.versions.map((ver) => {
                const isActive = currentVersion?.id === ver.id;
                const verFeedbackCount = allAssetFeedback.filter(
                  (f) => f.assetVersionId === ver.id || (!f.assetVersionId && ver.versionNumber === 1)
                ).length;
                return (
                  <Button
                    key={ver.id}
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => {
                      setSelectedVersionId(ver.id);
                      setActiveCommentId(null);
                      setCurrentCutTime(0);
                      setCurrentCutTimecode("00:00:00");
                    }}
                    className={`px-3 py-1 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#f5551d] text-black hover:bg-[#e0440d] shadow-md shadow-[#f5551d]/20 border-transparent"
                        : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span>V{ver.versionNumber}</span>
                    {verFeedbackCount > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          isActive
                            ? "bg-black/25 text-black"
                            : "bg-white/15 text-white/90"
                        }`}
                      >
                        {verFeedbackCount}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
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
                  <MessageCircle className="size-4 text-[#f5551d]" />
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
                            ? "bg-[#f5551d]/15 border-[#f5551d] text-white ring-1 ring-[#f5551d]"
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
                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs focus-visible:ring-1 focus-visible:ring-[#f5551d] focus-visible:border-[#f5551d] text-white h-9"
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="submit"
                          size="sm"
                          className="size-9 p-0 rounded-xl bg-[#f5551d] text-black font-bold hover:bg-[#ff8a45] cursor-pointer shrink-0 flex items-center justify-center"
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

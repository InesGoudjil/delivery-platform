"use client";

import { useState, useRef } from "react";
import {
  FileVideo,
  Check,
  X,
  MessageCircle,
  Send,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CutReviewPlayer, type CutReviewPlayerRef } from "@/components/video/cut-review-player";
import { formatTimecode } from "@/lib/timecode";
import { addFeedbackAction } from "@/app/actions/feedback";
import type { GalleryItem, FeedbackItem } from "./types";

interface AssetLightboxModalProps {
  activeItem: GalleryItem | null;
  onClose: () => void;
  feedbackList: FeedbackItem[];
  onAddFeedback: (feedback: FeedbackItem) => void;
  onToggleApproval: (itemId: string, currentStatus: string) => void;
  authorName: string;
  triggerToast: (msg: string) => void;
}

export function AssetLightboxModal({
  activeItem,
  onClose,
  feedbackList,
  onAddFeedback,
  onToggleApproval,
  authorName,
  triggerToast,
}: AssetLightboxModalProps) {
  const cutPlayerRef = useRef<CutReviewPlayerRef | null>(null);
  const [currentCutTime, setCurrentCutTime] = useState(0);
  const [currentCutTimecode, setCurrentCutTimecode] = useState("00:00:00");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  if (!activeItem) return null;

  const isStill = activeItem.type === "photo" || activeItem.duration === "STILL";

  const currentVersion =
    (selectedVersionId && activeItem.versions?.find((v) => v.id === selectedVersionId)) ||
    (activeItem.versionId && activeItem.versions?.find((v) => v.id === activeItem.versionId)) ||
    activeItem.versions?.[activeItem.versions.length - 1] ||
    null;

  const activeVersionNumber = currentVersion?.versionNumber || activeItem.versionNumber || 1;
  const targetVersionId = currentVersion?.id || activeItem.versionId;

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newCommentText = replyText.trim();
    setReplyText("");

    const capturedTime = isStill ? null : (cutPlayerRef.current?.getCurrentTime() ?? currentCutTime);
    const roundedTime = capturedTime !== null ? Math.round(capturedTime * 100) / 100 : null;

    const tempFeedback: FeedbackItem = {
      id: `temp_${Date.now()}`,
      authorName: authorName || "Filmmaker",
      commentText: newCommentText,
      timestampSeconds: roundedTime,
      createdAt: new Date().toISOString(),
    };

    onAddFeedback(tempFeedback);
    setActiveCommentId(tempFeedback.id);
    triggerToast(
      isStill
        ? "Note added to still image"
        : `Note tagged at [${formatTimecode(roundedTime || 0, 24)}]`
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
    ? (currentVersion?.rawFileUrl || activeItem.src)
    : (currentVersion?.hlsManifestUrl ||
      currentVersion?.rawFileUrl ||
      activeItem.hlsUrl ||
      activeItem.videoUrl ||
      (activeItem.rawUrl &&
      !activeItem.rawUrl.includes("unsplash.com") &&
      (activeItem.rawUrl.endsWith(".mp4") ||
        activeItem.rawUrl.endsWith(".m3u8") ||
        activeItem.rawUrl.startsWith("/api/mock-upload"))
        ? activeItem.rawUrl
        : "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"));

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
                <h3 className="font-bold text-base">{activeItem.title}</h3>
                <span className="text-[10px] font-mono font-bold bg-[#f5551d]/10 text-[#f5551d] border border-[#f5551d]/20 px-2 py-0.5 rounded-full">
                  V{activeVersionNumber}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Aspect: {activeItem.aspectRatio} · Format: {isStill ? "Hi-Res Still" : "4K ProRes"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
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
            <button
              type="button"
              onClick={onClose}
              className="size-9 rounded-full bg-white/10 text-muted-foreground hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="size-5" />
            </button>
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
                const isActive = (currentVersion?.id || activeItem.versionId) === ver.id;
                return (
                  <button
                    key={ver.id}
                    type="button"
                    onClick={() => setSelectedVersionId(ver.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#f5551d] text-black shadow-md shadow-[#f5551d]/20"
                        : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    V{ver.versionNumber}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <CutReviewPlayer
              ref={cutPlayerRef}
              isPhoto={isStill}
              src={videoOrPhotoSrc}
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
                  {isStill ? "Photo Notes" : "Timecoded Notes"} ({feedbackList.length})
                </h4>
                {isStill ? (
                  <span className="text-[11px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    Still Inspection
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-[#ff8a45] bg-[#f5551d]/10 px-2 py-0.5 rounded border border-[#f5551d]/20">
                    Playhead: {currentCutTimecode}
                  </span>
                )}
              </div>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {feedbackList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    {isStill ? (
                      <>
                        <ImageIcon className="size-8 opacity-30 mb-2" />
                        <p className="text-xs">No feedback notes yet.</p>
                        <p className="text-[11px] text-muted-foreground/60">
                          Leave comments or revision notes on this still photo.
                        </p>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="size-8 opacity-30 mb-2" />
                        <p className="text-xs">No timecoded notes yet.</p>
                        <p className="text-[11px] text-muted-foreground/60">
                          Pause the video at any frame and leave a precise comment.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  feedbackList.map((f) => {
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
                        className={`p-3 rounded-xl text-xs space-y-1 border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#f5551d]/15 border-[#f5551d] text-white ring-1 ring-[#f5551d]"
                            : "bg-black/40 border-white/10 text-white/90 hover:bg-black/60 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span className="font-semibold text-white">{f.authorName}</span>
                          <span className={isTimecoded ? "text-[#ff8a45] font-bold" : "text-white/40"}>
                            [{tcDisplay}]
                          </span>
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
                  <span className={isStill ? "text-white/70 font-semibold" : "text-[#ff8a45] font-bold"}>
                    {isStill ? "Full Still" : `[${currentCutTimecode}]`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      isStill
                        ? "Add note for this still photo..."
                        : `Add note at ${currentCutTimecode}...`
                    }
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
  );
}

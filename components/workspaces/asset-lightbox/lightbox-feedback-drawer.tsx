"use client";

import React, { useState } from "react";
import {
  MessageCircle,
  CornerDownRight,
  Send,
  ImageIcon,
  Clock,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  TypographyH4,
  TypographyP,
  TypographySmall,
  TypographyMuted,
  TypographySpan,
} from "@/components/ui/typography";
import { formatTimecode } from "@/lib/timecode";
import { FeedbackItem, FeedbackReplyItem } from "./types";

export interface LightboxFeedbackDrawerProps {
  isStill: boolean;
  activeVersionNumber: number;
  feedbackList: FeedbackItem[];
  activeCommentId: string | null;
  onSelectComment: (commentId: string, timestamp?: number | null) => void;
  currentCutTimecode: string;
  onAddFeedback?: (text: string) => Promise<void> | void;
  onAddReply?: (feedbackId: string, text: string) => Promise<void> | void;
}

export function LightboxFeedbackDrawer({
  isStill,
  activeVersionNumber,
  feedbackList,
  activeCommentId,
  onSelectComment,
  currentCutTimecode,
  onAddFeedback,
  onAddReply,
}: LightboxFeedbackDrawerProps) {
  const [inputText, setInputText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !onAddFeedback || isSubmitting) return;

    const text = inputText.trim();
    setInputText("");
    setIsSubmitting(true);
    try {
      await onAddFeedback(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (feedbackId: string) => {
    if (!replyInputText.trim() || !onAddReply) return;
    const text = replyInputText.trim();
    setReplyInputText("");
    setReplyingToId(null);
    await onAddReply(feedbackId, text);
  };

  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl flex flex-col justify-between h-full min-h-[440px] overflow-hidden shadow-xl">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#18181d] shrink-0">
        <TypographyH4 className="font-heading font-bold text-xs sm:text-sm flex items-center gap-2 text-white">
          <MessageCircle className="size-4 text-primary" />
          <TypographySpan>{isStill ? "Still Photo Notes" : "Timecoded Notes"}</TypographySpan>
          <TypographySpan className="text-zinc-500  text-xs">
            (V{activeVersionNumber}: {feedbackList.length})
          </TypographySpan>
        </TypographyH4>

        {isStill ? (
          <Badge variant="sage" className="text-[10px]  px-2 py-0.5">
            Photo Cut
          </Badge>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-[11px]  text-primary font-bold">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <TypographySpan>{currentCutTimecode}</TypographySpan>
          </div>
        )}
      </div>

      {/* Scrollable Comments List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar min-h-0">
        {feedbackList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground select-none">
            {isStill ? (
              <>
                <ImageIcon className="size-8 opacity-25 mb-2 text-primary" />
                <TypographySmall className="text-xs text-zinc-300">
                  No notes yet for V{activeVersionNumber}.
                </TypographySmall>
                <TypographyMuted className="text-[11px] text-zinc-500 mt-1 max-w-[200px]">
                  Leave revisions or approval feedback on this photo still.
                </TypographyMuted>
              </>
            ) : (
              <>
                <MessageCircle className="size-8 opacity-25 mb-2 text-primary" />
                <TypographySmall className="text-xs text-zinc-300">
                  No timecoded notes for V{activeVersionNumber}.
                </TypographySmall>
                <TypographyMuted className="text-[11px] text-zinc-500 mt-1 max-w-[220px]">
                  Pause the video at any frame to pin a frame-accurate note.
                </TypographyMuted>
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
              : "Still Note";
            const isSelected = activeCommentId === f.id;

            return (
              <div
                key={f.id}
                onClick={() => {
                  onSelectComment(f.id, f.timestampSeconds);
                }}
                className={`p-3 rounded-xl text-xs space-y-2 border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary/15 border-primary text-white ring-1 ring-primary/50 shadow-md"
                    : "bg-black/40 border-white/10 text-white/90 hover:bg-black/60 hover:border-white/20"
                }`}
              >
                {/* Author & Timestamp Bar */}
                <div className="flex items-center justify-between text-[11px] ">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar className="size-5.5 text-[9px] shrink-0 border border-white/10">
                      <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-bold">
                        {f.authorName ? f.authorName.slice(0, 2).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <TypographySpan className="font-semibold text-white truncate max-w-[120px]">
                      {f.authorName}
                    </TypographySpan>
                  </div>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge
                          variant={isTimecoded ? "orange" : "outline"}
                          className="text-[10px]  py-0 h-4 flex items-center gap-1 cursor-pointer hover:opacity-80"
                        >
                          {isTimecoded && <Play className="size-2 fill-current" />}
                          <TypographySpan>{tcDisplay}</TypographySpan>
                        </Badge>
                      }
                    />
                    <TooltipContent>
                      {isTimecoded ? `Jump player to ${tcDisplay}` : "Photo note"}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Comment Text */}
                <TypographyP className="text-white/95 leading-relaxed text-xs">
                  {f.commentText}
                </TypographyP>

                {/* Action Bar (Reply toggle) */}
                {onAddReply && (
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (replyingToId === f.id) {
                          setReplyingToId(null);
                        } else {
                          setReplyingToId(f.id);
                          setReplyInputText("");
                        }
                      }}
                      className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1  transition-colors cursor-pointer"
                    >
                      <CornerDownRight className="size-3" />
                      <TypographySpan>{replyingToId === f.id ? "Cancel Reply" : "Reply"}</TypographySpan>
                    </button>
                  </div>
                )}

                {/* Threaded Replies */}
                {f.replies && f.replies.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                    {f.replies.map((r: FeedbackReplyItem) => (
                      <div
                        key={r.id}
                        className="flex items-start gap-2 pl-2.5 border-l-2 border-primary/50 text-xs"
                      >
                        <Avatar className="size-4.5 text-[8px] shrink-0 mt-0.5">
                          <AvatarFallback className="text-[8px] bg-white/10 text-white  font-bold">
                            {r.authorName ? r.authorName.slice(0, 2).toUpperCase() : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <TypographySpan className="font-semibold text-white/90 text-[10px] block ">
                            {r.authorName}
                          </TypographySpan>
                          <TypographyP className="text-white/80 leading-snug text-xs">
                            {r.commentText}
                          </TypographyP>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Reply Input */}
                {replyingToId === f.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 pt-2 border-t border-white/10 flex gap-2 animate-in fade-in duration-150"
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
                      className="flex-1 bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white h-7.5 focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!replyInputText.trim()}
                      onClick={() => handleSendReply(f.id)}
                      className="h-7.5 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg cursor-pointer"
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

      {/* Bottom Sticky Note Input Bar */}
      {onAddFeedback && (
        <form
          onSubmit={handleSendFeedback}
          className="p-3 border-t border-white/10 bg-[#18181d] flex flex-col gap-2 shrink-0"
        >
          <div className="flex items-center justify-between text-[10px]  text-muted-foreground px-1">
            <TypographySpan className="flex items-center gap-1">
              <Clock className="size-3 text-primary" />
              <TypographySpan>{isStill ? "Note on Still:" : "Tagging at Timecode:"}</TypographySpan>
            </TypographySpan>
            <Badge
              variant={isStill ? "sage" : "orange"}
              className="text-[10px]  py-0 h-4"
            >
              {isStill
                ? `V${activeVersionNumber} Still`
                : `${currentCutTimecode} (V${activeVersionNumber})`}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={
                isStill
                  ? `Add note on V${activeVersionNumber} still...`
                  : `Note at ${currentCutTimecode} on V${activeVersionNumber}...`
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSubmitting}
              className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary text-white h-9 placeholder:text-zinc-500"
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!inputText.trim() || isSubmitting}
                    className="size-9 p-0 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 cursor-pointer shrink-0 flex items-center justify-center shadow-md shadow-primary/20 disabled:opacity-40"
                  >
                    <Send className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>Post timecoded note</TooltipContent>
            </Tooltip>
          </div>
        </form>
      )}
    </div>
  );
}

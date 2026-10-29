"use client";

import React, { useState } from "react";
import {
  MessageCircle,
  CornerDownRight,
  Send,
  Clock,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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
  const [attachTime, setAttachTime] = useState(true);
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
    <div className="bg-[#18181d]/90 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-lg w-full">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <span>Client comments</span>
          {feedbackList.length > 0 && (
            <span className="text-xs text-zinc-400 font-normal">
              ({feedbackList.length})
            </span>
          )}
        </h4>
        {!isStill && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-400">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span>{currentCutTimecode}</span>
          </div>
        )}
      </div>

      {/* 2. Comments List / Empty State */}
      {feedbackList.length === 0 ? (
        <p className="text-xs text-zinc-400 py-1 select-none">No comments yet.</p>
      ) : (
        <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
          {feedbackList.map((f) => {
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
                onClick={() => onSelectComment(f.id, f.timestampSeconds)}
                className={`p-3 rounded-xl text-xs space-y-2 border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary/15 border-primary text-white ring-1 ring-primary/40 shadow-md"
                    : "bg-white/[0.03] border-white/10 text-white/90 hover:bg-white/[0.06] hover:border-white/20"
                }`}
              >
                {/* Author & Timestamp Bar */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar className="size-5 text-[9px] shrink-0 border border-white/10">
                      <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-bold">
                        {f.authorName ? f.authorName.slice(0, 2).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-white truncate max-w-[120px]">
                      {f.authorName}
                    </span>
                  </div>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge
                          variant={isTimecoded ? "orange" : "outline"}
                          className="text-[10px] py-0 h-4 flex items-center gap-1 cursor-pointer hover:opacity-80"
                        >
                          {isTimecoded && <Play className="size-2 fill-current" />}
                          <span>{tcDisplay}</span>
                        </Badge>
                      }
                    />
                    <TooltipContent>
                      {isTimecoded ? `Jump player to ${tcDisplay}` : "Photo note"}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Comment Text */}
                <p className="text-white/95 leading-relaxed text-xs">
                  {f.commentText}
                </p>

                {/* Reply Toggle */}
                {onAddReply && (
                  <div className="flex items-center justify-between pt-0.5">
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
                      className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <CornerDownRight className="size-3" />
                      <span>{replyingToId === f.id ? "Cancel" : "Reply"}</span>
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
                        <Avatar className="size-4 text-[8px] shrink-0 mt-0.5">
                          <AvatarFallback className="text-[8px] bg-white/10 text-white font-bold">
                            {r.authorName ? r.authorName.slice(0, 2).toUpperCase() : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-white/90 text-[10px] block">
                            {r.authorName}
                          </span>
                          <p className="text-white/80 leading-snug text-xs">
                            {r.commentText}
                          </p>
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
                    <input
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
                      className="flex-1 bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white h-7.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
          })}
        </div>
      )}

      {/* 3. Reply Capsule Input with Circular Orange Send Button */}
      {onAddFeedback && (
        <form onSubmit={handleSendFeedback} className="mt-1">
          <div className="bg-[#0d0d12] border border-white/10 rounded-full pl-4 pr-1.5 py-1.5 flex items-center gap-2 transition-all focus-within:border-primary/50">
            <input
              type="text"
              placeholder={
                isStill
                  ? "Reply to your client..."
                  : attachTime
                  ? `Reply to your client (${currentCutTimecode})...`
                  : "Reply to your client..."
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSubmitting}
              className="bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none flex-1 py-1"
            />

            {!isStill && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => setAttachTime((prev) => !prev)}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        attachTime
                          ? "text-primary bg-primary/10"
                          : "text-zinc-500 hover:text-white"
                      }`}
                    >
                      <Clock className="size-3.5" />
                    </button>
                  }
                />
                <TooltipContent>
                  {attachTime
                    ? `Timecode pin enabled (${currentCutTimecode})`
                    : "Click to pin note to current timecode"}
                </TooltipContent>
              </Tooltip>
            )}

            <button
              type="submit"
              disabled={!inputText.trim() || isSubmitting}
              className="size-7 sm:size-8 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0 cursor-pointer transition-all active:scale-95 disabled:opacity-40"
              title="Send reply"
            >
              <Send className="size-3.5 fill-current ml-0.5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

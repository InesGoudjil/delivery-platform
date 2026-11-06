"use client";

import React, { useState } from "react";
import {
  MessageCircle,
  CornerDownRight,
  Send,
  Clock,
  Play,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
import { formatTimecode } from "@/lib/timecode";
import { FeedbackItem, FeedbackReplyItem } from "./types";

export interface LightboxFeedbackDrawerProps {
  isStill: boolean;
  activeVersionNumber: number;
  feedbackList: FeedbackItem[];
  activeCommentId: string | null;
  onSelectComment: (commentId: string, timestamp?: number | null) => void;
  currentCutTimecode: string;
  onAddFeedback?: (text: string, attachTime?: boolean) => Promise<void> | void;
  onAddReply?: (feedbackId: string, text: string) => Promise<void> | void;
  onToggleResolve?: (feedbackId: string, currentResolved: boolean) => Promise<void> | void;
  onDeleteFeedback?: (feedbackId: string) => Promise<void> | void;
  onDeleteReply?: (feedbackId: string, replyId: string) => Promise<void> | void;
  onEditFeedback?: (feedbackId: string, newText: string) => Promise<void> | void;
  onEditReply?: (feedbackId: string, replyId: string, newText: string) => Promise<void> | void;
  assetTitle?: string;
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
  onToggleResolve,
  onDeleteFeedback,
  onDeleteReply,
  onEditFeedback,
  onEditReply,
  assetTitle,
}: LightboxFeedbackDrawerProps) {
  const [inputText, setInputText] = useState("");
  const [attachTime, setAttachTime] = useState(true);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit states
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editingFeedbackText, setEditingFeedbackText] = useState("");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");
  const [isSavingReply, setIsSavingReply] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "feedback"; id: string; hasReplies: boolean; authorName?: string }
    | { type: "reply"; feedbackId: string; id: string; authorName?: string }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEdited = (item: { createdAt?: string; updatedAt?: string }) => {
    if (!item.updatedAt || !item.createdAt) return false;
    return new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 2000;
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !onAddFeedback || isSubmitting) return;

    const text = inputText.trim();
    setInputText("");
    setIsSubmitting(true);
    try {
      await onAddFeedback(text, attachTime);
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

  const handleSaveEditFeedback = async (feedbackId: string) => {
    if (!editingFeedbackText.trim() || !onEditFeedback || isSavingFeedback) return;
    setIsSavingFeedback(true);
    try {
      await onEditFeedback(feedbackId, editingFeedbackText.trim());
      setEditingFeedbackId(null);
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handleSaveEditReply = async (feedbackId: string, replyId: string) => {
    if (!editingReplyText.trim() || !onEditReply || isSavingReply) return;
    setIsSavingReply(true);
    try {
      await onEditReply(feedbackId, replyId, editingReplyText.trim());
      setEditingReplyId(null);
    } finally {
      setIsSavingReply(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "feedback" && onDeleteFeedback) {
        await onDeleteFeedback(deleteTarget.id);
      } else if (deleteTarget.type === "reply" && onDeleteReply) {
        await onDeleteReply(deleteTarget.feedbackId, deleteTarget.id);
      }
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-[#18181d]/90 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-lg w-full">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <span>{assetTitle ? `Comments on ${assetTitle}` : "Comments"}</span>
          {feedbackList.length > 0 && (
            <span className="text-xs text-zinc-400 font-normal">
              ({feedbackList.length})
            </span>
          )}
        </h4>
        {!isStill && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-400 tabular-nums [font-kerning:none] shrink-0">
            <span className="size-1.5 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="inline-block min-w-[46px] text-center tabular-nums">
              {currentCutTimecode}
            </span>
          </div>
        )}
      </div>

      {/* 2. Comments List / Empty State */}
      {feedbackList.length === 0 ? (
        <p className="text-xs text-zinc-400 py-1 select-none">
          No comments yet — leave the first note.
        </p>
      ) : (
        <div className="space-y-2.5 max-h-[320px] sm:max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
          {Array.from(new Map(feedbackList.map((f) => [f.id, f])).values()).map((f) => {
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
                    : f.isResolved
                    ? "bg-white/[0.02] border-white/5 text-zinc-400 opacity-80 hover:opacity-100 hover:bg-white/[0.04]"
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
                    {f.isResolved && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Check className="size-2" />
                        <span>Resolved</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
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

                    {(onEditFeedback || onDeleteFeedback) && (
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="size-5 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                            <MoreVertical className="size-3.5" />
                            <span className="sr-only">Comment options</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-28 bg-[#1c1c24] border-white/10 text-xs shadow-xl">
                            {onEditFeedback && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingFeedbackId(f.id);
                                  setEditingFeedbackText(f.commentText);
                                }}
                                className="gap-2 cursor-pointer text-zinc-200 focus:text-white focus:bg-white/10"
                              >
                                <Pencil className="size-3" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                            )}
                            {onDeleteFeedback && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeleteTarget({
                                    type: "feedback",
                                    id: f.id,
                                    hasReplies: Boolean(f.replies && f.replies.length > 0),
                                    authorName: f.authorName,
                                  });
                                }}
                                className="gap-2 cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
                              >
                                <Trash2 className="size-3" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment Text or Inline Edit Mode */}
                {editingFeedbackId === f.id ? (
                  <div onClick={(e) => e.stopPropagation()} className="space-y-1.5 pt-1">
                    <textarea
                      value={editingFeedbackText}
                      onChange={(e) => setEditingFeedbackText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEditFeedback(f.id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingFeedbackId(null);
                        }
                      }}
                      rows={2}
                      autoFocus
                      className="w-full bg-black/60 border border-white/20 rounded-lg p-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary resize-none"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSavingFeedback}
                        onClick={() => setEditingFeedbackId(null)}
                        className="h-6 text-[10px] px-2 text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!editingFeedbackText.trim() || isSavingFeedback}
                        onClick={() => handleSaveEditFeedback(f.id)}
                        className="h-6 text-[10px] px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      >
                        {isSavingFeedback ? <Loader2 className="size-2.5 animate-spin mr-1" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className={`leading-relaxed text-xs ${f.isResolved ? "text-zinc-400" : "text-white/95"}`}>
                    {f.commentText}
                    {isEdited(f) && (
                      <span className="text-[10px] text-zinc-500 font-normal italic ml-1.5">
                        (edited)
                      </span>
                    )}
                  </p>
                )}

                {/* Actions Row: Reply Toggle & Resolve Toggle */}
                <div className="flex items-center justify-between pt-0.5 gap-2">
                  {onAddReply ? (
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
                      className="text-xs sm:text-[10px] text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-1.5 -ml-1.5 rounded-lg active:bg-white/5"
                    >
                      <CornerDownRight className="size-3.5 sm:size-3" />
                      <span>{replyingToId === f.id ? "Cancel" : "Reply"}</span>
                    </button>
                  ) : (
                    <span />
                  )}

                  {onToggleResolve && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleResolve(f.id, Boolean(f.isResolved));
                      }}
                      className={`h-7 sm:h-6 text-xs sm:text-[10px] px-2.5 sm:px-2 py-1 sm:py-0.5 rounded-lg cursor-pointer transition-colors active:scale-95 ${
                        f.isResolved
                          ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                          : "text-zinc-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {f.isResolved ? (
                        <span className="flex items-center gap-1">
                          <Check className="size-3 sm:size-2.5" />
                          <span>Resolved</span>
                        </span>
                      ) : (
                        <span>Mark resolved</span>
                      )}
                    </Button>
                  )}
                </div>

                {/* Threaded Replies */}
                {f.replies && f.replies.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                    {Array.from(new Map(f.replies.map((r: FeedbackReplyItem) => [r.id, r])).values()).map((r: FeedbackReplyItem) => (
                      <div
                        key={r.id}
                        className="flex items-start justify-between gap-2 pl-2.5 border-l-2 border-primary/50 text-xs group"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Avatar className="size-4 text-[8px] shrink-0 mt-0.5">
                            <AvatarFallback className="text-[8px] bg-white/10 text-white font-bold">
                              {r.authorName ? r.authorName.slice(0, 2).toUpperCase() : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white/90 text-[10px] block truncate">
                                {r.authorName}
                              </span>
                              {isEdited(r) && (
                                <span className="text-[8px] text-zinc-500 italic">(edited)</span>
                              )}
                            </div>

                            {editingReplyId === r.id ? (
                              <div onClick={(e) => e.stopPropagation()} className="space-y-1.5 pt-1">
                                <textarea
                                  value={editingReplyText}
                                  onChange={(e) => setEditingReplyText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEditReply(f.id, r.id);
                                    } else if (e.key === "Escape") {
                                      e.preventDefault();
                                      setEditingReplyId(null);
                                    }
                                  }}
                                  rows={2}
                                  autoFocus
                                  className="w-full bg-black/60 border border-white/20 rounded-lg p-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary resize-none"
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isSavingReply}
                                    onClick={() => setEditingReplyId(null)}
                                    className="h-6 text-[10px] px-2 text-zinc-400 hover:text-white"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={!editingReplyText.trim() || isSavingReply}
                                    onClick={() => handleSaveEditReply(f.id, r.id)}
                                    className="h-6 text-[10px] px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                  >
                                    {isSavingReply ? <Loader2 className="size-2.5 animate-spin mr-1" /> : null}
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-white/80 leading-snug text-xs">
                                {r.commentText}
                              </p>
                            )}
                          </div>
                        </div>

                        {(onEditReply || onDeleteReply) && editingReplyId !== r.id && (
                          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="size-5 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors opacity-70 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer">
                                <MoreVertical className="size-3" />
                                <span className="sr-only">Reply options</span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-28 bg-[#1c1c24] border-white/10 text-xs shadow-xl">
                                {onEditReply && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingReplyId(r.id);
                                      setEditingReplyText(r.commentText);
                                    }}
                                    className="gap-2 cursor-pointer text-zinc-200 focus:text-white focus:bg-white/10"
                                  >
                                    <Pencil className="size-3" />
                                    <span>Edit</span>
                                  </DropdownMenuItem>
                                )}
                                {onDeleteReply && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDeleteTarget({
                                        type: "reply",
                                        feedbackId: f.id,
                                        id: r.id,
                                        authorName: r.authorName,
                                      });
                                    }}
                                    className="gap-2 cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
                                  >
                                    <Trash2 className="size-3" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
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
                      className="flex-1 bg-black/60 border border-white/15 rounded-lg px-3 sm:px-2.5 py-1.5 sm:py-1 text-base sm:text-xs text-white h-9 sm:h-7.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!replyInputText.trim()}
                      onClick={() => handleSendReply(f.id)}
                      className="h-9 sm:h-7.5 px-3 sm:px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg cursor-pointer shrink-0 active:scale-95"
                    >
                      <Send className="size-3.5 sm:size-3" />
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
        <form onSubmit={handleSendFeedback} className="mt-1 flex flex-col gap-2">
          {!isStill && (
            <button
              type="button"
              onClick={() => setAttachTime((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer w-fit min-h-[32px] active:scale-95 tabular-nums [font-kerning:none] ${
                attachTime
                  ? "text-primary border-primary/50 bg-primary/10"
                  : "text-zinc-400 border-white/10 hover:text-white"
              }`}
            >
              <Clock className="size-3.5 shrink-0" />
              <span>
                {attachTime ? (
                  <>
                    Pinned to{" "}
                    <span className="inline-block min-w-[55px] text-left tabular-nums">
                      {currentCutTimecode}
                    </span>
                  </>
                ) : (
                  "Add timecode"
                )}
              </span>
            </button>
          )}

          <div className="bg-[#0d0d12] border border-white/10 rounded-full pl-4 pr-1.5 py-1.5 sm:py-1 flex items-center gap-2 transition-all focus-within:border-primary/50 min-h-[44px]">
            <input
              type="text"
              placeholder={
                isStill
                  ? "Add a comment..."
                  : attachTime
                  ? `Note at ${currentCutTimecode}...`
                  : "Add a comment..."
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSubmitting}
              className="bg-transparent text-base sm:text-xs text-white placeholder:text-zinc-500 focus:outline-none flex-1 py-1"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSubmitting}
              className="size-9 sm:size-8 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0 cursor-pointer transition-all active:scale-95 disabled:opacity-40"
              title="Send comment"
            >
              <Send className="size-4 sm:size-3.5 fill-current ml-0.5" />
            </button>
          </div>
        </form>
      )}

      {/* 4. Safe Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.type === "feedback" ? "Delete Comment" : "Delete Reply"}
        itemName={deleteTarget?.authorName ? `Note by ${deleteTarget.authorName}` : undefined}
        description={
          deleteTarget?.type === "feedback" && deleteTarget.hasReplies
            ? "Are you sure you want to delete this comment? All threaded replies under this note will also be permanently deleted."
            : "Are you sure you want to permanently delete this note? This action cannot be undone."
        }
        confirmText="Delete"
        isPermanent={true}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

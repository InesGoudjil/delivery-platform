"use client";

import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CutReviewPlayer, type CutReviewPlayerRef } from "@/components/video/cut-review-player";
import { FeedbackItem } from "./types";

export interface LightboxPlayerStageProps {
  keyId: string;
  isStill: boolean;
  mediaSrc: string;
  posterUrl?: string;
  title: string;
  resolvedAspectRatio: string;
  watermarkMedia?: boolean;
  watermarkText?: string;
  feedbackList: FeedbackItem[];
  activeCommentId: string | null;
  onCommentSelect: (commentId: string, timestamp?: number | null) => void;
  onTimeChange: (time: number, tc: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  playerRef: React.RefObject<CutReviewPlayerRef | null>;
}

export function LightboxPlayerStage({
  keyId,
  isStill,
  mediaSrc,
  posterUrl,
  title,
  resolvedAspectRatio,
  watermarkMedia = false,
  watermarkText = "PREVIEW WATERMARK",
  feedbackList,
  activeCommentId,
  onCommentSelect,
  onTimeChange,
  onPrev,
  onNext,
  playerRef,
}: LightboxPlayerStageProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/60 border border-white/10 group/stage">
      {/* Floating Prev Button */}
      {onPrev && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-30 size-10 sm:size-11 rounded-full bg-black/70 hover:bg-primary text-white hover:text-primary-foreground backdrop-blur-md border border-white/20 shadow-2xl transition-all cursor-pointer opacity-80 hover:opacity-100"
              >
                <ArrowLeft className="size-5" />
              </Button>
            }
          />
          <TooltipContent>Previous asset (Left Arrow)</TooltipContent>
        </Tooltip>
      )}

      {/* Center Media Player */}
      <div className="w-full h-full flex items-center justify-center">
        <CutReviewPlayer
          key={keyId}
          ref={playerRef}
          isPhoto={isStill}
          src={mediaSrc}
          title={title}
          poster={posterUrl}
          aspectRatio={resolvedAspectRatio}
          fps={24}
          showWatermark={watermarkMedia}
          watermarkText={watermarkText}
          comments={feedbackList.map((f) => ({
            id: f.id,
            timestampSeconds: f.timestampSeconds,
            authorName: f.authorName,
            commentText: f.commentText,
            isResolved: f.isResolved,
          }))}
          activeCommentId={activeCommentId}
          onCommentSelect={onCommentSelect}
          onTimeChange={onTimeChange}
        />
      </div>

      {/* Floating Next Button */}
      {onNext && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 size-10 sm:size-11 rounded-full bg-black/70 hover:bg-primary text-white hover:text-primary-foreground backdrop-blur-md border border-white/20 shadow-2xl transition-all cursor-pointer opacity-80 hover:opacity-100"
              >
                <ArrowRight className="size-5" />
              </Button>
            }
          />
          <TooltipContent>Next asset (Right Arrow)</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

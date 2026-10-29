"use client";

import React from "react";
import { CutReviewPlayer, type CutReviewPlayerRef, isImageSource } from "@/components/video/cut-review-player";
import { CutImageViewer, type CutImageViewerRef } from "@/components/image";

export interface MediaReviewFeedbackItem {
  id: string;
  timestampSeconds?: number | null;
  xPercent?: number | null;
  yPercent?: number | null;
  authorName?: string;
  commentText?: string;
  isResolved?: boolean;
}

export interface MediaReviewStageProps {
  src: string;
  type?: "video" | "photo" | "film" | "still" | "image" | "photo_gallery" | string;
  isStill?: boolean;
  title?: string;
  poster?: string;
  aspectRatio?: string;
  fps?: number;
  iframeEmbedUrl?: string;
  feedbackList?: MediaReviewFeedbackItem[];
  activeCommentId?: string | null;
  onCommentSelect?: (commentId: string, timestamp?: number | null) => void;
  onTimeChange?: (time: number, timecode: string) => void;
  onAddCommentPin?: (xPercent: number, yPercent: number) => void;
  showWatermark?: boolean;
  watermarkText?: string;
  className?: string;
  autoPlay?: boolean;
  videoPlayerRef?: React.RefObject<CutReviewPlayerRef | null>;
  imageViewerRef?: React.RefObject<CutImageViewerRef | null>;
  showHud?: boolean;
}

export function MediaReviewStage({
  src,
  type = "video",
  isStill: propIsStill,
  title,
  poster,
  aspectRatio = "16:9",
  fps = 24,
  iframeEmbedUrl,
  feedbackList = [],
  activeCommentId,
  onCommentSelect,
  onTimeChange,
  onAddCommentPin,
  showWatermark = false,
  watermarkText = "STUDIO PREVIEW",
  className = "",
  autoPlay = false,
  videoPlayerRef,
  imageViewerRef,
  showHud = true,
}: MediaReviewStageProps) {
  const isPhoto = Boolean(
    propIsStill ||
    type === "still" ||
    type === "photo" ||
    type === "image" ||
    type === "photo_gallery" ||
    isImageSource(src)
  );

  if (isPhoto) {
    // Map feedback items to spatial pin coordinates
    const imageComments = feedbackList
      .filter((f) => typeof f.xPercent === "number" && typeof f.yPercent === "number")
      .map((f) => ({
        id: f.id,
        xPercent: f.xPercent as number,
        yPercent: f.yPercent as number,
        authorName: f.authorName,
        commentText: f.commentText,
        isResolved: f.isResolved,
      }));

    return (
      <CutImageViewer
        ref={imageViewerRef}
        src={src}
        title={title}
        aspectRatio={aspectRatio}
        comments={imageComments}
        activeCommentId={activeCommentId}
        onCommentSelect={(id) => onCommentSelect?.(id, null)}
        onAddCommentPin={onAddCommentPin}
        showWatermark={showWatermark}
        watermarkText={watermarkText}
        className={className}
        showHud={showHud}
      />
    );
  }

  // Otherwise, render professional video review player
  const videoComments = feedbackList.map((f) => ({
    id: f.id,
    timestampSeconds: f.timestampSeconds,
    authorName: f.authorName,
    commentText: f.commentText,
    isResolved: f.isResolved,
  }));

  return (
    <CutReviewPlayer
      ref={videoPlayerRef}
      src={src}
      title={title}
      poster={poster}
      aspectRatio={aspectRatio}
      fps={fps}
      iframeEmbedUrl={iframeEmbedUrl}
      comments={videoComments}
      activeCommentId={activeCommentId}
      onCommentSelect={onCommentSelect}
      onTimeChange={onTimeChange}
      showWatermark={showWatermark}
      watermarkText={watermarkText}
      className={className}
      autoPlay={autoPlay}
    />
  );
}

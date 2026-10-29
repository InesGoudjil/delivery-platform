"use client";

import React from "react";

export interface ImageCommentMarker {
  id: string;
  xPercent: number; // 0 to 100 relative to original image width
  yPercent: number; // 0 to 100 relative to original image height
  authorName?: string;
  commentText?: string;
  isResolved?: boolean;
  createdAt?: string;
}

export interface CutImageViewerRef {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  rotate: (direction?: 1 | -1) => void;
  flipHorizontal: () => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
}

export interface CutImageViewerProps {
  src: string;
  title?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:2" | "21:9" | string;
  comments?: ImageCommentMarker[];
  activeCommentId?: string | null;
  onCommentSelect?: (commentId: string) => void;
  onAddCommentPin?: (xPercent: number, yPercent: number) => void;
  isCommentMode?: boolean;
  showWatermark?: boolean;
  watermarkText?: string;
  className?: string;
  allowDownload?: boolean;
  onDownload?: () => void;
  showHud?: boolean;
}

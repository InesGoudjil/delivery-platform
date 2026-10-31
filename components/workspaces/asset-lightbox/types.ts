import type { ReactNode } from "react";
import type { ParsedAspectRatio } from "@/lib/media-ratios";

export interface AssetVersionItem {
  id: string;
  versionNumber: number;
  rawFileUrl: string;
  downloadUrl?: string | null;
  hlsManifestUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  fileSizeBytes: number;
  transcodingStatus: string;
  isActiveVersion: boolean;
  createdAt: string;
}

export interface FeedbackReplyItem {
  id: string;
  feedbackId: string;
  authorName: string;
  commentText: string;
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  assetVersionId?: string;
  authorName: string;
  commentText: string;
  timestampSeconds?: number | null;
  createdAt: string;
  isResolved?: boolean;
  replies?: FeedbackReplyItem[];
}

export interface LightboxAssetItem {
  id: string | number;
  title: string;
  type?: "video" | "photo" | "film" | "still" | "folder" | "project" | string;
  kind?: "film" | "still" | string;
  aspectRatio?: string | ParsedAspectRatio | null;
  ar?: number;
  duration?: string | number | null;
  tc?: string;
  desc?: string;
  size?: string;
  fileSizeBytes?: number;
  fileSizeText?: string;
  src?: string | null;
  url?: string | null;
  mediaUrl?: string | null;
  rawUrl?: string | null;
  hlsUrl?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  poster?: string | null;
  image?: string | null;
  downloadUrl?: string | null;
  status?: string | null;
  isApproved?: boolean;
  category?: string | null;
  versionNumber?: number;
  versionId?: string;
  versions?: AssetVersionItem[];
  feedback?: FeedbackItem[];
  [key: string]: any;
}

export interface AssetLightboxModalProps {
  activeItem: LightboxAssetItem | null;
  onClose: () => void;
  onBack?: () => void;

  // Navigation (Next / Prev)
  onNext?: () => void;
  onPrev?: () => void;

  // Review & Feedback (Delivery Mode)
  feedbackList?: FeedbackItem[];
  onAddFeedback?: (feedback: FeedbackItem) => void;
  onAddReply?: (feedbackId: string, reply: FeedbackReplyItem) => void;
  onReconcileFeedbackId?: (tempId: string, realId: string) => void;
  onReconcileReplyId?: (feedbackId: string, tempReplyId: string, realReplyId: string) => void;
  onToggleResolve?: (feedbackId: string, currentResolved: boolean) => void;
  onToggleFeedbackResolved?: (feedbackId: string, currentResolved: boolean) => void;
  onToggleApproval?: (itemId: string, currentStatus: string) => void;

  // Management Actions
  onDeleteAsset?: (item: any) => Promise<void> | void;
  onEditAsset?: (item: any) => void;
  authorName?: string;
  triggerToast?: (msg: string) => void;

  // Watermark & Multi-version Upload
  watermarkMedia?: boolean;
  watermarkText?: string;
  workspaceId?: string;
  projectId?: string;
  workspaceSlug?: string;
  shareToken?: string;
  deliveryId?: string;
  onAssetUploaded?: (asset: any, version?: any) => void;

  // Display Configuration
  showFeedback?: boolean;
  showVersions?: boolean;
  showDownload?: boolean;
  showShareLink?: boolean;
  showApproval?: boolean;
  onDownload?: (item: LightboxAssetItem, version?: AssetVersionItem | null) => void;
  headerExtra?: ReactNode;
  footerExtra?: ReactNode;
}

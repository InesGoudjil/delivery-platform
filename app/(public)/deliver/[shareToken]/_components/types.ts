export interface AssetVersionItem {
  id: string;
  versionNumber: number;
  rawFileUrl: string;
  downloadUrl?: string | null;
  hlsManifestUrl?: string | null;
  thumbnailUrl?: string | null;
  fileSizeBytes?: number | null;
  durationSeconds?: number | null;
  transcodingStatus?: string | null;
  isActiveVersion?: boolean;
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
  assetVersionId: string;
  authorName: string;
  commentText: string;
  timestampSeconds?: number | null;
  isResolved: boolean;
  createdAt: string;
  replies?: FeedbackReplyItem[];
}

export interface DeliveryAssetItem {
  id: string;
  title: string;
  type: string;
  aspectRatio?: string;
  isApproved?: boolean;
  sortOrder?: number;
  versions: AssetVersionItem[];
  activeVersion?: AssetVersionItem | null;
  feedback: FeedbackItem[];
}

export interface DeliveryAppearance {
  cardSize?: "S" | "M" | "L";
  aspectRatioSetting?: "masonry" | "16:9" | "1:1" | "9:16";
  thumbnailScale?: "Fit" | "Fill";
  showCardInfo?: boolean;
  watermarkMedia?: boolean;
  coverThumbnailUrl?: string | null;
}

export interface DeliveryRoomProps {
  delivery: {
    id: string;
    workspaceId: string;
    title: string;
    description?: string | null;
    shareToken: string;
    status: "draft" | "in_review" | "approved" | "archived";
    isDownloadAllowed: boolean;
    isWatermarked: boolean;
    appearance?: DeliveryAppearance | null;
    approvedAt?: string | null;
    approvedByName?: string | null;
    expiresAt?: string | null;
    location?: string | null;
    deliveryDate?: string | null;
    createdAt?: string;
  };
  workspace: {
    brandName: string;
    slug: string;
    logoUrl?: string | null;
    accentColor?: string | null;
  };
  clientName?: string | null;
  brandingLocation?: string | null;
  initialTotalSizeBytes?: number;
  initialAssetCount?: number;
  initialAssets: DeliveryAssetItem[];
  isPasscodeProtected: boolean;
  isInitiallyUnlocked: boolean;
  currentUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  isWorkspaceMember?: boolean;
  whiteLabel?: boolean;
}

export type AssetFilterTab = "all" | "video" | "photo";

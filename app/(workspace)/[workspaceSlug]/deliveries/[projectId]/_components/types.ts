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

export interface FeedbackItem {
  id: string;
  assetVersionId?: string;
  authorName: string;
  commentText: string;
  timestampSeconds?: number | null;
  createdAt: string;
  isResolved?: boolean;
}

export interface GalleryItem {
  id: string;
  versionId?: string;
  versionNumber?: number;
  totalVersions?: number;
  versions?: AssetVersionItem[];
  title: string;
  type: "video" | "photo";
  aspectRatio: string;
  duration: string;
  src: string;
  status: "approved" | "review";
  rawUrl?: string;
  downloadUrl?: string;
  fileSizeBytes?: number;
  hlsUrl?: string | null;
  videoUrl?: string;
  feedback?: FeedbackItem[];
}

export interface AppearanceSettings {
  cardSize: "S" | "M" | "L";
  aspectRatioSetting: "masonry" | "16:9" | "1:1" | "9:16";
  thumbnailScale: "Fit" | "Fill";
  showCardInfo: boolean;
  watermarkMedia: boolean;
}

export interface UploadProgressState {
  fileName: string;
  fileSize: string;
  fileIndex: number;
  totalFiles: number;
  percentage: number;
}

export interface DeliveryDetailClientProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  portfolio?: {
    id: string;
    slug: string;
    title: string;
  } | null;
  project: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    shareToken: string;
    isDownloadAllowed: boolean;
    passcodeProtected: boolean;
    clientName: string;
    appearance?: AppearanceSettings | null;
    createdAt: string;
    updatedAt: string;
  };
  assets: Array<{
    id: string;
    title: string;
    type: string;
    aspectRatio?: string;
    isApproved?: boolean;
    versions: AssetVersionItem[];
    activeVersion?: AssetVersionItem | null;
    feedback?: FeedbackItem[];
  }>;
  initialTotalAssetsCount?: number;
  initialApprovedCount?: number;
  initialHasMore?: boolean;
  initialFeedback: FeedbackItem[];
  features?: Record<string, any>;
}

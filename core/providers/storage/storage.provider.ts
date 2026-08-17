export type StorageAssetType = "video" | "image" | "raw_file";

export interface CreateUploadUrlParams {
  workspaceId: string;
  projectId: string;
  assetTitle: string;
  assetType: StorageAssetType;
  fileSizeBytes: number;
  filename: string;
  maxDurationSeconds?: number;
  metadata?: Record<string, string>;
}

export interface DirectUploadResult {
  uploadUrl: string;
  providerUid: string;
  expiresAt?: string;
  headers?: Record<string, string>;
  uploadType: "direct_post" | "tus_chunked" | "presigned_put";
}

export interface PlaybackInfo {
  providerUid: string;
  hlsManifestUrl: string;
  dashManifestUrl?: string;
  thumbnailUrl: string;
  animatedThumbnailUrl?: string;
  iframeEmbedUrl?: string;
  durationSeconds?: number;
  status: "ready" | "processing" | "pending" | "error";
  width?: number;
  height?: number;
}

export interface StorageAssetStatus {
  providerUid: string;
  status: "ready" | "processing" | "pending" | "error";
  progressPercentage?: number;
  errorMessage?: string;
  hlsManifestUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
}

export interface IStorageProvider {
  readonly providerName: string;

  /**
   * Generates a direct client-to-storage upload URL (e.g. Cloudflare Stream Direct Creator Upload or TUS endpoint)
   */
  createDirectUploadUrl(params: CreateUploadUrlParams): Promise<DirectUploadResult>;

  /**
   * Retrieves playback metadata, HLS stream URLs, and thumbnails once processed
   */
  getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null>;

  /**
   * Checks the transcoding/processing status of an asset on the provider
   */
  getAssetStatus(providerUid: string): Promise<StorageAssetStatus>;

  /**
   * Deletes the media file from the storage provider
   */
  deleteAsset(providerUid: string): Promise<void>;

  /**
   * Validates incoming webhook signature (e.g. from Cloudflare)
   */
  verifyWebhookSignature?(rawBody: string, headers: Record<string, string>): boolean;
}

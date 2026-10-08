export type StorageAssetType = "video" | "image" | "raw_file";

export interface CreateUploadUrlParams {
  workspaceId: string;
  projectId?: string;
  deliveryId?: string;
  assetTitle: string;
  assetType: StorageAssetType;
  fileSizeBytes: number;
  filename: string;
  maxDurationSeconds?: number;
  isPublic?: boolean;
  category?: string;
  versionNumber?: number;
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
  rawDownloadUrl?: string;
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
   * Returns a direct CDN URL (for public assets) or a short-lived presigned GET URL (for private assets)
   */
  getSecurePlaybackUrl?(providerUid: string, isPublic?: boolean, expiresInSeconds?: number): Promise<string>;

  /**
   * Returns a presigned GET URL with ResponseContentDisposition set to attachment,
   * guaranteeing native browser download directly to disk.
   */
  getSecureDownloadUrl?(
    providerUid: string,
    filename: string,
    isPublic?: boolean,
    expiresInSeconds?: number
  ): Promise<string>;

  /**
   * Validates incoming webhook signature (e.g. from Cloudflare)
   */
  verifyWebhookSignature?(rawBody: string, headers: Record<string, string>): boolean;

  /**
   * Retrieves a readable stream of the object for transferring/archiving
   */
  getObjectStream?(providerUid: string): Promise<{
    stream: NodeJS.ReadableStream | any;
    contentType?: string;
    contentLength?: number;
  }>;

  /**
   * Streams a file into storage (e.g. restoring a thawed asset back into active storage)
   */
  putObjectStream?(
    providerUid: string,
    body: NodeJS.ReadableStream | Buffer | Uint8Array,
    contentType?: string,
    contentLength?: number
  ): Promise<void>;
}

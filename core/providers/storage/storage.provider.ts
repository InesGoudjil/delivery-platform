import type { UploadPlacement } from "@/lib/validations/upload";

export type StorageAssetType = "video" | "image" | "raw_file";

/**
 * Everything the server decided about an upload. Nothing here comes from the browser
 * unchecked: the upload service resolves the workspace, delivery and file, picks the
 * visibility, and takes the content type from the allowlist in lib/validations/upload.ts.
 */
export interface CreateUploadUrlParams {
  workspaceId: string;
  /** The delivery the file is in. Private uploads always have one. */
  deliveryId?: string;
  /** The file (asset) this upload is a version of. Part of the object key. */
  assetId: string;
  versionNumber: number;
  assetTitle: string;
  assetType: StorageAssetType;
  /** Exact size in bytes; signed into presigned uploads. */
  fileSizeBytes: number;
  filename: string;
  /** Stored content type, from the allowlist; signed into presigned uploads. */
  contentType: string;
  maxDurationSeconds?: number;
  /** Public bucket (portfolio, branding) or private bucket (anything in a delivery). */
  isPublic: boolean;
  /** Which flow a public upload comes from; decides its key prefix (see uploadPlacementSchema). */
  placement?: UploadPlacement;
}

export interface DirectUploadResult {
  uploadUrl: string;
  /** Where the file will be stored: an R2 object key, a Stream video UID, or a mock id. */
  providerUid: string;
  expiresAt?: string;
  /** Headers the browser must send with the upload, exactly as given. */
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

/** What R2 reports for a stored object (HeadObject). */
export interface StoredObjectInfo {
  sizeBytes: number;
  contentType: string | null;
}

/** A Cloudflare Stream video, as the Stream API reports it. */
export interface StreamVideoInfo {
  uid: string;
  /** `creator` set when the video was created: the workspace id, for videos this app made. */
  creator: string | null;
  /** `meta.workspaceId` set when the video was created. */
  workspaceId: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  status: "ready" | "processing" | "pending" | "error";
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
   * Deletes the media file from the storage provider. Callers check ownership first: an R2
   * key under the right workspace (`isR2KeyInWorkspace`), a Stream UID from a row the server wrote.
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
   * Validates an incoming webhook signature (e.g. from Cloudflare). False when it can't be
   * checked (no secret configured).
   */
  verifyWebhookSignature?(rawBody: string, headers: Record<string, string>): boolean;

  /**
   * R2: size and content type of a stored object, or null when it doesn't exist.
   */
  headObject?(key: string): Promise<StoredObjectInfo | null>;

  /**
   * R2: the first `length` bytes of a stored object (ranged GET), for content checks.
   */
  readObjectStart?(key: string, length: number): Promise<Uint8Array>;

  /**
   * Cloudflare Stream: a video's owner, size, duration and state, or null when it doesn't exist.
   */
  getStreamVideo?(uid: string): Promise<StreamVideoInfo | null>;

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

  /**
   * Ingests a video from a publicly-accessible or presigned URL into the streaming pipeline.
   * Enables Cloudflare Stream to pull master video files stored in Cloudflare R2 and generate HLS/DASH streaming renditions.
   * Absent when Cloudflare Stream isn't configured.
   */
  copyFromUrl?(
    sourceUrl: string,
    metadata?: {
      name?: string;
      creator?: string;
      allowedOrigins?: string[];
      meta?: Record<string, string>;
    }
  ): Promise<{ uid: string; status?: string }>;
}

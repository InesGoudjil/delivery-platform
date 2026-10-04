import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  IStorageProvider,
  CreateUploadUrlParams,
  DirectUploadResult,
  PlaybackInfo,
  StorageAssetStatus,
} from "./storage.provider";

export interface CloudflareR2Config {
  bucket?: string;
  publicBucket?: string;
  privateBucket?: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  publicDomain?: string;
}

function getMimeType(filename: string, fallback: string = "application/octet-stream"): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  return fallback;
}

export class CloudflareR2StorageProvider implements IStorageProvider {
  readonly providerName = "cloudflare_r2";
  private readonly s3Client: S3Client;
  private readonly publicBucket: string;
  private readonly privateBucket: string;
  private readonly publicDomain: string;

  constructor(config: CloudflareR2Config) {
    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error("CloudflareR2StorageProvider requires accessKeyId and secretAccessKey.");
    }

    this.publicBucket = config.publicBucket || config.bucket || "";
    this.privateBucket = config.privateBucket || config.bucket || "";

    if (!this.publicBucket && !this.privateBucket) {
      throw new Error("CloudflareR2StorageProvider requires either bucket, publicBucket, or privateBucket.");
    }

    const rawDomain = config.publicDomain || `${config.endpoint}/${this.publicBucket}`;
    this.publicDomain = rawDomain.replace(/\/$/, "");

    this.s3Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  private hasRealPublicDomain(): boolean {
    return (
      Boolean(this.publicDomain) &&
      !this.publicDomain.includes("pub-xxxx") &&
      !this.publicDomain.includes("r2.cloudflarestorage.com")
    );
  }

  private getTargetBucket(providerUid: string, isPublic?: boolean): string {
    if (isPublic !== undefined) {
      return isPublic ? this.publicBucket : this.privateBucket;
    }
    if (providerUid.startsWith("public/")) return this.publicBucket;
    if (providerUid.startsWith("private/")) return this.privateBucket;
    // Default fallback to publicBucket if available, else privateBucket
    return this.publicBucket || this.privateBucket;
  }

  async createDirectUploadUrl(params: CreateUploadUrlParams): Promise<DirectUploadResult> {
    const isPublic = params.isPublic !== false; // Default to public if not explicitly marked private
    const targetBucket = isPublic ? this.publicBucket : this.privateBucket;
    const privacyPrefix = isPublic ? "public" : "private";

    // Sanitize filename: replace spaces, slashes, and special characters with safe characters
    const cleanFilename = params.filename
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_");

    let subPath: string;

    if (isPublic) {
      const category = (params.category || params.metadata?.category || "").toLowerCase();
      if (category === "branding" || params.metadata?.type === "branding") {
        subPath = `branding/${Date.now()}-${cleanFilename}`;
      } else if (category === "cover" || params.metadata?.type === "cover") {
        subPath = `portfolio/covers/${Date.now()}-${cleanFilename}`;
      } else if (
        params.projectId &&
        params.projectId.trim() !== "" &&
        params.projectId !== "standalone" &&
        params.projectId !== params.deliveryId
      ) {
        const mediaSubdir = params.assetType === "video" || category === "film" ? "films" : "stills";
        subPath = `portfolio/projects/${params.projectId}/${mediaSubdir}/${Date.now()}-${cleanFilename}`;
      } else {
        const mediaSubdir = params.assetType === "video" || category === "film" ? "films" : "stills";
        subPath = `portfolio/standalone/${mediaSubdir}/${Date.now()}-${cleanFilename}`;
      }
    } else {
      // Private Bucket: Client Deliveries & Confidential Cuts
      const deliveryId =
        params.deliveryId ||
        (params.projectId && params.projectId !== "standalone" ? params.projectId : null) ||
        "general";
      const category = (params.category || params.metadata?.category || "").toLowerCase();

      if (category === "feedback" || params.metadata?.type === "feedback") {
        const feedbackId = params.metadata?.feedbackId || "general";
        subPath = `deliveries/${deliveryId}/feedback/${feedbackId}/${Date.now()}-${cleanFilename}`;
      } else if (category === "raw" || params.assetType === "raw_file") {
        subPath = `deliveries/${deliveryId}/raw/${Date.now()}-${cleanFilename}`;
      } else {
        const assetId = params.metadata?.assetId || "asset";
        const versionNum = params.versionNumber || params.metadata?.versionNumber || 1;
        subPath = `deliveries/${deliveryId}/assets/${assetId}/v${versionNum}/${Date.now()}-${cleanFilename}`;
      }
    }

    const key = `${privacyPrefix}/workspaces/${params.workspaceId}/${subPath}`;

    const contentType = getMimeType(
      params.filename,
      params.assetType === "image" ? "image/jpeg" : "application/octet-stream"
    );

    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

    return {
      uploadUrl,
      providerUid: key,
      uploadType: "presigned_put",
      headers: {
        "Content-Type": contentType,
      },
    };
  }

  private getAssetUrl(providerUid: string): string {
    if (this.hasRealPublicDomain() && !providerUid.startsWith("private/")) {
      return `${this.publicDomain}/${providerUid}`;
    }
    return `/api/media/${providerUid}`;
  }

  /**
   * Generates a direct CDN URL for public assets or a short-lived presigned GET URL for private assets.
   */
  async getSecurePlaybackUrl(
    providerUid: string,
    isPublic?: boolean,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const isExplicitlyPrivate = isPublic === false || providerUid.startsWith("private/");

    if (!isExplicitlyPrivate && this.hasRealPublicDomain()) {
      return `${this.publicDomain}/${providerUid}`;
    }

    const bucket = this.getTargetBucket(providerUid, isPublic);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: providerUid,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Generates a direct presigned GET URL with ResponseContentDisposition set to attachment,
   * forcing the client browser to download the file directly to disk with the specified filename.
   */
  async getSecureDownloadUrl(
    providerUid: string,
    filename: string,
    isPublic?: boolean,
    expiresInSeconds: number = 7200
  ): Promise<string> {
    const bucket = this.getTargetBucket(providerUid, isPublic);
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, "_").trim() || "download";
    const cleanAscii = safeFilename.replace(/["\r\n]/g, "");

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: providerUid,
      ResponseContentDisposition: `attachment; filename="${cleanAscii}"; filename*=UTF-8''${encodeURIComponent(cleanAscii)}`,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  async getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null> {
    const assetUrl = this.getAssetUrl(providerUid);

    return {
      providerUid,
      hlsManifestUrl: assetUrl,
      thumbnailUrl: assetUrl,
      status: "ready",
      rawDownloadUrl: assetUrl,
    } as any;
  }

  async getAssetStatus(providerUid: string): Promise<StorageAssetStatus> {
    const assetUrl = this.getAssetUrl(providerUid);

    return {
      providerUid,
      status: "ready",
      thumbnailUrl: assetUrl,
    };
  }

  async deleteAsset(providerUid: string): Promise<void> {
    let key = providerUid.split("?")[0].trim();
    if (key.startsWith("http://") || key.startsWith("https://")) {
      try {
        const parsed = new URL(key);
        key = parsed.pathname.replace(/^\/+/, "");
        if (this.publicBucket && key.startsWith(`${this.publicBucket}/`)) {
          key = key.slice(this.publicBucket.length + 1);
        }
        if (this.privateBucket && key.startsWith(`${this.privateBucket}/`)) {
          key = key.slice(this.privateBucket.length + 1);
        }
      } catch {
        // Fallback to raw key
      }
    }
    if (key.startsWith("api/media/")) {
      key = key.replace(/^api\/media\//, "");
    }
    const bucket = this.getTargetBucket(key);
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await this.s3Client.send(command);
  }
}
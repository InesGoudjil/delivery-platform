import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isUuid, parseStoredMedia } from "@/lib/storage/keys";
import { UPLOAD_URL_TTL_SECONDS } from "@/lib/validations/upload";
import {
  IStorageProvider,
  CreateUploadUrlParams,
  DirectUploadResult,
  PlaybackInfo,
  StorageAssetStatus,
  StoredObjectInfo,
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

/** Fallback content type for server-side writes that don't pass one. Never SVG or HTML. */
function getMimeType(filename: string, fallback: string = "application/octet-stream"): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  return fallback;
}

/**
 * The file-name part of an object key: ASCII letters, digits, ".", "_" and "-" only, so the
 * key survives URLs and `parseStoredMedia` unchanged (no "#", "?", "%", "/" or "..").
 */
export function safeObjectName(filename: string): string {
  const trimmed = (filename || "").trim();
  const dot = trimmed.lastIndexOf(".");
  const base = dot > 0 ? trimmed.slice(0, dot) : trimmed;
  const extension = dot > 0 ? trimmed.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  const cleanBase =
    base
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/\.{2,}/g, ".")
      .replace(/_+/g, "_")
      .replace(/^[._-]+|[._-]+$/g, "")
      .slice(0, 80) || "file";
  return extension ? `${cleanBase}.${extension}` : cleanBase;
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

  /**
   * The object key a stored value points at. Only keys under a workspace prefix
   * ("[private/|public/]workspaces/<uuid>/...") are ever read, signed, written or deleted;
   * anything else (other prefixes, path tricks, foreign URLs) is refused.
   */
  private requireKey(value: string): string {
    const parsed = parseStoredMedia(value);
    if (parsed?.kind !== "r2" || !parsed.workspaceId) {
      throw new Error("Not a workspace storage key.");
    }
    return parsed.key;
  }

  /**
   * Presigned PUT for one object. The key, content type and exact size are decided by the
   * server and signed into the URL, so the browser can't store anything else there.
   */
  async createDirectUploadUrl(params: CreateUploadUrlParams): Promise<DirectUploadResult> {
    const isPublic = params.isPublic === true;
    if (!isUuid(params.workspaceId)) throw new Error("Uploads need a workspace id.");
    if (!isUuid(params.assetId)) throw new Error("Uploads need a file id.");
    if (!params.contentType) throw new Error("Uploads need a content type.");
    if (!Number.isSafeInteger(params.fileSizeBytes) || params.fileSizeBytes <= 0) {
      throw new Error("Uploads need the exact file size.");
    }

    const workspaceId = params.workspaceId.toLowerCase();
    const assetId = params.assetId.toLowerCase();
    const version = Number.isSafeInteger(params.versionNumber) && params.versionNumber > 0 ? params.versionNumber : 1;
    const name = `${Date.now()}-${safeObjectName(params.filename)}`;

    let subPath: string;
    if (isPublic) {
      const media = params.assetType === "video" ? "films" : "stills";
      switch (params.placement) {
        case "portfolio": // standalone portfolio pieces, and only those
          subPath = `portfolio/standalone/${media}/${assetId}/v${version}/${name}`;
          break;
        case "project":
          subPath = `portfolio/projects/${media}/${assetId}/v${version}/${name}`;
          break;
        case "cover":
          subPath = `portfolio/covers/${assetId}/${name}`;
          break;
        case "hero":
          subPath = `portfolio/hero/${assetId}/${name}`;
          break;
        case "branding":
          subPath = `branding/${assetId}/${name}`;
          break;
        default:
          subPath = `portfolio/media/${media}/${assetId}/v${version}/${name}`;
      }
    } else {
      // Private bucket: files in a client delivery.
      if (!isUuid(params.deliveryId)) throw new Error("Private uploads need a delivery.");
      subPath = `deliveries/${params.deliveryId.toLowerCase()}/assets/${assetId}/v${version}/${name}`;
    }

    const key = `${isPublic ? "public" : "private"}/workspaces/${workspaceId}/${subPath}`;

    const command = new PutObjectCommand({
      Bucket: isPublic ? this.publicBucket : this.privateBucket,
      Key: key,
      ContentType: params.contentType,
      ContentLength: params.fileSizeBytes,
    });

    // The presigner leaves Content-Type unsigned unless asked; sign it, and the length.
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(["content-type", "content-length"]),
    });

    return {
      uploadUrl,
      providerUid: key,
      uploadType: "presigned_put",
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000).toISOString(),
      // The browser sets Content-Length itself (from the file); it must equal the signed size.
      headers: {
        "Content-Type": params.contentType,
      },
    };
  }

  /** Size and content type of a stored object, or null when there is no such object. */
  async headObject(value: string): Promise<StoredObjectInfo | null> {
    const key = this.requireKey(value);
    try {
      const res = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.getTargetBucket(key), Key: key })
      );
      return {
        sizeBytes: typeof res.ContentLength === "number" ? res.ContentLength : -1,
        contentType: res.ContentType ?? null,
      };
    } catch (err: any) {
      const status = err?.$metadata?.httpStatusCode;
      if (status === 404 || err?.name === "NotFound" || err?.name === "NoSuchKey") return null;
      throw err;
    }
  }

  /** The first bytes of a stored object (ranged GET), at most 64 KiB. */
  async readObjectStart(value: string, length: number): Promise<Uint8Array> {
    const key = this.requireKey(value);
    const count = Math.max(1, Math.min(Math.floor(length) || 1, 65536));
    const res = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.getTargetBucket(key),
        Key: key,
        Range: `bytes=0-${count - 1}`,
      })
    );
    const body: any = res.Body;
    if (!body) return new Uint8Array();
    if (typeof body.transformToByteArray === "function") {
      const bytes: Uint8Array = await body.transformToByteArray();
      return bytes.subarray(0, count);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
      chunks.push(Buffer.from(chunk as any));
    }
    return new Uint8Array(Buffer.concat(chunks)).subarray(0, count);
  }

  private getAssetUrl(key: string): string {
    if (this.hasRealPublicDomain() && !key.startsWith("private/")) {
      return `${this.publicDomain}/${key}`;
    }
    return `/api/media/${key}`;
  }

  /**
   * Generates a direct CDN URL for public assets or a short-lived presigned GET URL for private assets.
   */
  async getSecurePlaybackUrl(
    providerUid: string,
    isPublic?: boolean,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const key = this.requireKey(providerUid);
    const isExplicitlyPrivate = isPublic === false || key.startsWith("private/");

    if (!isExplicitlyPrivate && this.hasRealPublicDomain()) {
      return `${this.publicDomain}/${key}`;
    }

    const bucket = this.getTargetBucket(key, isPublic);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
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
    const key = this.requireKey(providerUid);
    const bucket = this.getTargetBucket(key, isPublic);
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, "_").trim() || "download";
    const cleanAscii = safeFilename.replace(/["\r\n]/g, "");

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${cleanAscii}"; filename*=UTF-8''${encodeURIComponent(cleanAscii)}`,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  async getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null> {
    const assetUrl = this.getAssetUrl(this.requireKey(providerUid));

    return {
      providerUid,
      hlsManifestUrl: assetUrl,
      thumbnailUrl: assetUrl,
      status: "ready",
      rawDownloadUrl: assetUrl,
    } as any;
  }

  async getAssetStatus(providerUid: string): Promise<StorageAssetStatus> {
    const assetUrl = this.getAssetUrl(this.requireKey(providerUid));

    return {
      providerUid,
      status: "ready",
      thumbnailUrl: assetUrl,
    };
  }

  async deleteAsset(providerUid: string): Promise<void> {
    const key = this.requireKey(providerUid);
    const command = new DeleteObjectCommand({
      Bucket: this.getTargetBucket(key),
      Key: key,
    });
    await this.s3Client.send(command);
  }

  async getObjectStream(providerUid: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType?: string;
    contentLength?: number;
  }> {
    const key = this.requireKey(providerUid);
    const command = new GetObjectCommand({
      Bucket: this.getTargetBucket(key),
      Key: key,
    });
    const res = await this.s3Client.send(command);
    return {
      stream: res.Body as any,
      contentType: res.ContentType,
      contentLength: res.ContentLength,
    };
  }

  async putObjectStream(
    providerUid: string,
    body: NodeJS.ReadableStream | Buffer | Uint8Array,
    contentType?: string,
    contentLength?: number
  ): Promise<void> {
    const key = this.requireKey(providerUid);
    const command = new PutObjectCommand({
      Bucket: this.getTargetBucket(key),
      Key: key,
      Body: body as any,
      ContentType: contentType || getMimeType(key),
      ContentLength: contentLength,
    });
    await this.s3Client.send(command);
  }
}

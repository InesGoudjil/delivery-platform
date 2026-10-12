import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  RestoreObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

export type GlacierTier = "Bulk" | "Standard";
export type GlacierStorageClass = "DEEP_ARCHIVE" | "GLACIER";

export interface SiloArchiveResult {
  archiveKey: string;
  sizeBytes: number;
  storageClass: string;
  bucket: string;
}

export interface SiloRestoreRequestResult {
  status: "in_progress" | "already_restored" | "already_in_progress";
  estimatedHours: number;
  tier: GlacierTier;
}

export interface SiloRestoreStatusResult {
  isRestored: boolean;
  inProgress: boolean;
  expiryDate?: Date;
  status: "ready" | "restoring" | "archived" | "not_found";
}

export interface ISiloStorageProvider {
  readonly providerName: string;
  isConfigured(): boolean;

  /**
   * Uploads an object directly to AWS S3 Glacier Deep Archive.
   * Handles arbitrary size via streaming multipart upload.
   */
  archiveStream(params: {
    stream: NodeJS.ReadableStream | any;
    targetKey: string;
    contentType?: string;
    contentLength?: number;
    metadata?: Record<string, string>;
  }): Promise<SiloArchiveResult>;

  /**
   * Initiates restoration/thawing of an archived object from Glacier Deep Archive.
   */
  requestRestore(params: {
    key: string;
    tier?: GlacierTier;
    days?: number;
  }): Promise<SiloRestoreRequestResult>;

  /**
   * Inspects S3 object restore state via HeadObject to check if thawing is in progress or completed.
   */
  checkRestoreStatus(key: string): Promise<SiloRestoreStatusResult>;

  /**
   * Streams a thawed object from S3 Glacier to copy back to active storage (Cloudflare R2) or process.
   */
  getObjectStream(key: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType?: string;
    contentLength?: number;
  }>;

  /**
   * Generates a temporary presigned download URL directly from S3 for a restored/thawed object.
   */
  getPresignedDownloadUrl(key: string, filename: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Permanently deletes an object from the S3 Silo archive.
   */
  deleteArchiveObject(key: string): Promise<void>;
}

export interface AwsSiloGlacierConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  storageClass?: GlacierStorageClass;
}

export class AwsSiloGlacierProvider implements ISiloStorageProvider {
  readonly providerName = "aws_s3_glacier";
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly storageClass: GlacierStorageClass;

  constructor(config: AwsSiloGlacierConfig) {
    if (!config.bucket) {
      throw new Error("AwsSiloGlacierProvider requires a valid bucket name.");
    }
    this.bucket = config.bucket;
    this.storageClass = config.storageClass || "DEEP_ARCHIVE";

    this.s3Client = new S3Client({
      region: config.region || "us-east-1",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  isConfigured(): boolean {
    return true;
  }

  async archiveStream(params: {
    stream: NodeJS.ReadableStream | any;
    targetKey: string;
    contentType?: string;
    contentLength?: number;
    metadata?: Record<string, string>;
  }): Promise<SiloArchiveResult> {
    const key = params.targetKey.replace(/^\/+/, "");
    const contentType = params.contentType || "application/octet-stream";

    // Small file fast-path if contentLength is known and <= 15MB
    if (params.contentLength !== undefined && params.contentLength > 0 && params.contentLength <= 15 * 1024 * 1024) {
      const chunks: Buffer[] = [];
      for await (const chunk of params.stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          StorageClass: this.storageClass,
          Metadata: params.metadata,
        })
      );

      return {
        archiveKey: key,
        sizeBytes: buffer.length,
        storageClass: this.storageClass,
        bucket: this.bucket,
      };
    }

    // Large file / streaming multipart uploader (handles large video files up to multiple TBs)
    const createRes = await this.s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        StorageClass: this.storageClass,
        Metadata: params.metadata,
      })
    );

    const uploadId = createRes.UploadId;
    if (!uploadId) {
      throw new Error("Failed to initialize AWS S3 multipart upload for Silo archival.");
    }

    const parts: { ETag: string; PartNumber: number }[] = [];
    const PART_SIZE = 10 * 1024 * 1024; // 10MB chunk (AWS minimum is 5MB)
    let partNumber = 1;
    let totalBytes = 0;
    let buffer = Buffer.alloc(0);

    try {
      for await (const rawChunk of params.stream) {
        const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
        buffer = Buffer.concat([buffer, chunk]);
        totalBytes += chunk.length;

        while (buffer.length >= PART_SIZE) {
          const partBuffer = buffer.subarray(0, PART_SIZE);
          buffer = buffer.subarray(PART_SIZE);

          const partRes = await this.s3Client.send(
            new UploadPartCommand({
              Bucket: this.bucket,
              Key: key,
              UploadId: uploadId,
              PartNumber: partNumber,
              Body: partBuffer,
            })
          );

          if (!partRes.ETag) {
            throw new Error(`AWS S3 UploadPart failed for part ${partNumber}`);
          }

          parts.push({ ETag: partRes.ETag, PartNumber: partNumber });
          partNumber++;
        }
      }

      // Flush remaining bytes or single empty part
      if (buffer.length > 0 || parts.length === 0) {
        const partRes = await this.s3Client.send(
          new UploadPartCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
            Body: buffer,
          })
        );

        if (!partRes.ETag) {
          throw new Error(`AWS S3 UploadPart failed for final part ${partNumber}`);
        }

        parts.push({ ETag: partRes.ETag, PartNumber: partNumber });
      }

      await this.s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        })
      );

      return {
        archiveKey: key,
        sizeBytes: totalBytes,
        storageClass: this.storageClass,
        bucket: this.bucket,
      };
    } catch (err) {
      try {
        await this.s3Client.send(
          new AbortMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
          })
        );
      } catch (abortErr) {
        console.warn("[AwsSiloGlacierProvider] Notice: Multipart abort error:", abortErr);
      }
      throw err;
    }
  }

  async requestRestore(params: {
    key: string;
    tier?: GlacierTier;
    days?: number;
  }): Promise<SiloRestoreRequestResult> {
    const tier = params.tier || "Bulk";
    const days = params.days || 7;
    const cleanKey = params.key.replace(/^\/+/, "");

    try {
      await this.s3Client.send(
        new RestoreObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
          RestoreRequest: {
            Days: days,
            GlacierJobParameters: {
              Tier: tier,
            },
            Description: `Silo thaw retrieval request for ${cleanKey}`,
          },
        })
      );

      return {
        status: "in_progress",
        estimatedHours: tier === "Bulk" ? 48 : 12,
        tier,
      };
    } catch (err: any) {
      if (
        err.name === "RestoreAlreadyInProgress" ||
        err.message?.includes("already in progress") ||
        err.Code === "RestoreAlreadyInProgress"
      ) {
        return {
          status: "already_in_progress",
          estimatedHours: tier === "Bulk" ? 48 : 12,
          tier,
        };
      }
      if (err.message?.includes("Object is already restored")) {
        return {
          status: "already_restored",
          estimatedHours: 0,
          tier,
        };
      }
      throw err;
    }
  }

  async checkRestoreStatus(key: string): Promise<SiloRestoreStatusResult> {
    const cleanKey = key.replace(/^\/+/, "");

    try {
      const res = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        })
      );

      const restoreHeader = res.Restore;
      if (!restoreHeader) {
        return {
          isRestored: false,
          inProgress: false,
          status: "archived",
        };
      }

      if (restoreHeader.includes('ongoing-request="true"')) {
        return {
          isRestored: false,
          inProgress: true,
          status: "restoring",
        };
      }

      if (restoreHeader.includes('ongoing-request="false"')) {
        let expiryDate: Date | undefined;
        const match = restoreHeader.match(/expiry-date="([^"]+)"/);
        if (match) {
          expiryDate = new Date(match[1]);
        }
        return {
          isRestored: true,
          inProgress: false,
          expiryDate,
          status: "ready",
        };
      }

      return {
        isRestored: false,
        inProgress: false,
        status: "archived",
      };
    } catch (err: any) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        return {
          isRestored: false,
          inProgress: false,
          status: "not_found",
        };
      }
      throw err;
    }
  }

  async getObjectStream(key: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType?: string;
    contentLength?: number;
  }> {
    const cleanKey = key.replace(/^\/+/, "");
    const res = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      })
    );

    return {
      stream: res.Body as any,
      contentType: res.ContentType,
      contentLength: res.ContentLength,
    };
  }

  async getPresignedDownloadUrl(
    key: string,
    filename: string,
    expiresInSeconds: number = 7200
  ): Promise<string> {
    const cleanKey = key.replace(/^\/+/, "");
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, "_").trim() || "silo-download";
    const cleanAscii = safeFilename.replace(/["\r\n]/g, "");

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: cleanKey,
      ResponseContentDisposition: `attachment; filename="${cleanAscii}"; filename*=UTF-8''${encodeURIComponent(cleanAscii)}`,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  async deleteArchiveObject(key: string): Promise<void> {
    const cleanKey = key.replace(/^\/+/, "");
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      })
    );
  }
}

/**
 * Mock provider for local development or when AWS S3 credentials are not configured.
 */
export class MockSiloGlacierProvider implements ISiloStorageProvider {
  readonly providerName = "mock_s3_glacier";
  private mockStore = new Map<
    string,
    {
      buffer: Buffer;
      contentType: string;
      restoredUntil?: Date;
      restoreRequestedAt?: Date;
      tier?: GlacierTier;
      metadata?: Record<string, string>;
    }
  >();

  isConfigured(): boolean {
    return false;
  }

  async archiveStream(params: {
    stream: NodeJS.ReadableStream | any;
    targetKey: string;
    contentType?: string;
    contentLength?: number;
    metadata?: Record<string, string>;
  }): Promise<SiloArchiveResult> {
    const chunks: Buffer[] = [];
    for await (const chunk of params.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const key = params.targetKey.replace(/^\/+/, "");

    this.mockStore.set(key, {
      buffer,
      contentType: params.contentType || "application/octet-stream",
      metadata: params.metadata,
    });

    return {
      archiveKey: key,
      sizeBytes: buffer.length,
      storageClass: "DEEP_ARCHIVE",
      bucket: "mock-silo-bucket",
    };
  }

  async requestRestore(params: {
    key: string;
    tier?: GlacierTier;
    days?: number;
  }): Promise<SiloRestoreRequestResult> {
    const key = params.key.replace(/^\/+/, "");
    const item = this.mockStore.get(key) || {
      buffer: Buffer.from("mock video deliverable content"),
      contentType: "video/mp4",
    };

    const days = params.days || 7;
    const tier = params.tier || "Bulk";

    // In mock mode, mark as immediately restored after 1 second
    item.restoreRequestedAt = new Date();
    item.tier = tier;
    item.restoredUntil = new Date(Date.now() + days * 24 * 3600 * 1000);
    this.mockStore.set(key, item);

    return {
      status: "in_progress",
      estimatedHours: tier === "Bulk" ? 48 : 12,
      tier,
    };
  }

  async checkRestoreStatus(key: string): Promise<SiloRestoreStatusResult> {
    const cleanKey = key.replace(/^\/+/, "");
    const item = this.mockStore.get(cleanKey);

    if (!item) {
      // Return ready in mock mode so developers can test the end-to-end flow immediately
      return {
        isRestored: true,
        inProgress: false,
        expiryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        status: "ready",
      };
    }

    return {
      isRestored: true,
      inProgress: false,
      expiryDate: item.restoredUntil || new Date(Date.now() + 7 * 24 * 3600 * 1000),
      status: "ready",
    };
  }

  async getObjectStream(key: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType?: string;
    contentLength?: number;
  }> {
    const { Readable } = await import("stream");
    const cleanKey = key.replace(/^\/+/, "");
    const item = this.mockStore.get(cleanKey);
    const buf = item?.buffer || Buffer.from("mock deliverable master content");

    return {
      stream: Readable.from(buf),
      contentType: item?.contentType || "video/mp4",
      contentLength: buf.length,
    };
  }

  async getPresignedDownloadUrl(
    key: string,
    filename: string,
    _expiresInSeconds?: number
  ): Promise<string> {
    return `/api/media/${key}?download=true&filename=${encodeURIComponent(filename)}`;
  }

  async deleteArchiveObject(key: string): Promise<void> {
    const cleanKey = key.replace(/^\/+/, "");
    this.mockStore.delete(cleanKey);
  }
}

export class SiloProviderFactory {
  static createProvider(): ISiloStorageProvider {
    if (env.isAwsSiloConfigured) {
      return new AwsSiloGlacierProvider({
        region: env.AWS_REGION || "us-east-1",
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
        bucket: env.AWS_S3_SILO_BUCKET!,
        storageClass: (env.AWS_SILO_STORAGE_CLASS as GlacierStorageClass) || "DEEP_ARCHIVE",
      });
    }

    return new MockSiloGlacierProvider();
  }
}

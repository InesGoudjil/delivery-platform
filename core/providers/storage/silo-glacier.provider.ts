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
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ provider: "AwsSiloGlacierProvider" });

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

/** What the archive bucket reports for a stored object (HeadObject). */
export interface SiloArchiveObjectInfo {
  sizeBytes: number;
  storageClass: string;
}

export const SILO_UNAVAILABLE_MESSAGE = "The Silo archive is currently unavailable.";

/**
 * Thrown by every Silo operation while The Silo is switched off (SILO_ENABLED) or
 * not backed by a real AWS archive bucket.
 */
export class SiloUnavailableError extends Error {
  constructor(message: string = SILO_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "SiloUnavailableError";
  }
}

export interface ISiloStorageProvider {
  readonly providerName: string;
  /** True only for a real, durable archive store. Archiving refuses to run otherwise. */
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
   * Reads back a stored object's size and storage class (HeadObject), or null when it does
   * not exist. Used to confirm an upload before the active-storage original is deleted.
   */
  getArchiveObjectInfo(key: string): Promise<SiloArchiveObjectInfo | null>;

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
    // 10MB chunks (AWS minimum is 5MB), grown for very large masters so the upload stays
    // under S3's 10,000-part limit.
    const PART_SIZE = Math.max(10 * 1024 * 1024, Math.ceil((params.contentLength ?? 0) / 9000));
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
        log.warn({ err: abortErr, key, uploadId }, "Multipart abort error");
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

  async getArchiveObjectInfo(key: string): Promise<SiloArchiveObjectInfo | null> {
    const cleanKey = key.replace(/^\/+/, "");
    try {
      const res = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        })
      );
      return {
        sizeBytes: res.ContentLength ?? 0,
        // S3 omits the storage class header for STANDARD objects.
        storageClass: res.StorageClass ?? "STANDARD",
      };
    } catch (err: any) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        return null;
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
 * In-memory stand-in for tests only. It keeps nothing beyond the process, so it reports
 * itself as not configured and SiloService refuses to archive with it; tests that drive
 * the archive flow subclass it and override isConfigured(). SiloProviderFactory hands it
 * out only under NODE_ENV=test, and only when asked for.
 */
export class MockSiloGlacierProvider implements ISiloStorageProvider {
  readonly providerName = "mock_s3_glacier";
  protected readonly mockStore = new Map<
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

  private notFound(key: string): Error {
    const err = new Error(`Mock Silo object not found: ${key}`);
    err.name = "NotFound";
    return err;
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
    const item = this.mockStore.get(key);
    if (!item) throw this.notFound(key);

    const days = params.days || 7;
    const tier = params.tier || "Bulk";

    // The mock thaws instantly once a restore is requested.
    item.restoreRequestedAt = new Date();
    item.tier = tier;
    item.restoredUntil = new Date(Date.now() + days * 24 * 3600 * 1000);

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
      return { isRestored: false, inProgress: false, status: "not_found" };
    }
    if (!item.restoredUntil) {
      return { isRestored: false, inProgress: false, status: "archived" };
    }
    return {
      isRestored: true,
      inProgress: false,
      expiryDate: item.restoredUntil,
      status: "ready",
    };
  }

  async getArchiveObjectInfo(key: string): Promise<SiloArchiveObjectInfo | null> {
    const item = this.mockStore.get(key.replace(/^\/+/, ""));
    return item ? { sizeBytes: item.buffer.length, storageClass: "DEEP_ARCHIVE" } : null;
  }

  async getObjectStream(key: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType?: string;
    contentLength?: number;
  }> {
    const { Readable } = await import("stream");
    const cleanKey = key.replace(/^\/+/, "");
    const item = this.mockStore.get(cleanKey);
    if (!item) throw this.notFound(cleanKey);

    return {
      stream: Readable.from(item.buffer),
      contentType: item.contentType,
      contentLength: item.buffer.length,
    };
  }

  async getPresignedDownloadUrl(
    key: string,
    filename: string,
    _expiresInSeconds?: number
  ): Promise<string> {
    return `mock-silo://${key.replace(/^\/+/, "")}?filename=${encodeURIComponent(filename)}`;
  }

  async deleteArchiveObject(key: string): Promise<void> {
    const cleanKey = key.replace(/^\/+/, "");
    this.mockStore.delete(cleanKey);
  }
}

/**
 * Used whenever The Silo is off or has no real archive bucket behind it: every call throws,
 * so nothing can be "archived" into a store that does not keep it.
 */
export class UnavailableSiloProvider implements ISiloStorageProvider {
  readonly providerName = "unavailable";

  constructor(private readonly reason: string = "") {}

  isConfigured(): boolean {
    return false;
  }

  private fail(): never {
    throw new SiloUnavailableError(this.reason ? `${SILO_UNAVAILABLE_MESSAGE} ${this.reason}` : SILO_UNAVAILABLE_MESSAGE);
  }

  async archiveStream(): Promise<SiloArchiveResult> {
    return this.fail();
  }

  async requestRestore(): Promise<SiloRestoreRequestResult> {
    return this.fail();
  }

  async checkRestoreStatus(): Promise<SiloRestoreStatusResult> {
    return this.fail();
  }

  async getArchiveObjectInfo(): Promise<SiloArchiveObjectInfo | null> {
    return this.fail();
  }

  async getObjectStream(): Promise<{ stream: NodeJS.ReadableStream; contentType?: string; contentLength?: number }> {
    return this.fail();
  }

  async getPresignedDownloadUrl(): Promise<string> {
    return this.fail();
  }

  async deleteArchiveObject(): Promise<void> {
    return this.fail();
  }
}

let reportedMisconfiguration = false;

export class SiloProviderFactory {
  /**
   * The AWS Glacier provider when The Silo is switched on (SILO_ENABLED=true) and AWS is
   * configured; otherwise an UnavailableSiloProvider, whose every call throws. Archiving
   * deletes the R2 originals, so The Silo never falls back to a store that loses files.
   *
   * SILO_ENABLED=true without AWS settings is logged as an error (once per process) and
   * every Silo call fails. It does not throw here: the container builds this provider on
   * every request, and a Silo misconfiguration must not take the rest of the app down.
   *
   * The in-memory mock is returned only when explicitly asked for, under NODE_ENV=test.
   */
  static createProvider(options?: { allowMock?: boolean }): ISiloStorageProvider {
    if (options?.allowMock) {
      if (process.env.NODE_ENV !== "test") {
        throw new Error("MockSiloGlacierProvider is only available when NODE_ENV is \"test\".");
      }
      return new MockSiloGlacierProvider();
    }

    if (env.isSiloEnabled) {
      return new AwsSiloGlacierProvider({
        region: env.AWS_REGION || "us-east-1",
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        bucket: env.AWS_S3_SILO_BUCKET,
        storageClass: (env.AWS_SILO_STORAGE_CLASS as GlacierStorageClass) || "DEEP_ARCHIVE",
      });
    }

    if (env.SILO_ENABLED) {
      const reason =
        "SILO_ENABLED is true but AWS S3 Glacier is not configured (AWS_S3_SILO_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).";
      if (!reportedMisconfiguration) {
        reportedMisconfiguration = true;
        log.error(`${reason} The Silo stays off until they are set.`);
      }
      return new UnavailableSiloProvider(reason);
    }

    return new UnavailableSiloProvider("It is switched off (SILO_ENABLED is not \"true\").");
  }
}

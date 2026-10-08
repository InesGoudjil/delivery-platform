import {
  IStorageProvider,
  CreateUploadUrlParams,
  DirectUploadResult,
  PlaybackInfo,
  StorageAssetStatus,
} from "./storage.provider";
import { CloudflareStreamStorageProvider } from "./cloudflare-stream.provider";
import { CloudflareR2StorageProvider } from "./cloudflare-r2.provider";
import { MockStorageProvider } from "./mock-storage.provider";
import { env } from "@/lib/env";

export interface StorageFactoryOptions {
  providerType?: "cloudflare" | "mock" | "auto";
  cloudflare?: {
    accountId?: string;
    apiToken?: string;
    customerSubdomain?: string;
    webhookSecret?: string;
  };
}

/**
 * Composite Storage Provider that routes video uploads to Cloudflare Stream and image/photo gallery uploads to Cloudflare R2.
 */
class CompositeStorageProvider implements IStorageProvider {
  readonly providerName = "composite_cloudflare";

  constructor(
    private readonly streamProvider: IStorageProvider,
    private readonly r2Provider: IStorageProvider
  ) {}

  private getProviderForAsset(assetType: string): IStorageProvider {
    if (assetType === "image" || assetType === "photo_gallery") {
      return this.r2Provider;
    }
    return this.streamProvider;
  }

  async createDirectUploadUrl(params: CreateUploadUrlParams): Promise<DirectUploadResult> {
    const provider = this.getProviderForAsset(params.assetType);
    return provider.createDirectUploadUrl(params);
  }

  private isStreamAsset(providerUid: string): boolean {
    return (
      /^[a-f0-9]{32}$/i.test(providerUid) ||
      providerUid.startsWith("mock_stream_") ||
      providerUid.startsWith("stream_") ||
      providerUid.includes("videodelivery.net") ||
      providerUid.includes("cloudflarestream.com")
    );
  }

  private isR2Asset(providerUid: string): boolean {
    return (
      providerUid.startsWith("workspaces/") ||
      (providerUid.includes("/") && !providerUid.startsWith("http")) ||
      /\.(jpe?g|png|avif|webp|gif|svg|bmp|tiff)$/i.test(providerUid)
    );
  }

  async getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null> {
    if (this.isStreamAsset(providerUid)) {
      return this.streamProvider.getPlaybackInfo(providerUid);
    }

    if (this.isR2Asset(providerUid)) {
      return this.r2Provider.getPlaybackInfo(providerUid);
    }

    // Fallback: try Stream provider first
    try {
      const streamInfo = await this.streamProvider.getPlaybackInfo(providerUid);
      if (streamInfo) return streamInfo;
    } catch {
      // Ignore and check R2
    }
    return this.r2Provider.getPlaybackInfo(providerUid);
  }

  async getAssetStatus(providerUid: string): Promise<StorageAssetStatus> {
    if (this.isStreamAsset(providerUid)) {
      return this.streamProvider.getAssetStatus(providerUid);
    }

    if (this.isR2Asset(providerUid)) {
      return this.r2Provider.getAssetStatus(providerUid);
    }

    try {
      const status = await this.streamProvider.getAssetStatus(providerUid);
      if (status) return status;
    } catch {
      // Ignore and check R2
    }
    return this.r2Provider.getAssetStatus(providerUid);
  }

  async deleteAsset(providerUid: string): Promise<void> {
    if (this.isStreamAsset(providerUid)) {
      await this.streamProvider.deleteAsset(providerUid);
      return;
    }

    if (this.isR2Asset(providerUid)) {
      await this.r2Provider.deleteAsset(providerUid);
      return;
    }

    try {
      await this.streamProvider.deleteAsset(providerUid);
    } catch {
      await this.r2Provider.deleteAsset(providerUid);
    }
  }

  async getSecurePlaybackUrl(
    providerUid: string,
    isPublic?: boolean,
    expiresInSeconds?: number
  ): Promise<string> {
    if (this.isStreamAsset(providerUid)) {
      if (typeof this.streamProvider.getSecurePlaybackUrl === "function") {
        return this.streamProvider.getSecurePlaybackUrl(providerUid, isPublic, expiresInSeconds);
      }
      const streamInfo = await this.streamProvider.getPlaybackInfo(providerUid);
      return streamInfo?.hlsManifestUrl || providerUid;
    }

    if (typeof this.r2Provider.getSecurePlaybackUrl === "function") {
      return this.r2Provider.getSecurePlaybackUrl(providerUid, isPublic, expiresInSeconds);
    }
    const info = await this.r2Provider.getPlaybackInfo(providerUid);
    return info?.rawDownloadUrl || info?.hlsManifestUrl || providerUid;
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (typeof this.streamProvider.verifyWebhookSignature === "function") {
      return this.streamProvider.verifyWebhookSignature(rawBody, headers);
    }
    return true;
  }

  async getObjectStream(providerUid: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType?: string;
    contentLength?: number;
  }> {
    if (typeof this.r2Provider.getObjectStream === "function") {
      return this.r2Provider.getObjectStream(providerUid);
    }
    throw new Error("getObjectStream not implemented on current storage provider");
  }

  async putObjectStream(
    providerUid: string,
    body: NodeJS.ReadableStream | Buffer | Uint8Array,
    contentType?: string,
    contentLength?: number
  ): Promise<void> {
    if (typeof this.r2Provider.putObjectStream === "function") {
      return this.r2Provider.putObjectStream(providerUid, body, contentType, contentLength);
    }
    throw new Error("putObjectStream not implemented on current storage provider");
  }
}

export class StorageProviderFactory {
  /**
   * Resolves the configured storage provider backed by Zod environment configuration.
   */
  static createProvider(options?: StorageFactoryOptions): IStorageProvider {
    const providerType = options?.providerType || env.STORAGE_PROVIDER || process.env.STORAGE_PROVIDER || "auto";

    const cfAccountId = options?.cloudflare?.accountId || env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = options?.cloudflare?.apiToken || env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_STREAM_TOKEN;
    const cfSubdomain = options?.cloudflare?.customerSubdomain || env.CLOUDFLARE_STREAM_SUBDOMAIN || process.env.CLOUDFLARE_STREAM_SUBDOMAIN;
    const cfWebhookSecret = options?.cloudflare?.webhookSecret || env.CLOUDFLARE_WEBHOOK_SECRET || process.env.CLOUDFLARE_WEBHOOK_SECRET;

    const r2PublicBucket = env.CLOUDFLARE_R2_PUBLIC_BUCKET || env.CLOUDFLARE_R2_BUCKET || process.env.CLOUDFLARE_R2_PUBLIC_BUCKET || process.env.CLOUDFLARE_R2_BUCKET;
    const r2PrivateBucket = env.CLOUDFLARE_R2_PRIVATE_BUCKET || env.CLOUDFLARE_R2_BUCKET || process.env.CLOUDFLARE_R2_PRIVATE_BUCKET || process.env.CLOUDFLARE_R2_BUCKET;
    const r2AccessKey = env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const r2SecretKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const r2Endpoint = env.CLOUDFLARE_R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT;
    const r2PublicDomain = env.CLOUDFLARE_R2_PUBLIC_DOMAIN || process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;

    const hasStreamCreds =
      Boolean(cfAccountId) &&
      cfAccountId !== "your-cloudflare-account-id" &&
      Boolean(cfApiToken) &&
      cfApiToken !== "your-cloudflare-stream-token";

    const isR2Configured =
      Boolean(r2PublicBucket || r2PrivateBucket) &&
      Boolean(r2AccessKey) &&
      Boolean(r2SecretKey);

    const isCloudflareMode =
      providerType === "cloudflare" ||
      providerType === "auto" ||
      hasStreamCreds ||
      isR2Configured;

    if (isCloudflareMode && (hasStreamCreds || isR2Configured)) {
      const streamProvider: IStorageProvider = hasStreamCreds
        ? new CloudflareStreamStorageProvider({
            accountId: cfAccountId!,
            apiToken: cfApiToken!,
            customerSubdomain: cfSubdomain,
            webhookSecret: cfWebhookSecret,
          })
        : new MockStorageProvider();

      const r2Provider: IStorageProvider = isR2Configured
        ? new CloudflareR2StorageProvider({
            publicBucket: r2PublicBucket,
            privateBucket: r2PrivateBucket,
            bucket: r2PublicBucket || r2PrivateBucket || "",
            accessKeyId: r2AccessKey!,
            secretAccessKey: r2SecretKey!,
            endpoint: r2Endpoint || "",
            publicDomain: r2PublicDomain,
          })
        : new MockStorageProvider();

      return new CompositeStorageProvider(streamProvider, r2Provider);
    }

    // Default development fallback
    return new MockStorageProvider();
  }
}

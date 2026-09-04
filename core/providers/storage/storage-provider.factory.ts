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

  async getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null> {
    // Attempt Stream provider first, then fall back to R2
    try {
      const streamInfo = await this.streamProvider.getPlaybackInfo(providerUid);
      if (streamInfo && streamInfo.status !== "error") return streamInfo;
    } catch {
      // Ignore and check R2
    }
    return this.r2Provider.getPlaybackInfo(providerUid);
  }

  async getAssetStatus(providerUid: string): Promise<StorageAssetStatus> {
    try {
      const status = await this.streamProvider.getAssetStatus(providerUid);
      if (status && status.status !== "error") return status;
    } catch {
      // Ignore and check R2
    }
    return this.r2Provider.getAssetStatus(providerUid);
  }

  async deleteAsset(providerUid: string): Promise<void> {
    try {
      await this.streamProvider.deleteAsset(providerUid);
    } catch {
      await this.r2Provider.deleteAsset(providerUid);
    }
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (typeof this.streamProvider.verifyWebhookSignature === "function") {
      return this.streamProvider.verifyWebhookSignature(rawBody, headers);
    }
    return true;
  }
}

export class StorageProviderFactory {
  /**
   * Resolves the configured storage provider backed by Zod environment configuration.
   */
  static createProvider(options?: StorageFactoryOptions): IStorageProvider {
    const providerType = options?.providerType || env.STORAGE_PROVIDER || "auto";

    const cfAccountId = options?.cloudflare?.accountId || env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = options?.cloudflare?.apiToken || env.CLOUDFLARE_API_TOKEN;
    const cfSubdomain = options?.cloudflare?.customerSubdomain || env.CLOUDFLARE_STREAM_SUBDOMAIN;
    const cfWebhookSecret = options?.cloudflare?.webhookSecret || env.CLOUDFLARE_WEBHOOK_SECRET;

    const hasStreamCreds =
      Boolean(cfAccountId) &&
      cfAccountId !== "your-cloudflare-account-id" &&
      Boolean(cfApiToken) &&
      cfApiToken !== "your-cloudflare-stream-token";

    const isCloudflareMode =
      providerType === "cloudflare" ||
      providerType === "auto" ||
      hasStreamCreds ||
      env.isCloudflareR2Configured;

    if (isCloudflareMode && (hasStreamCreds || env.isCloudflareR2Configured)) {
      const streamProvider: IStorageProvider = hasStreamCreds
        ? new CloudflareStreamStorageProvider({
            accountId: cfAccountId!,
            apiToken: cfApiToken!,
            customerSubdomain: cfSubdomain,
            webhookSecret: cfWebhookSecret,
          })
        : new MockStorageProvider();

      const r2Provider: IStorageProvider = env.isCloudflareR2Configured
        ? new CloudflareR2StorageProvider({
            bucket: env.CLOUDFLARE_R2_BUCKET,
            accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
            secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
            endpoint: env.CLOUDFLARE_R2_ENDPOINT,
            publicDomain: env.CLOUDFLARE_R2_PUBLIC_DOMAIN,
          })
        : new MockStorageProvider();

      return new CompositeStorageProvider(streamProvider, r2Provider);
    }

    // Default development fallback
    return new MockStorageProvider();
  }
}

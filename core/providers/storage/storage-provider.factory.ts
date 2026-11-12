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
import { parseStoredMedia } from "@/lib/storage/keys";

export interface StorageFactoryOptions {
  providerType?: "cloudflare" | "mock" | "auto";
  cloudflare?: {
    accountId?: string;
    apiToken?: string;
    customerSubdomain?: string;
    webhookSecret?: string;
  };
}

type StorageRoute =
  | { kind: "stream"; uid: string }
  | { kind: "r2"; key: string }
  | { kind: "mock"; value: string };

/** Values the mock provider hands out in development ("mock_stream_..." ids, mock upload paths). */
const MOCK_LOCATION = /^(?:mock_stream_[A-Za-z0-9_]+|\/api\/mock-upload\/[A-Za-z0-9_-]+)$/;

/**
 * Which backend a stored location belongs to. Stream calls only ever get a validated 32-hex
 * UID and R2 calls a clean workspace key; anything else is refused instead of guessed.
 */
export function routeStorageLocation(location: string | null | undefined): StorageRoute | null {
  const parsed = parseStoredMedia(location);
  if (parsed?.kind === "stream") return { kind: "stream", uid: parsed.uid };
  if (parsed?.kind === "r2") return parsed.workspaceId ? { kind: "r2", key: parsed.key } : null;
  const value = (location ?? "").trim().split(/[?#]/)[0];
  if (MOCK_LOCATION.test(value)) return { kind: "mock", value };
  return null;
}

function unrecognised(): Error {
  return new Error("Unrecognised storage location.");
}

/**
 * Composite Storage Provider that routes video uploads to Cloudflare Stream and image/photo gallery uploads to Cloudflare R2.
 */
class CompositeStorageProvider implements IStorageProvider {
  readonly providerName = "composite_cloudflare";

  // Capabilities exist only when the backend behind them is configured.
  readonly headObject?: IStorageProvider["headObject"];
  readonly readObjectStart?: IStorageProvider["readObjectStart"];
  readonly getStreamVideo?: IStorageProvider["getStreamVideo"];
  readonly copyFromUrl?: IStorageProvider["copyFromUrl"];

  constructor(
    private readonly streamProvider: IStorageProvider,
    private readonly r2Provider: IStorageProvider
  ) {
    const r2 = r2Provider;
    const stream = streamProvider;
    if (typeof r2.headObject === "function") {
      this.headObject = (key) => r2.headObject!(key);
    }
    if (typeof r2.readObjectStart === "function") {
      this.readObjectStart = (key, length) => r2.readObjectStart!(key, length);
    }
    if (typeof stream.getStreamVideo === "function") {
      this.getStreamVideo = (uid) => stream.getStreamVideo!(uid);
    }
    if (stream.providerName === "cloudflare_stream" && typeof stream.copyFromUrl === "function") {
      this.copyFromUrl = (sourceUrl, metadata) => stream.copyFromUrl!(sourceUrl, metadata);
    }
  }

  private getProviderForAsset(assetType: string): IStorageProvider {
    // If Cloudflare R2 is configured, route master uploads (videos, images, raw files) to R2
    // so the pristine uncompressed original file is preserved for downloads.
    if (this.r2Provider.providerName === "cloudflare_r2") {
      return this.r2Provider;
    }
    if (assetType === "image" || assetType === "photo_gallery") {
      return this.r2Provider;
    }
    return this.streamProvider;
  }

  /** The mock provider standing in for an unconfigured backend, if any. */
  private mockProvider(): IStorageProvider | null {
    if (this.streamProvider.providerName === "mock_storage") return this.streamProvider;
    if (this.r2Provider.providerName === "mock_storage") return this.r2Provider;
    return null;
  }

  private providerFor(route: StorageRoute | null): { provider: IStorageProvider; location: string } {
    if (route?.kind === "stream") return { provider: this.streamProvider, location: route.uid };
    if (route?.kind === "r2") return { provider: this.r2Provider, location: route.key };
    const mock = route?.kind === "mock" ? this.mockProvider() : null;
    if (route?.kind === "mock" && mock) return { provider: mock, location: route.value };
    throw unrecognised();
  }

  async createDirectUploadUrl(params: CreateUploadUrlParams): Promise<DirectUploadResult> {
    const provider = this.getProviderForAsset(params.assetType);
    return provider.createDirectUploadUrl(params);
  }

  async getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null> {
    const { provider, location } = this.providerFor(routeStorageLocation(providerUid));
    return provider.getPlaybackInfo(location);
  }

  async getAssetStatus(providerUid: string): Promise<StorageAssetStatus> {
    const { provider, location } = this.providerFor(routeStorageLocation(providerUid));
    return provider.getAssetStatus(location);
  }

  async deleteAsset(providerUid: string): Promise<void> {
    const { provider, location } = this.providerFor(routeStorageLocation(providerUid));
    await provider.deleteAsset(location);
  }

  async getSecurePlaybackUrl(
    providerUid: string,
    isPublic?: boolean,
    expiresInSeconds?: number
  ): Promise<string> {
    const route = routeStorageLocation(providerUid);
    const { provider, location } = this.providerFor(route);
    if (route?.kind === "mock") return location;
    if (typeof provider.getSecurePlaybackUrl === "function") {
      return provider.getSecurePlaybackUrl(location, isPublic, expiresInSeconds);
    }
    const info = await provider.getPlaybackInfo(location);
    const url = route?.kind === "stream" ? info?.hlsManifestUrl : info?.rawDownloadUrl || info?.hlsManifestUrl;
    if (!url) throw unrecognised();
    return url;
  }

  async getSecureDownloadUrl(
    providerUid: string,
    filename: string,
    isPublic?: boolean,
    expiresInSeconds?: number
  ): Promise<string> {
    const route = routeStorageLocation(providerUid);
    const { provider, location } = this.providerFor(route);
    if (typeof provider.getSecureDownloadUrl === "function") {
      return provider.getSecureDownloadUrl(location, filename, isPublic, expiresInSeconds);
    }
    if (route?.kind === "stream" || route?.kind === "mock") {
      return `/api/media/${location.replace(/^\/api\/media\//, "")}?download=true&filename=${encodeURIComponent(filename)}`;
    }
    return this.getSecurePlaybackUrl(location, isPublic, expiresInSeconds);
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (typeof this.streamProvider.verifyWebhookSignature === "function") {
      return this.streamProvider.verifyWebhookSignature(rawBody, headers);
    }
    return false;
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

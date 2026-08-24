import { IStorageProvider } from "./storage.provider";
import { CloudflareStreamStorageProvider } from "./cloudflare-stream.provider";
import { MockStorageProvider } from "./mock-storage.provider";

export interface StorageFactoryOptions {
  providerType?: "cloudflare" | "mock" | "auto";
  cloudflare?: {
    accountId?: string;
    apiToken?: string;
    customerSubdomain?: string;
    webhookSecret?: string;
  };
}

export class StorageProviderFactory {
  /**
   * Resolves the configured storage provider.
   * Defaults to 'auto', which uses Cloudflare if credentials exist, or falls back to MockStorageProvider.
   */
  static createProvider(options?: StorageFactoryOptions): IStorageProvider {
    const providerType = options?.providerType || process.env.STORAGE_PROVIDER || "auto";

    const cfAccountId =
      options?.cloudflare?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken =
      options?.cloudflare?.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    const cfSubdomain =
      options?.cloudflare?.customerSubdomain || process.env.CLOUDFLARE_STREAM_SUBDOMAIN;
    const cfWebhookSecret =
      options?.cloudflare?.webhookSecret || process.env.CLOUDFLARE_WEBHOOK_SECRET;

    if (providerType === "cloudflare" || (providerType === "auto" && cfAccountId && cfApiToken)) {
      if (!cfAccountId || !cfApiToken) {
        throw new Error(
          "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required for Cloudflare storage provider."
        );
      }
      return new CloudflareStreamStorageProvider({
        accountId: cfAccountId,
        apiToken: cfApiToken,
        customerSubdomain: cfSubdomain,
        webhookSecret: cfWebhookSecret,
      });
    }

    // Default development fallback
    return new MockStorageProvider();
  }
}

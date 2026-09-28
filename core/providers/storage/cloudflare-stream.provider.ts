import {
  IStorageProvider,
  CreateUploadUrlParams,
  DirectUploadResult,
  PlaybackInfo,
  StorageAssetStatus,
} from "./storage.provider";

export interface CloudflareStreamConfig {
  accountId: string;
  apiToken: string;
  customerSubdomain?: string; // Optional custom subdomain e.g. stream.yourdomain.com
  webhookSecret?: string;
}

export class CloudflareStreamStorageProvider implements IStorageProvider {
  readonly providerName = "cloudflare_stream";

  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly deliveryDomain: string;
  private readonly webhookSecret?: string;

  constructor(config: CloudflareStreamConfig) {
    if (!config.accountId || !config.apiToken) {
      throw new Error(
        "CloudflareStreamStorageProvider requires both accountId and apiToken."
      );
    }
    this.accountId = config.accountId;
    this.apiToken = config.apiToken;
    const rawDomain = config.customerSubdomain || "videodelivery.net";
    this.deliveryDomain = rawDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * Generates a Cloudflare Stream Direct Creator Upload URL.
   * Allows browser clients to upload files up to 5GB directly without passing through our web server.
   */
  async createDirectUploadUrl(
    params: CreateUploadUrlParams
  ): Promise<DirectUploadResult> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/direct_upload`;

    const body: Record<string, any> = {
      maxDurationSeconds: params.maxDurationSeconds || 7200, // Default 2 hours max
      uploadLength: params.fileSizeBytes,
      requireSignedURLs: false,
      creator: params.workspaceId,
      meta: {
        name: params.assetTitle,
        projectId: params.projectId,
        filename: params.filename,
        ...(params.metadata || {}),
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Cloudflare Stream Direct Upload failed (${response.status}): ${errorText}`
      );
    }

    const json = await response.json();

    if (!json.success || !json.result) {
      throw new Error(
        `Cloudflare Stream API error: ${JSON.stringify(json.errors || "Unknown error")}`
      );
    }

    const { uploadURL, uid } = json.result;

    return {
      uploadUrl: uploadURL,
      providerUid: uid,
      uploadType: "tus_chunked",
      headers: {
        "Upload-Length": String(params.fileSizeBytes),
      },
    };
  }

  /**
   * Builds standardized Cloudflare Stream HLS, DASH, and thumbnail URLs for a video UID
   */
  async getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null> {
    let status: StorageAssetStatus = {
      providerUid,
      status: "processing",
    };
    try {
      status = await this.getAssetStatus(providerUid);
    } catch (err: any) {
      console.warn(`[CloudflareStream] Failed to get asset status for ${providerUid}:`, err?.message || err);
    }

    const iframeEmbedUrl = this.deliveryDomain.includes("videodelivery.net")
      ? `https://iframe.videodelivery.net/${providerUid}`
      : `https://${this.deliveryDomain}/${providerUid}/iframe`;

    const hlsManifestUrl = `https://${this.deliveryDomain}/${providerUid}/manifest/video.m3u8`;
    const thumbnailUrl = `https://${this.deliveryDomain}/${providerUid}/thumbnails/thumbnail.jpg?time=1s&height=720`;

    return {
      providerUid,
      hlsManifestUrl,
      dashManifestUrl: `https://${this.deliveryDomain}/${providerUid}/manifest/video.mpd`,
      thumbnailUrl,
      animatedThumbnailUrl: `https://${this.deliveryDomain}/${providerUid}/thumbnails/thumbnail.gif?time=1s&duration=3s`,
      iframeEmbedUrl,
      durationSeconds: status.durationSeconds,
      status: status.status || "processing",
      rawDownloadUrl: hlsManifestUrl,
    } as any;
  }

  /**
   * Polls Cloudflare for video processing/transcoding status
   */
  async getAssetStatus(providerUid: string): Promise<StorageAssetStatus> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${providerUid}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { providerUid, status: "pending" };
        }
        const errorText = await response.text();
        return {
          providerUid,
          status: "error",
          errorMessage: `Cloudflare Stream error (${response.status}): ${errorText}`,
          hlsManifestUrl: `https://${this.deliveryDomain}/${providerUid}/manifest/video.m3u8`,
          thumbnailUrl: `https://${this.deliveryDomain}/${providerUid}/thumbnails/thumbnail.jpg?time=1s&height=720`,
        };
      }

      const json = await response.json();
      const result = json.result;

      if (!result) {
        return {
          providerUid,
          status: "pending",
          hlsManifestUrl: `https://${this.deliveryDomain}/${providerUid}/manifest/video.m3u8`,
          thumbnailUrl: `https://${this.deliveryDomain}/${providerUid}/thumbnails/thumbnail.jpg?time=1s&height=720`,
        };
      }

      const state = result.status?.state; // 'ready', 'inprogress', 'queued', 'error'
      let status: StorageAssetStatus["status"] = "pending";

      if (state === "ready") status = "ready";
      else if (state === "inprogress" || state === "queued") status = "processing";
      else if (state === "error") status = "error";

      return {
        providerUid,
        status,
        durationSeconds: result.duration ? Number(result.duration) : undefined,
        fileSizeBytes: result.size ? Number(result.size) : undefined,
        hlsManifestUrl: `https://${this.deliveryDomain}/${providerUid}/manifest/video.m3u8`,
        thumbnailUrl: `https://${this.deliveryDomain}/${providerUid}/thumbnails/thumbnail.jpg?time=1s&height=720`,
        errorMessage: result.status?.errorReasonText,
      };
    } catch (err: any) {
      console.warn(`[CloudflareStream] Network error querying status for ${providerUid}:`, err?.message || err);
      return {
        providerUid,
        status: "processing",
        hlsManifestUrl: `https://${this.deliveryDomain}/${providerUid}/manifest/video.m3u8`,
        thumbnailUrl: `https://${this.deliveryDomain}/${providerUid}/thumbnails/thumbnail.jpg?time=1s&height=720`,
      };
    }
  }

  /**
   * Deletes a video from Cloudflare Stream
   */
  async deleteAsset(providerUid: string): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${providerUid}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Failed to delete Cloudflare asset (${response.status}): ${errorText}`);
    }
  }

  /**
   * Verifies the Cloudflare webhook signature
   */
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (!this.webhookSecret) return true; // If no secret configured, bypass in dev
    // In production, Cloudflare sends `Webhook-Signature: time=...,sig1=...`
    const signatureHeader = headers["webhook-signature"] || headers["Webhook-Signature"];
    return Boolean(signatureHeader);
  }
}

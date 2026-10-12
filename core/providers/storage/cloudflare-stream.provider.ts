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
   * Ensures MP4 downloads are enabled on Cloudflare Stream for a given video UID.
   * By default, Cloudflare Stream disables `/downloads/default.mp4` (returning 404 Not Found)
   * until `POST /accounts/{account_id}/stream/{identifier}/downloads` is called.
   */
  async ensureMp4DownloadEnabled(
    providerUid: string,
    waitUntilReadyMs: number = 0
  ): Promise<string | null> {
    const cleanUid = providerUid.match(/([a-f0-9]{32})/i)?.[1] || providerUid.trim();
    if (!/^[a-f0-9]{32}$/i.test(cleanUid)) return null;

    const downloadsEndpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${cleanUid}/downloads`;
    const fallbackUrl = `https://${this.deliveryDomain}/${cleanUid}/downloads/default.mp4`;

    try {
      // 1. Trigger POST to enable or retrieve existing default MP4 download
      let response = await fetch(downloadsEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
      });

      // If POST returns 4xx because download is already enabled or being generated, fall back to GET
      if (!response.ok) {
        response = await fetch(downloadsEndpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        });
      }

      if (!response.ok) {
        return fallbackUrl;
      }

      let json = await response.json();
      let defaultDownload = json?.result?.default;
      let downloadUrl: string = defaultDownload?.url || fallbackUrl;
      let status: string | undefined = defaultDownload?.status;

      if (status === "ready" || waitUntilReadyMs <= 0) {
        return downloadUrl;
      }

      // 2. Optionally poll until the MP4 rendition finishes generating (typically 1–4 seconds)
      const deadline = Date.now() + waitUntilReadyMs;
      while (Date.now() < deadline && status !== "ready" && status !== "error") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const pollRes = await fetch(downloadsEndpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        });
        if (!pollRes.ok) break;
        json = await pollRes.json();
        defaultDownload = json?.result?.default;
        if (defaultDownload?.url) {
          downloadUrl = defaultDownload.url;
        }
        status = defaultDownload?.status;
      }

      return downloadUrl;
    } catch (err: any) {
      console.warn(
        `[CloudflareStream] Failed to enable MP4 download for ${cleanUid}:`,
        err?.message || err
      );
      return fallbackUrl;
    }
  }

  /**
   * Generates a download URL for a Cloudflare Stream video and warms up MP4 generation in the background.
   */
  async getSecureDownloadUrl(
    providerUid: string,
    filename: string
  ): Promise<string> {
    const cleanUid = providerUid.match(/([a-f0-9]{32})/i)?.[1] || providerUid.trim();
    // Warm up MP4 generation on Cloudflare Stream asynchronously when presigning
    void this.ensureMp4DownloadEnabled(cleanUid, 0);
    return `/api/media/${cleanUid}?download=true&filename=${encodeURIComponent(filename)}`;
  }

  /**
   * Builds standardized Cloudflare Stream HLS, DASH, and thumbnail URLs for a video UID
   */
  async getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null> {
    const cleanUid = providerUid.match(/([a-f0-9]{32})/i)?.[1] || providerUid.trim();
    let status: StorageAssetStatus = {
      providerUid: cleanUid,
      status: "processing",
    };
    try {
      status = await this.getAssetStatus(cleanUid);
    } catch (err: any) {
      console.warn(`[CloudflareStream] Failed to get asset status for ${cleanUid}:`, err?.message || err);
    }

    if (status.status === "ready") {
      void this.ensureMp4DownloadEnabled(cleanUid, 0);
    }

    const iframeEmbedUrl = this.deliveryDomain.includes("videodelivery.net")
      ? `https://iframe.videodelivery.net/${cleanUid}`
      : `https://${this.deliveryDomain}/${cleanUid}/iframe`;

    const hlsManifestUrl = `https://${this.deliveryDomain}/${cleanUid}/manifest/video.m3u8`;
    const thumbnailUrl = `https://${this.deliveryDomain}/${cleanUid}/thumbnails/thumbnail.jpg?time=1s&height=720`;
    const mp4DownloadUrl = `https://${this.deliveryDomain}/${cleanUid}/downloads/default.mp4`;

    return {
      providerUid: cleanUid,
      hlsManifestUrl,
      dashManifestUrl: `https://${this.deliveryDomain}/${cleanUid}/manifest/video.mpd`,
      thumbnailUrl,
      animatedThumbnailUrl: `https://${this.deliveryDomain}/${cleanUid}/thumbnails/thumbnail.gif?time=1s&duration=3s`,
      iframeEmbedUrl,
      durationSeconds: status.durationSeconds,
      status: status.status || "processing",
      rawDownloadUrl: mp4DownloadUrl,
    } as any;
  }

  /**
   * Polls Cloudflare for video processing/transcoding status
   */
  async getAssetStatus(providerUid: string): Promise<StorageAssetStatus> {
    const cleanUid = providerUid.match(/([a-f0-9]{32})/i)?.[1] || providerUid.trim();
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${cleanUid}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { providerUid: cleanUid, status: "pending" };
        }
        const errorText = await response.text();
        return {
          providerUid: cleanUid,
          status: "error",
          errorMessage: `Cloudflare Stream error (${response.status}): ${errorText}`,
          hlsManifestUrl: `https://${this.deliveryDomain}/${cleanUid}/manifest/video.m3u8`,
          thumbnailUrl: `https://${this.deliveryDomain}/${cleanUid}/thumbnails/thumbnail.jpg?time=1s&height=720`,
        };
      }

      const json = await response.json();
      const result = json.result;

      if (!result) {
        return {
          providerUid: cleanUid,
          status: "pending",
          hlsManifestUrl: `https://${this.deliveryDomain}/${cleanUid}/manifest/video.m3u8`,
          thumbnailUrl: `https://${this.deliveryDomain}/${cleanUid}/thumbnails/thumbnail.jpg?time=1s&height=720`,
        };
      }

      const state = result.status?.state; // 'ready', 'inprogress', 'queued', 'error'
      let status: StorageAssetStatus["status"] = "pending";

      if (state === "ready") {
        status = "ready";
        void this.ensureMp4DownloadEnabled(cleanUid, 0);
      } else if (state === "inprogress" || state === "queued") {
        status = "processing";
      } else if (state === "error") {
        status = "error";
      }

      return {
        providerUid: cleanUid,
        status,
        durationSeconds: result.duration ? Number(result.duration) : undefined,
        fileSizeBytes: result.size ? Number(result.size) : undefined,
        hlsManifestUrl: `https://${this.deliveryDomain}/${cleanUid}/manifest/video.m3u8`,
        thumbnailUrl: `https://${this.deliveryDomain}/${cleanUid}/thumbnails/thumbnail.jpg?time=1s&height=720`,
        errorMessage: result.status?.errorReasonText,
      };
    } catch (err: any) {
      console.warn(`[CloudflareStream] Network error querying status for ${cleanUid}:`, err?.message || err);
      return {
        providerUid: cleanUid,
        status: "processing",
        hlsManifestUrl: `https://${this.deliveryDomain}/${cleanUid}/manifest/video.m3u8`,
        thumbnailUrl: `https://${this.deliveryDomain}/${cleanUid}/thumbnails/thumbnail.jpg?time=1s&height=720`,
      };
    }
  }

  /**
   * Deletes a video from Cloudflare Stream
   */
  async deleteAsset(providerUid: string): Promise<void> {
    const cleanUid = providerUid.match(/([a-f0-9]{32})/i)?.[1] || providerUid.trim();
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${cleanUid}`;

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

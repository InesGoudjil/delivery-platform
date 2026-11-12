import crypto from "crypto";
import { createScopedLogger } from "@/lib/logger";
import { isStreamUid, streamUidOf } from "@/lib/storage/keys";
import {
  IStorageProvider,
  CreateUploadUrlParams,
  DirectUploadResult,
  PlaybackInfo,
  StorageAssetStatus,
  StreamVideoInfo,
} from "./storage.provider";

const log = createScopedLogger({ provider: "CloudflareStream" });

/** Cloudflare caps direct uploads at 6 hours of video. */
const MAX_DURATION_SECONDS = 21600;

/**
 * The 32-hex video UID in a value (a bare UID, "/api/media/<uid>", or a Stream delivery URL),
 * or null. Every Stream API path is built from this, never from the raw value.
 */
export function toStreamUid(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (isStreamUid(trimmed)) return trimmed.toLowerCase();
  return streamUidOf(trimmed);
}

function requireStreamUid(value: string | null | undefined): string {
  const uid = toStreamUid(value);
  if (!uid) throw new Error("Invalid Cloudflare Stream video id.");
  return uid;
}

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

    const requestedDuration = Math.floor(Number(params.maxDurationSeconds) || 7200); // Default 2 hours max
    // Only server-decided values go into the video's metadata.
    const meta: Record<string, string> = {
      name: params.assetTitle,
      workspaceId: params.workspaceId,
      assetId: params.assetId,
      filename: params.filename,
    };
    if (params.deliveryId) meta.deliveryId = params.deliveryId;

    const body: Record<string, any> = {
      maxDurationSeconds: Math.min(Math.max(requestedDuration, 1), MAX_DURATION_SECONDS),
      uploadLength: params.fileSizeBytes,
      requireSignedURLs: false,
      creator: params.workspaceId,
      meta,
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

    const { uploadURL } = json.result;
    const uid = toStreamUid(json.result.uid);
    if (!uid || typeof uploadURL !== "string") {
      throw new Error("Cloudflare Stream returned an unexpected direct upload response.");
    }

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
   * Ingests a video from a publicly-accessible or presigned URL into Cloudflare Stream via the Copy API.
   * Allows Cloudflare Stream to pull master video files stored in Cloudflare R2 and generate HLS/DASH streaming renditions.
   */
  async copyFromUrl(
    sourceUrl: string,
    metadata?: {
      name?: string;
      creator?: string;
      allowedOrigins?: string[];
      meta?: Record<string, string>;
    }
  ): Promise<{ uid: string; status?: string }> {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/copy`;

    const body: Record<string, any> = {
      url: sourceUrl,
      meta: {
        name: metadata?.name || "Video Cut",
        ...(metadata?.meta || {}),
      },
      requireSignedURLs: false,
    };
    if (metadata?.creator) {
      body.creator = metadata.creator;
    }
    if (metadata?.allowedOrigins && metadata.allowedOrigins.length > 0) {
      body.allowedOrigins = metadata.allowedOrigins;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare Stream copy API failed (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    if (!json.success || !json.result) {
      throw new Error(
        `Cloudflare Stream copy API error: ${JSON.stringify(json.errors || "Unknown error")}`
      );
    }

    const uid = toStreamUid(json.result.uid);
    if (!uid) {
      throw new Error("Cloudflare Stream copy API returned an unexpected video id.");
    }
    const status = json.result.status?.state || "processing";

    return { uid, status };
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
    const cleanUid = toStreamUid(providerUid);
    if (!cleanUid) return null;

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
      log.warn(
        { err, cleanUid },
        "Failed to enable MP4 download"
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
    const cleanUid = requireStreamUid(providerUid);
    // Warm up MP4 generation on Cloudflare Stream asynchronously when presigning
    void this.ensureMp4DownloadEnabled(cleanUid, 0);
    return `/api/media/${cleanUid}?download=true&filename=${encodeURIComponent(filename)}`;
  }

  /**
   * Builds standardized Cloudflare Stream HLS, DASH, and thumbnail URLs for a video UID
   */
  async getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null> {
    const cleanUid = requireStreamUid(providerUid);
    let status: StorageAssetStatus = {
      providerUid: cleanUid,
      status: "processing",
    };
    try {
      status = await this.getAssetStatus(cleanUid);
    } catch (err: any) {
      log.warn({ err, cleanUid }, "Failed to get asset status");
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
    const cleanUid = requireStreamUid(providerUid);
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
      log.warn({ err, cleanUid }, "Network error querying status");
      return {
        providerUid: cleanUid,
        status: "processing",
        hlsManifestUrl: `https://${this.deliveryDomain}/${cleanUid}/manifest/video.m3u8`,
        thumbnailUrl: `https://${this.deliveryDomain}/${cleanUid}/thumbnails/thumbnail.jpg?time=1s&height=720`,
      };
    }
  }

  /**
   * A video's owner (`creator` / `meta.workspaceId`, set by this app when it created the
   * video), size, duration and state; null when Stream has no such video.
   */
  async getStreamVideo(uid: string): Promise<StreamVideoInfo | null> {
    const cleanUid = requireStreamUid(uid);
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${cleanUid}`,
      { method: "GET", headers: { Authorization: `Bearer ${this.apiToken}` } }
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Cloudflare Stream lookup failed (${response.status}).`);
    }

    const json = await response.json();
    const result = json?.result;
    if (!result) return null;
    if (toStreamUid(result.uid) !== cleanUid) {
      throw new Error("Cloudflare Stream returned a different video.");
    }

    const state = result.status?.state;
    const status: StreamVideoInfo["status"] =
      state === "ready"
        ? "ready"
        : state === "error"
          ? "error"
          : state === "inprogress" || state === "queued" || state === "downloading"
            ? "processing"
            : "pending";

    const size = Number(result.size);
    const duration = Number(result.duration);
    return {
      uid: cleanUid,
      creator: typeof result.creator === "string" && result.creator ? result.creator : null,
      workspaceId: typeof result.meta?.workspaceId === "string" && result.meta.workspaceId ? result.meta.workspaceId : null,
      sizeBytes: Number.isFinite(size) && size > 0 ? size : null,
      durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : null,
      status,
    };
  }

  /**
   * Deletes a video from Cloudflare Stream
   */
  async deleteAsset(providerUid: string): Promise<void> {
    const cleanUid = requireStreamUid(providerUid);
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
   * Verifies the Cloudflare webhook signature using HMAC-SHA256 and timestamp drift validation.
   */
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (!this.webhookSecret) {
      // Unsigned webhooks are never accepted, in any environment.
      log.error("CLOUDFLARE_WEBHOOK_SECRET is not set; rejecting Stream webhook");
      return false;
    }

    const signatureHeader =
      headers["webhook-signature"] || headers["Webhook-Signature"];
    if (!signatureHeader) {
      return false;
    }

    // Header format: time=<unix_timestamp>,sig1=<hex_signature>
    const parts = signatureHeader.split(",");
    let timestampStr = "";
    let signatureHex = "";

    for (const part of parts) {
      const [key, val] = part.trim().split("=");
      if (key === "time") timestampStr = val;
      if (key === "sig1") signatureHex = val;
    }

    if (!timestampStr || !signatureHex) {
      return false;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return false;
    }

    // Verify timestamp within 300 seconds (5 min) drift window to prevent replay attacks
    const currentEpoch = Math.floor(Date.now() / 1000);
    if (Math.abs(currentEpoch - timestamp) > 300) {
      log.warn("Webhook rejected: timestamp drift exceeds 300 seconds");
      return false;
    }

    // Compute HMAC-SHA256 of `${timestampStr}.${rawBody}`
    const expectedHex = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(`${timestampStr}.${rawBody}`)
      .digest("hex");

    try {
      const expectedBuf = Buffer.from(expectedHex, "hex");
      const actualBuf = Buffer.from(signatureHex, "hex");

      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }
}

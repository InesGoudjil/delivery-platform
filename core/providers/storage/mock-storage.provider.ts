import {
  IStorageProvider,
  CreateUploadUrlParams,
  DirectUploadResult,
  PlaybackInfo,
  StorageAssetStatus,
} from "./storage.provider";

export class MockStorageProvider implements IStorageProvider {
  readonly providerName = "mock_storage";

  // In-memory mock database of uploaded assets
  private mockAssets: Map<
    string,
    {
      params: CreateUploadUrlParams;
      status: "ready" | "processing" | "pending" | "error";
      createdAt: number;
    }
  > = new Map();

  async createDirectUploadUrl(
    params: CreateUploadUrlParams
  ): Promise<DirectUploadResult> {
    const providerUid = `mock_stream_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    this.mockAssets.set(providerUid, {
      params,
      status: "ready", // Mock is instantly ready or simulated
      createdAt: Date.now(),
    });

    return {
      uploadUrl: `/api/mock-upload/${providerUid}`,
      providerUid,
      uploadType: "direct_post",
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  async getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null> {
    const assetUrl = `/api/mock-upload/${providerUid}`;
    return {
      providerUid,
      hlsManifestUrl: `https://files.vidstack.io/sprite-fight/hls/stream.m3u8`,
      thumbnailUrl: `https://files.vidstack.io/sprite-fight/poster.webp`,
      animatedThumbnailUrl: `https://files.vidstack.io/sprite-fight/poster.webp`,
      iframeEmbedUrl: `https://iframe.videodelivery.net/${providerUid}`,
      durationSeconds: 120,
      status: "ready",
      rawDownloadUrl: assetUrl,
    } as any;
  }

  async getAssetStatus(providerUid: string): Promise<StorageAssetStatus> {
    const assetUrl = `/api/mock-upload/${providerUid}`;
    return {
      providerUid,
      status: "ready",
      durationSeconds: 120,
      fileSizeBytes: 1024 * 1024 * 5, // 5 MB mock
      hlsManifestUrl: `https://files.vidstack.io/sprite-fight/hls/stream.m3u8`,
      thumbnailUrl: `https://files.vidstack.io/sprite-fight/poster.webp`,
    };
  }

  async deleteAsset(providerUid: string): Promise<void> {
    this.mockAssets.delete(providerUid);
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}

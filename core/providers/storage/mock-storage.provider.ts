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
      hlsManifestUrl: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`, // Public high-quality sample HLS stream for testing
      thumbnailUrl: assetUrl,
      animatedThumbnailUrl: assetUrl,
      iframeEmbedUrl: `https://www.youtube.com/embed/dQw4w9WgXcQ`,
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
      hlsManifestUrl: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`,
      thumbnailUrl: assetUrl,
    };
  }

  async deleteAsset(providerUid: string): Promise<void> {
    this.mockAssets.delete(providerUid);
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}

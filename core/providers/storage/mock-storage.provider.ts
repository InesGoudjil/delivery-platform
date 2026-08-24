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
    return {
      providerUid,
      hlsManifestUrl: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`, // Public high-quality sample HLS stream for testing
      thumbnailUrl: `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80`,
      animatedThumbnailUrl: `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80`,
      iframeEmbedUrl: `https://www.youtube.com/embed/dQw4w9WgXcQ`,
      durationSeconds: 120,
      status: "ready",
    };
  }

  async getAssetStatus(providerUid: string): Promise<StorageAssetStatus> {
    return {
      providerUid,
      status: "ready",
      durationSeconds: 120,
      fileSizeBytes: 1024 * 1024 * 500, // 500 MB mock
      hlsManifestUrl: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`,
      thumbnailUrl: `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80`,
    };
  }

  async deleteAsset(providerUid: string): Promise<void> {
    this.mockAssets.delete(providerUid);
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}

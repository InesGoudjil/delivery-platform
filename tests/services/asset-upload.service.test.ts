import { describe, expect, it, vi } from "vitest";
import { AssetUploadService, UploadRejectedError } from "@/core/services/asset-upload.service";
import { CloudflareR2StorageProvider } from "@/core/providers/storage/cloudflare-r2.provider";
import type { StoredObjectInfo, StreamVideoInfo } from "@/core/providers/storage";
import type { Asset, AssetVersion } from "@/core/entities/asset";
import { MAX_UPLOAD_BYTES } from "@/lib/validations/upload";

const WS = "10000000-0000-4000-8000-00000000000a";
const OTHER_WS = "10000000-0000-4000-8000-00000000000b";
const DEL = "30000000-0000-4000-8000-00000000000a";
const DEL_2 = "30000000-0000-4000-8000-00000000000c";
const OTHER_DEL = "30000000-0000-4000-8000-00000000000b";
const ASSET = "40000000-0000-4000-8000-0000000000a1";
const SAME_WS_ASSET = "40000000-0000-4000-8000-0000000000a2";
const FOREIGN_ASSET = "40000000-0000-4000-8000-0000000000b1";
const NEW_ASSET = "40000000-0000-4000-8000-0000000000e1";
const VERSION = "50000000-0000-4000-8000-0000000000a1";
const NEW_VERSION = "50000000-0000-4000-8000-0000000000e1";
const UID = "0123456789abcdef0123456789abcdef";
const FOREIGN_UID = "fedcba9876543210fedcba9876543210";

const KEY = `private/workspaces/${WS}/deliveries/${DEL}/assets/${ASSET}/v1/1700000000000-cut.mp4`;
const FOREIGN_KEY = `private/workspaces/${OTHER_WS}/deliveries/${OTHER_DEL}/assets/${FOREIGN_ASSET}/v1/1-secret.mp4`;
const FOREIGN_IMAGE = `private/workspaces/${OTHER_WS}/deliveries/${OTHER_DEL}/assets/${FOREIGN_ASSET}/v1/1-still.jpg`;
const STREAM_MANIFEST = `https://videodelivery.net/${UID}/manifest/video.m3u8`;

function ascii(text: string): number[] {
  return Array.from(text, (c) => c.charCodeAt(0));
}
function padded(values: number[]): Uint8Array {
  const out = [...values];
  while (out.length < 64) out.push(0);
  return Uint8Array.from(out);
}
const MP4_START = padded([0, 0, 0, 0x20, ...ascii("ftypisom"), 0, 0, 2, 0, ...ascii("isomiso2avc1mp41")]);
const JPEG_START = padded([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...ascii("JFIF")]);
const HTML_START = padded(ascii("<!DOCTYPE html><html><script>fetch('/api/media/x')</script>"));
const SVG_START = padded(ascii('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'));

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: ASSET,
    workspaceId: WS,
    deliveryId: DEL,
    title: "Cut",
    type: "video",
    sortOrder: 0,
    isArchived: false,
    isApproved: false,
    isPortfolio: false,
    aspectRatio: "16:9",
    category: "film",
    viewsCount: 0,
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

function makeVersion(overrides: Partial<AssetVersion> = {}): AssetVersion {
  return {
    id: VERSION,
    assetId: ASSET,
    versionNumber: 1,
    label: "V1",
    rawFileUrl: KEY,
    hlsManifestUrl: null,
    thumbnailUrl: null,
    fileSizeBytes: 2048,
    durationSeconds: null,
    transcodingStatus: "pending",
    isActiveVersion: false,
    createdAt: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

interface Setup {
  asset?: Asset;
  versions?: AssetVersion[];
  head?: StoredObjectInfo | null;
  firstBytes?: Uint8Array;
  streamVideo?: StreamVideoInfo | null;
}

function setup(options: Setup = {}) {
  // Real key layout and signing, no network.
  const r2 = new CloudflareR2StorageProvider({
    publicBucket: "media-public",
    privateBucket: "media-private",
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "test-secret",
    endpoint: "https://account.r2.cloudflarestorage.com",
  });

  const storage = {
    providerName: "composite_cloudflare",
    createDirectUploadUrl: vi.fn((params: any) => r2.createDirectUploadUrl(params)),
    getPlaybackInfo: vi.fn(),
    getAssetStatus: vi.fn(),
    deleteAsset: vi.fn().mockResolvedValue(undefined),
    getSecurePlaybackUrl: vi.fn(async (key: string) => `https://account.r2.cloudflarestorage.com/media-private/${key}?X-Amz-Signature=x`),
    headObject: vi.fn(async () => (options.head === undefined ? { sizeBytes: 2048, contentType: "video/mp4" } : options.head)),
    readObjectStart: vi.fn(async () => options.firstBytes ?? MP4_START),
    getStreamVideo: vi.fn(
      async (_uid: string): Promise<StreamVideoInfo | null> => (options.streamVideo === undefined ? null : options.streamVideo)
    ),
    copyFromUrl: vi.fn(async (_sourceUrl: string, _metadata?: any) => ({ uid: UID, status: "queued" })),
    putObjectStream: vi.fn().mockResolvedValue(undefined),
  };

  const assets = new Map<string, Asset>([
    [ASSET, options.asset ?? makeAsset()],
    [SAME_WS_ASSET, makeAsset({ id: SAME_WS_ASSET })],
    [FOREIGN_ASSET, makeAsset({ id: FOREIGN_ASSET, workspaceId: OTHER_WS, deliveryId: OTHER_DEL })],
  ]);
  const versions = new Map<string, AssetVersion>((options.versions ?? [makeVersion()]).map((v) => [v.id, v]));

  const workspaceRepo = {
    findById: vi.fn(async (id: string) => (id === WS ? { id: WS, storageUsedBytes: 0 } : id === OTHER_WS ? { id: OTHER_WS } : null)),
    findBySlug: vi.fn(),
  };
  const deliveries: Record<string, { id: string; workspaceId: string }> = {
    [DEL]: { id: DEL, workspaceId: WS },
    [DEL_2]: { id: DEL_2, workspaceId: WS },
    [OTHER_DEL]: { id: OTHER_DEL, workspaceId: OTHER_WS },
  };
  const deliveryRepo = {
    findById: vi.fn(async (id: string) => deliveries[id] ?? null),
    findByShareToken: vi.fn(async () => deliveries[DEL]),
  };
  const assetRepo = {
    findById: vi.fn(async (id: string) => assets.get(id) ?? null),
    create: vi.fn(async (dto: any) =>
      makeAsset({ id: NEW_ASSET, ...dto, deliveryId: dto.deliveryId ?? null, isPortfolio: dto.deliveryId ? false : Boolean(dto.isPortfolio) })
    ),
    delete: vi.fn().mockResolvedValue(undefined),
    listByDeliveryId: vi.fn(async () => []),
    listUnassignedByWorkspaceId: vi.fn(async () => []),
  };
  const versionRepo = {
    findById: vi.fn(async (id: string) => versions.get(id) ?? null),
    listByAssetId: vi.fn(async () => []),
    create: vi.fn(async (dto: any) => makeVersion({ id: NEW_VERSION, ...dto })),
    update: vi.fn(async (id: string, data: Partial<AssetVersion>) => ({ ...(versions.get(id) ?? makeVersion({ id })), ...data })),
    setActiveVersion: vi.fn().mockResolvedValue(undefined),
    listByStreamUid: vi.fn(async () => Array.from(versions.values())),
  };
  const subscriptionService = {
    getEntitlements: vi.fn(async () => ({ limits: { storageBytesMax: 100 * 1024 ** 3, storageGbMax: 100 } })),
  };

  const service = new AssetUploadService(
    storage as any,
    workspaceRepo as any,
    deliveryRepo as any,
    assetRepo as any,
    versionRepo as any,
    {} as any,
    {} as any,
    undefined,
    subscriptionService as any
  );
  return { service, storage, assetRepo, versionRepo, deliveryRepo };
}

/** Every argument any storage call received, flattened to strings. */
function storageArguments(storage: Record<string, any>): string {
  return Object.values(storage)
    .filter((fn) => typeof fn === "function" && "mock" in fn)
    .flatMap((fn: any) => fn.mock.calls.flat())
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join("\n");
}

const deliveryUpload = {
  workspaceId: WS,
  projectId: DEL,
  title: "Cut",
  filename: "cut.mp4",
  fileSizeBytes: 2048,
  contentType: "video/mp4",
  assetType: "video" as const,
};

describe("AssetUploadService.requestAssetUpload", () => {
  it("decides where the file goes and records it on an inactive, pending version", async () => {
    const { service, storage, versionRepo, assetRepo } = setup();
    const result = await service.requestAssetUpload(deliveryUpload);

    expect(storage.createDirectUploadUrl.mock.calls[0][0]).toMatchObject({
      workspaceId: WS,
      deliveryId: DEL,
      assetId: NEW_ASSET,
      versionNumber: 1,
      isPublic: false,
      contentType: "video/mp4",
      fileSizeBytes: 2048,
    });
    expect(result.directUpload.providerUid).toMatch(
      new RegExp(`^private/workspaces/${WS}/deliveries/${DEL}/assets/${NEW_ASSET}/v1/\\d+-cut\\.mp4$`)
    );
    expect(new URL(result.directUpload.uploadUrl).searchParams.get("X-Amz-SignedHeaders")).toBe("content-length;content-type;host");
    expect(versionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: NEW_ASSET,
        rawFileUrl: result.directUpload.providerUid,
        fileSizeBytes: 2048,
        transcodingStatus: "pending",
        isActiveVersion: false,
      })
    );
    expect(assetRepo.create).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WS, deliveryId: DEL, isPortfolio: false }));
  });

  it("refuses a file id from another workspace", async () => {
    const { service, storage, versionRepo } = setup();
    await expect(service.requestAssetUpload({ ...deliveryUpload, projectId: "", assetId: FOREIGN_ASSET })).rejects.toThrow(
      "File not found in this workspace."
    );
    await expect(service.requestAssetUpload({ ...deliveryUpload, assetId: "../../x" })).rejects.toThrow("File not found");
    expect(storage.createDirectUploadUrl).not.toHaveBeenCalled();
    expect(versionRepo.create).not.toHaveBeenCalled();
  });

  it("refuses an unknown or foreign delivery instead of making the upload public", async () => {
    const { service, storage, assetRepo } = setup();
    for (const projectId of ["30000000-0000-4000-8000-0000000000ff", "del_1", "share-token-a", OTHER_DEL]) {
      await expect(service.requestAssetUpload({ ...deliveryUpload, projectId }), projectId).rejects.toThrow(
        "Delivery not found in this workspace."
      );
    }
    expect(assetRepo.create).not.toHaveBeenCalled();
    expect(storage.createDirectUploadUrl).not.toHaveBeenCalled();
  });

  it("ignores client fields that would set visibility, ids, versions or placement", async () => {
    const { service, storage, versionRepo } = setup();
    await service.requestAssetUpload({
      ...deliveryUpload,
      placement: "portfolio",
      isPublic: true,
      metadata: { isPublic: "true", assetId: FOREIGN_ASSET, versionNumber: "99", assetVersionId: "x", category: "branding" },
    } as any);

    const params = storage.createDirectUploadUrl.mock.calls[0][0];
    expect(params).toMatchObject({ isPublic: false, assetId: NEW_ASSET, versionNumber: 1, deliveryId: DEL });
    expect(params.placement).toBeUndefined();
    expect(params).not.toHaveProperty("metadata");
    expect(versionRepo.create.mock.calls[0][0].rawFileUrl).toMatch(/^private\//);
  });

  it("refuses disallowed file types and sizes before creating anything", async () => {
    const { service, assetRepo, storage } = setup();
    const attempts = [
      { filename: "logo.svg", assetType: "photo_gallery" as const, contentType: "image/svg+xml" },
      { filename: "page.html", assetType: "video" as const, contentType: "text/html" },
      { filename: "cut.mp4", assetType: "video" as const, contentType: "text/html" },
      { filename: "cut.mp4", assetType: "photo_gallery" as const, contentType: "video/mp4" },
    ];
    for (const attempt of attempts) {
      await expect(service.requestAssetUpload({ ...deliveryUpload, ...attempt }), attempt.filename).rejects.toThrow();
    }
    await expect(service.requestAssetUpload({ ...deliveryUpload, fileSizeBytes: MAX_UPLOAD_BYTES + 1 })).rejects.toThrow(
      "Files can be at most 5 GB."
    );
    expect(assetRepo.create).not.toHaveBeenCalled();
    expect(storage.createDirectUploadUrl).not.toHaveBeenCalled();
  });

  it("keeps a new version in its file's delivery and type", async () => {
    const { service, storage } = setup();
    await service.requestAssetUpload({ ...deliveryUpload, projectId: "", assetId: ASSET });
    expect(storage.createDirectUploadUrl.mock.calls[0][0]).toMatchObject({ deliveryId: DEL, isPublic: false, assetId: ASSET });

    await expect(service.requestAssetUpload({ ...deliveryUpload, projectId: DEL_2, assetId: ASSET })).rejects.toThrow(
      "different delivery"
    );
    await expect(
      service.requestAssetUpload({ ...deliveryUpload, assetId: ASSET, filename: "still.jpg", contentType: "image/jpeg", assetType: "photo_gallery" })
    ).rejects.toThrow("Videos must be");
  });

  it("refuses a new version for a file in Trash", async () => {
    const { service } = setup({ asset: makeAsset({ isArchived: true }) });
    await expect(service.requestAssetUpload({ ...deliveryUpload, assetId: ASSET })).rejects.toThrow("Trash");
  });

  it("makes only the portfolio upload flow a standalone portfolio piece", async () => {
    const outside = { ...deliveryUpload, projectId: "" };
    const cases: Array<[any, boolean]> = [
      [{ ...outside, placement: "portfolio" }, true],
      [{ ...outside, placement: "project" }, false],
      [{ ...outside, placement: "hero" }, false],
      [{ ...outside, placement: "cover", filename: "c.jpg", contentType: "image/jpeg", assetType: "photo_gallery" }, false],
      [outside, false],
      [{ ...deliveryUpload, placement: "portfolio" }, false],
    ];
    for (const [dto, expected] of cases) {
      const { service, assetRepo, versionRepo } = setup();
      await service.requestAssetUpload(dto);
      expect(assetRepo.create.mock.calls[0][0].isPortfolio, JSON.stringify(dto.placement)).toBe(expected);
      expect(versionRepo.create.mock.calls[0][0].rawFileUrl.includes("/portfolio/standalone/")).toBe(expected);
    }
  });

  it("removes the file it created when the upload can't be prepared", async () => {
    const { service, storage, assetRepo } = setup();
    storage.createDirectUploadUrl.mockRejectedValueOnce(new Error("R2 down"));
    await expect(service.requestAssetUpload(deliveryUpload)).rejects.toThrow("R2 down");
    expect(assetRepo.delete).toHaveBeenCalledWith(NEW_ASSET);

    storage.createDirectUploadUrl.mockRejectedValueOnce(new Error("R2 down"));
    await expect(service.requestAssetUpload({ ...deliveryUpload, assetId: ASSET })).rejects.toThrow("R2 down");
    expect(assetRepo.delete).not.toHaveBeenCalledWith(ASSET);
  });
});

describe("AssetUploadService.confirmUploadCompleted", () => {
  it("uses only the location stored at request time; a planted location is ignored", async () => {
    const { service, storage, versionRepo } = setup();
    const confirmed = await service.confirmUploadCompleted({
      assetVersionId: VERSION,
      providerUid: FOREIGN_KEY,
      fileSizeBytes: 1,
    } as any);

    expect(storage.headObject).toHaveBeenCalledWith(KEY);
    expect(storage.readObjectStart).toHaveBeenCalledWith(KEY, expect.any(Number));
    expect(storage.getSecurePlaybackUrl).toHaveBeenCalledWith(KEY, false, 86400);
    expect(storageArguments(storage)).not.toContain(OTHER_WS);

    expect(versionRepo.update).toHaveBeenCalledWith(VERSION, {
      hlsManifestUrl: STREAM_MANIFEST,
      thumbnailUrl: expect.stringContaining(`/${UID}/thumbnails/`),
      fileSizeBytes: 2048,
      durationSeconds: null,
      transcodingStatus: "processing",
    });
    expect(versionRepo.setActiveVersion).toHaveBeenCalledWith(ASSET, VERSION);
    expect(confirmed.isActiveVersion).toBe(true);
    expect(storage.copyFromUrl.mock.calls[0][1]).toMatchObject({
      creator: WS,
      meta: { workspaceId: WS, assetId: ASSET, assetVersionId: VERSION, r2Key: KEY },
    });
  });

  it("never touches a stored key outside the file's workspace", async () => {
    const { service, storage, versionRepo } = setup({ versions: [makeVersion({ rawFileUrl: FOREIGN_KEY })] });
    await expect(service.confirmUploadCompleted({ assetVersionId: VERSION })).rejects.toBeInstanceOf(UploadRejectedError);
    expect(storage.headObject).not.toHaveBeenCalled();
    expect(storage.getSecurePlaybackUrl).not.toHaveBeenCalled();
    expect(storage.copyFromUrl).not.toHaveBeenCalled();
    expect(storage.deleteAsset).not.toHaveBeenCalled();
    expect(versionRepo.update).toHaveBeenCalledWith(VERSION, { transcodingStatus: "failed" });
    expect(versionRepo.setActiveVersion).not.toHaveBeenCalled();
  });

  it("rejects an object whose size isn't the announced one, deletes it and marks the version failed", async () => {
    const { service, storage, versionRepo } = setup({ head: { sizeBytes: 4096, contentType: "video/mp4" } });
    await expect(service.confirmUploadCompleted({ assetVersionId: VERSION })).rejects.toThrow("isn't the size");
    expect(storage.deleteAsset).toHaveBeenCalledWith(KEY);
    expect(versionRepo.update).toHaveBeenCalledWith(VERSION, { transcodingStatus: "failed" });
    expect(versionRepo.setActiveVersion).not.toHaveBeenCalled();
  });

  it("rejects an object with the wrong content type", async () => {
    const { service, storage } = setup({ head: { sizeBytes: 2048, contentType: "text/html" } });
    await expect(service.confirmUploadCompleted({ assetVersionId: VERSION })).rejects.toThrow("wrong content type");
    expect(storage.deleteAsset).toHaveBeenCalledWith(KEY);
  });

  it("rejects HTML or SVG uploaded as a video or image", async () => {
    const video = setup({ firstBytes: HTML_START });
    await expect(video.service.confirmUploadCompleted({ assetVersionId: VERSION })).rejects.toThrow("isn't a valid video");
    expect(video.storage.deleteAsset).toHaveBeenCalledWith(KEY);
    expect(video.storage.copyFromUrl).not.toHaveBeenCalled();

    const photoKey = `private/workspaces/${WS}/deliveries/${DEL}/assets/${ASSET}/v1/1-still.png`;
    const photo = setup({
      asset: makeAsset({ type: "photo_gallery" }),
      versions: [makeVersion({ rawFileUrl: photoKey, thumbnailUrl: photoKey })],
      head: { sizeBytes: 2048, contentType: "image/png" },
      firstBytes: SVG_START,
    });
    await expect(photo.service.confirmUploadCompleted({ assetVersionId: VERSION })).rejects.toThrow("isn't a valid image");
    expect(photo.storage.deleteAsset).toHaveBeenCalledWith(photoKey);
  });

  it("confirms a real image as ready, using the image as its thumbnail", async () => {
    const photoKey = `private/workspaces/${WS}/deliveries/${DEL}/assets/${ASSET}/v1/1-still.jpg`;
    const { service, storage, versionRepo } = setup({
      asset: makeAsset({ type: "photo_gallery" }),
      versions: [makeVersion({ rawFileUrl: photoKey, thumbnailUrl: photoKey })],
      head: { sizeBytes: 2048, contentType: "image/jpeg" },
      firstBytes: JPEG_START,
    });
    await service.confirmUploadCompleted({ assetVersionId: VERSION });
    expect(versionRepo.update).toHaveBeenCalledWith(VERSION, expect.objectContaining({ thumbnailUrl: photoKey, transcodingStatus: "ready" }));
    expect(storage.copyFromUrl).not.toHaveBeenCalled();
  });

  it("keeps the version pending when the object hasn't arrived yet", async () => {
    const { service, storage, versionRepo } = setup({ head: null });
    const attempt = service.confirmUploadCompleted({ assetVersionId: VERSION });
    await expect(attempt).rejects.toThrow("wasn't found");
    await expect(attempt).rejects.not.toBeInstanceOf(UploadRejectedError);
    expect(versionRepo.update).not.toHaveBeenCalled();
    expect(storage.deleteAsset).not.toHaveBeenCalled();
  });

  it("is idempotent once confirmed, and refuses rejected uploads", async () => {
    const ready = setup({ versions: [makeVersion({ transcodingStatus: "ready", isActiveVersion: true })] });
    await expect(ready.service.confirmUploadCompleted({ assetVersionId: VERSION })).resolves.toMatchObject({ id: VERSION });
    expect(ready.storage.headObject).not.toHaveBeenCalled();

    const failed = setup({ versions: [makeVersion({ transcodingStatus: "failed" })] });
    await expect(failed.service.confirmUploadCompleted({ assetVersionId: VERSION })).rejects.toThrow("rejected");
  });

  it("refuses locations it can't verify", async () => {
    const { service, storage } = setup({ versions: [makeVersion({ rawFileUrl: "https://evil.example/cut.mp4" })] });
    await expect(service.confirmUploadCompleted({ assetVersionId: VERSION })).rejects.toBeInstanceOf(UploadRejectedError);
    expect(storage.deleteAsset).not.toHaveBeenCalled();
  });

  it("checks a direct Stream upload against the video created at request time", async () => {
    const streamVersion = makeVersion({ rawFileUrl: STREAM_MANIFEST, hlsManifestUrl: STREAM_MANIFEST });
    const foreign = setup({
      versions: [streamVersion],
      streamVideo: { uid: UID, creator: OTHER_WS, workspaceId: OTHER_WS, sizeBytes: 10, durationSeconds: 5, status: "ready" },
    });
    await expect(foreign.service.confirmUploadCompleted({ assetVersionId: VERSION })).rejects.toBeInstanceOf(UploadRejectedError);
    expect(foreign.storage.deleteAsset).not.toHaveBeenCalled();

    const own = setup({
      versions: [streamVersion],
      streamVideo: { uid: UID, creator: WS, workspaceId: WS, sizeBytes: 1000, durationSeconds: 42, status: "ready" },
    });
    await own.service.confirmUploadCompleted({ assetVersionId: VERSION });
    expect(own.storage.getStreamVideo).toHaveBeenCalledWith(UID);
    expect(own.versionRepo.update).toHaveBeenCalledWith(
      VERSION,
      expect.objectContaining({ fileSizeBytes: 1000, durationSeconds: 42, transcodingStatus: "ready" })
    );
    expect(own.versionRepo.setActiveVersion).toHaveBeenCalledWith(ASSET, VERSION);
  });
});

describe("AssetUploadService.deleteStoredFiles", () => {
  it("deletes only the file's own objects and its own workspace's Stream videos", async () => {
    const ownThumb = `private/workspaces/${WS}/deliveries/${DEL}/assets/${ASSET}/thumbnails/1-thumbnail.jpg`;
    const otherFilesImage = `https://pub.example.com/public/workspaces/${WS}/portfolio/stills/${SAME_WS_ASSET}/v1/1-x.jpg`;
    const versions = [
      makeVersion({ id: "v1", rawFileUrl: KEY, thumbnailUrl: otherFilesImage }),
      makeVersion({ id: "v2", rawFileUrl: FOREIGN_KEY, thumbnailUrl: `/api/media/${FOREIGN_IMAGE}` }),
      makeVersion({ id: "v3", rawFileUrl: KEY.replace("/v1/", "/v3/"), hlsManifestUrl: STREAM_MANIFEST, thumbnailUrl: ownThumb }),
      makeVersion({ id: "v4", rawFileUrl: `https://videodelivery.net/${FOREIGN_UID}/manifest/video.m3u8` }),
      makeVersion({ id: "v5", assetId: SAME_WS_ASSET, rawFileUrl: KEY.replace(ASSET, SAME_WS_ASSET) }),
    ];
    const { service, storage } = setup();
    storage.getStreamVideo.mockImplementation(async (uid: string) =>
      uid === UID
        ? { uid, creator: WS, workspaceId: WS, sizeBytes: 1, durationSeconds: 1, status: "ready" as const }
        : { uid, creator: OTHER_WS, workspaceId: OTHER_WS, sizeBytes: 1, durationSeconds: 1, status: "ready" as const }
    );

    const result = await service.deleteStoredFiles(makeAsset(), versions);

    const deletedTargets = storage.deleteAsset.mock.calls.map((call: any[]) => call[0]).sort();
    expect(deletedTargets).toEqual([KEY, KEY.replace("/v1/", "/v3/"), UID, ownThumb].sort());
    expect(storageArguments({ deleteAsset: storage.deleteAsset })).not.toContain(OTHER_WS);
    expect(result).toEqual({ deleted: 4, skipped: 4 });
  });
});

describe("AssetUploadService.setVersionThumbnail", () => {
  const ownImage = `private/workspaces/${WS}/deliveries/${DEL}/assets/${SAME_WS_ASSET}/v1/1-still.jpg`;

  it("refuses another workspace's files, foreign Stream videos and outside URLs, changing nothing", async () => {
    const { service, versionRepo } = setup();
    const siblings = [makeVersion({ hlsManifestUrl: STREAM_MANIFEST })];
    for (const value of [
      FOREIGN_IMAGE,
      `/api/media/${FOREIGN_IMAGE}`,
      `https://account.r2.cloudflarestorage.com/media-private/${FOREIGN_IMAGE}?X-Amz-Signature=x`,
      `https://videodelivery.net/${FOREIGN_UID}/thumbnails/thumbnail.jpg`,
      "https://example.com/cover.jpg",
      "javascript:alert(1)",
      "//evil.example/x.jpg",
    ]) {
      await expect(service.setVersionThumbnail(makeAsset(), makeVersion(), value, siblings), value).rejects.toThrow();
    }
    expect(versionRepo.update).not.toHaveBeenCalled();
  });

  it("accepts an image of the same workspace, or a frame of the file's own video", async () => {
    const { service, versionRepo } = setup();
    const siblings = [makeVersion({ hlsManifestUrl: STREAM_MANIFEST })];

    await service.setVersionThumbnail(makeAsset(), makeVersion(), `/api/media/${ownImage}`, siblings);
    expect(versionRepo.update).toHaveBeenLastCalledWith(VERSION, { thumbnailUrl: ownImage });

    await service.setVersionThumbnail(makeAsset(), makeVersion(), `https://videodelivery.net/${UID}/thumbnails/thumbnail.jpg?time=4s`, siblings);
    expect(versionRepo.update).toHaveBeenLastCalledWith(VERSION, { thumbnailUrl: expect.stringContaining(`/${UID}/thumbnails/`) });
  });

  it("keeps a portfolio file's thumbnail public, and ignores unchanged values and UI placeholders", async () => {
    const { service, versionRepo } = setup();
    const portfolioAsset = makeAsset({ deliveryId: null, isPortfolio: true });
    await expect(service.setVersionThumbnail(portfolioAsset, makeVersion(), ownImage, [])).rejects.toThrow("public image");

    const current = makeVersion({ thumbnailUrl: ownImage });
    expect(await service.setVersionThumbnail(makeAsset(), current, `/api/media/${ownImage}`, [])).toEqual({
      thumbnailUrl: ownImage,
      changed: false,
    });
    expect(await service.setVersionThumbnail(makeAsset(), current, "/images/hero.jpg", [])).toMatchObject({ changed: false });
    expect(versionRepo.update).not.toHaveBeenCalled();
  });

  it("stores a cropped image under the file's own prefix, and refuses SVG or non-image data", async () => {
    const { service, storage, versionRepo } = setup();
    const jpegDataUrl = `data:image/jpeg;base64,${Buffer.from(JPEG_START).toString("base64")}`;

    await service.setVersionThumbnail(makeAsset(), makeVersion(), jpegDataUrl, []);
    const [key, body, contentType] = storage.putObjectStream.mock.calls[0];
    expect(key).toMatch(new RegExp(`^private/workspaces/${WS}/deliveries/${DEL}/assets/${ASSET}/thumbnails/\\d+-thumbnail\\.jpg$`));
    expect(Buffer.from(body)).toEqual(Buffer.from(JPEG_START));
    expect(contentType).toBe("image/jpeg");
    expect(versionRepo.update).toHaveBeenLastCalledWith(VERSION, { thumbnailUrl: key });

    for (const dataUrl of [
      `data:image/svg+xml;base64,${Buffer.from(SVG_START).toString("base64")}`,
      `data:image/png;base64,${Buffer.from(HTML_START).toString("base64")}`,
      "data:text/html,<script>alert(1)</script>",
    ]) {
      await expect(service.setVersionThumbnail(makeAsset(), makeVersion(), dataUrl, []), dataUrl.slice(0, 20)).rejects.toThrow();
    }
    expect(storage.putObjectStream).toHaveBeenCalledTimes(1);
  });
});

describe("AssetUploadService.handleTranscodeWebhook", () => {
  const ready: StreamVideoInfo = { uid: UID, creator: WS, workspaceId: WS, sizeBytes: 10, durationSeconds: 61, status: "ready" };

  it("finds the version by the Stream UID stored on it, not by the payload's metadata", async () => {
    const confirmed = makeVersion({ transcodingStatus: "processing", isActiveVersion: true, hlsManifestUrl: STREAM_MANIFEST });
    const { service, versionRepo } = setup({ versions: [confirmed], streamVideo: ready });

    const result = await service.handleTranscodeWebhook({
      uid: UID,
      meta: { assetVersionId: NEW_VERSION, versionId: NEW_VERSION },
      readyToStream: true,
    });

    expect(result).toEqual({ updated: 1 });
    expect(versionRepo.listByStreamUid).toHaveBeenCalledWith(UID);
    expect(versionRepo.update).toHaveBeenCalledTimes(1);
    expect(versionRepo.update).toHaveBeenCalledWith(VERSION, {
      hlsManifestUrl: STREAM_MANIFEST,
      thumbnailUrl: expect.stringContaining(`/${UID}/thumbnails/`),
      durationSeconds: 61,
      transcodingStatus: "ready",
    });
  });

  it("leaves pending uploads to the confirm step, keeps picked thumbnails, and ignores other workspaces' videos", async () => {
    const pending = makeVersion({ hlsManifestUrl: STREAM_MANIFEST });
    const pendingSetup = setup({ versions: [pending], streamVideo: ready });
    expect(await pendingSetup.service.handleTranscodeWebhook({ uid: UID })).toEqual({ updated: 0 });

    const picked = makeVersion({
      transcodingStatus: "processing",
      hlsManifestUrl: STREAM_MANIFEST,
      thumbnailUrl: `private/workspaces/${WS}/deliveries/${DEL}/assets/${ASSET}/thumbnails/1-thumbnail.jpg`,
    });
    const pickedSetup = setup({ versions: [picked], streamVideo: ready });
    await pickedSetup.service.handleTranscodeWebhook({ uid: UID });
    expect(pickedSetup.versionRepo.update.mock.calls[0][1]).not.toHaveProperty("thumbnailUrl");

    const foreign = setup({ versions: [picked], streamVideo: { ...ready, creator: OTHER_WS, workspaceId: OTHER_WS } });
    expect(await foreign.service.handleTranscodeWebhook({ uid: UID })).toEqual({ updated: 0 });
  });

  it("ignores payloads without a valid Stream UID", async () => {
    const { service, versionRepo } = setup();
    for (const payload of [{ uid: "../../x" }, { uid: `${UID}/../x` }, {}, null]) {
      expect(await service.handleTranscodeWebhook(payload)).toEqual({ updated: 0 });
    }
    expect(versionRepo.listByStreamUid).not.toHaveBeenCalled();
  });
});

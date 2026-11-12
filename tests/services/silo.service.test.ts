import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SiloService,
  isSiloKeyInWorkspace,
  parseSiloArchiveKey,
  siloEmailOrigin,
} from "@/core/services/silo.service";
import {
  MockSiloGlacierProvider,
  SiloUnavailableError,
  type SiloArchiveObjectInfo,
} from "@/core/providers/storage/silo-glacier.provider";
import { env } from "@/lib/env";

const WS = "11111111-1111-4111-8111-111111111111";
const OTHER_WS = "22222222-2222-4222-8222-222222222222";
const DELIVERY = "33333333-3333-4333-8333-333333333333";
const OTHER_DELIVERY = "99999999-9999-4999-8999-999999999999";
const ASSET_A = "44444444-4444-4444-8444-444444444444";
const ASSET_B = "55555555-5555-4555-8555-555555555555";
const ASSET_C = "66666666-6666-4666-8666-666666666666";
const STREAM_UID = "0123456789abcdef0123456789abcdef";
const OTHER_STREAM_UID = "fedcba9876543210fedcba9876543210";

const KEY_A = `private/workspaces/${WS}/deliveries/${DELIVERY}/assets/${ASSET_A}/v1/master.mov`;
const KEY_FOREIGN = `private/workspaces/${OTHER_WS}/deliveries/${OTHER_DELIVERY}/assets/x/v1/their-master.mov`;

/** The in-memory mock, standing in for a real (configured) archive bucket. */
class TestSilo extends MockSiloGlacierProvider {
  isConfigured(): boolean {
    return true;
  }
}

async function readAll(body: any): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function setup(options: { streamOwner?: string | null } = {}) {
  const r2: Record<string, Buffer> = {
    [KEY_A]: Buffer.from("A-master-bytes"),
    [KEY_FOREIGN]: Buffer.from("someone else's master"),
  };
  const streamVideos: Record<string, { creator: string | null; workspaceId: string | null }> = {
    [STREAM_UID]: { creator: options.streamOwner === undefined ? WS : options.streamOwner, workspaceId: null },
    [OTHER_STREAM_UID]: { creator: OTHER_WS, workspaceId: OTHER_WS },
  };

  const activeStorage = {
    providerName: "fake",
    createDirectUploadUrl: vi.fn(),
    getPlaybackInfo: vi.fn(),
    getAssetStatus: vi.fn(),
    deleteAsset: vi.fn(async (uid: string) => {
      delete r2[uid];
      delete streamVideos[uid];
    }),
    getObjectStream: vi.fn(async (key: string) => {
      const buffer = r2[key];
      if (!buffer) throw new Error(`NoSuchKey ${key}`);
      return { stream: Readable.from(buffer), contentType: "video/quicktime", contentLength: buffer.length };
    }),
    putObjectStream: vi.fn(async (key: string, body: any) => {
      r2[key] = await readAll(body);
    }),
    getStreamVideo: vi.fn(async (uid: string) =>
      streamVideos[uid]
        ? { uid, ...streamVideos[uid], sizeBytes: null, durationSeconds: null, status: "ready" as const }
        : null
    ),
  };

  const deliveries = new Map<string, any>([
    [DELIVERY, { id: DELIVERY, workspaceId: WS, title: "Spot", status: "approved", siloStatus: null }],
  ]);
  const assets = new Map<string, any>([
    [ASSET_A, { id: ASSET_A, workspaceId: WS, deliveryId: DELIVERY, title: "Hero film", isArchived: false }],
    [ASSET_B, { id: ASSET_B, workspaceId: WS, deliveryId: DELIVERY, title: "Pointed elsewhere", isArchived: false }],
    [ASSET_C, { id: ASSET_C, workspaceId: WS, deliveryId: DELIVERY, title: "Stream only", isArchived: false }],
  ]);
  const versions = new Map<string, any>([
    [
      "ver_a1",
      {
        id: "ver_a1",
        assetId: ASSET_A,
        versionNumber: 1,
        rawFileUrl: KEY_A,
        hlsManifestUrl: `https://customer-abc.cloudflarestream.com/${STREAM_UID}/manifest/video.m3u8`,
        thumbnailUrl: `https://customer-abc.cloudflarestream.com/${STREAM_UID}/thumbnails/thumbnail.jpg`,
        fileSizeBytes: 14,
        siloArchiveKey: null,
      },
    ],
    // A member pointed this row at another workspace's object; it must not be copied or deleted.
    ["ver_b1", { id: "ver_b1", assetId: ASSET_B, versionNumber: 1, rawFileUrl: KEY_FOREIGN, fileSizeBytes: 21, siloArchiveKey: null }],
    // Stream-only video (no R2 original): nothing The Silo can archive.
    ["ver_c1", { id: "ver_c1", assetId: ASSET_C, versionNumber: 1, rawFileUrl: OTHER_STREAM_UID, hlsManifestUrl: OTHER_STREAM_UID, fileSizeBytes: 9, siloArchiveKey: null }],
  ]);

  const deliveryRepo = {
    findById: vi.fn(async (id: string) => deliveries.get(id) ?? null),
    update: vi.fn(async (id: string, data: any) => {
      const next = { ...deliveries.get(id), ...data };
      deliveries.set(id, next);
      return next;
    }),
  };
  const assetRepo = {
    listByDeliveryId: vi.fn(async (deliveryId: string) =>
      [...assets.values()].filter((a) => a.deliveryId === deliveryId && !a.isArchived)
    ),
    listByWorkspaceId: vi.fn(async (workspaceId: string, includeArchived?: boolean) =>
      [...assets.values()].filter((a) => a.workspaceId === workspaceId && (includeArchived || !a.isArchived))
    ),
    archive: vi.fn(async (id: string) => {
      assets.set(id, { ...assets.get(id), isArchived: true });
      return assets.get(id);
    }),
    restore: vi.fn(async (id: string) => {
      assets.set(id, { ...assets.get(id), isArchived: false });
      return assets.get(id);
    }),
  };
  const assetVersionRepo = {
    listByAssetId: vi.fn(async (assetId: string) => [...versions.values()].filter((v) => v.assetId === assetId)),
    update: vi.fn(async (id: string, data: any) => {
      versions.set(id, { ...versions.get(id), ...data });
      return versions.get(id);
    }),
  };
  const workspaceRepo = { incrementStorageUsed: vi.fn() };
  const subscriptionService = { isSiloArchiveAllowed: vi.fn().mockResolvedValue(true) };
  const notificationService = { notifySiloRestoreCompleted: vi.fn().mockResolvedValue({ success: true, logs: [] }) };
  const memberService = {
    listMembers: vi.fn().mockResolvedValue([
      { role: "owner", email: "owner@studio.test" },
      { role: "viewer", email: "viewer@studio.test" },
    ]),
  };

  const build = (silo: MockSiloGlacierProvider) =>
    new SiloService(
      silo,
      activeStorage as any,
      deliveryRepo as any,
      assetRepo as any,
      assetVersionRepo as any,
      workspaceRepo as any,
      subscriptionService as any,
      notificationService as any,
      memberService
    );

  return {
    r2,
    activeStorage,
    deliveries,
    assets,
    versions,
    deliveryRepo,
    assetRepo,
    assetVersionRepo,
    workspaceRepo,
    subscriptionService,
    notificationService,
    build,
  };
}

describe("core/services/SiloService", () => {
  const siloWasEnabled = env.isSiloEnabled;

  beforeEach(() => {
    env.isSiloEnabled = true;
  });

  afterEach(() => {
    env.isSiloEnabled = siloWasEnabled;
  });

  describe("kill switch", () => {
    it("refuses every operation while The Silo is switched off", async () => {
      env.isSiloEnabled = false;
      const ctx = setup();
      const service = ctx.build(new TestSilo());

      expect(service.isAvailable()).toBe(false);
      await expect(service.archiveDelivery(DELIVERY)).rejects.toBeInstanceOf(SiloUnavailableError);
      await expect(service.requestRestoreDelivery(DELIVERY)).rejects.toBeInstanceOf(SiloUnavailableError);
      await expect(service.checkAndFinalizeRestore(DELIVERY)).rejects.toBeInstanceOf(SiloUnavailableError);
      expect(ctx.deliveryRepo.findById).not.toHaveBeenCalled();
      expect(ctx.activeStorage.getObjectStream).not.toHaveBeenCalled();
      expect(ctx.activeStorage.deleteAsset).not.toHaveBeenCalled();
    });

    it("refuses to archive into a store that does not keep files (the in-memory mock)", async () => {
      const ctx = setup();
      const service = ctx.build(new MockSiloGlacierProvider());

      await expect(service.archiveDelivery(DELIVERY)).rejects.toBeInstanceOf(SiloUnavailableError);
      expect(ctx.activeStorage.deleteAsset).not.toHaveBeenCalled();
      expect(ctx.r2[KEY_A]).toBeDefined();
    });
  });

  describe("archiveDelivery", () => {
    it("moves only this workspace's R2 objects, confirms the copy, then deletes the original and the Stream copy", async () => {
      const ctx = setup();
      const silo = new TestSilo();
      const service = ctx.build(silo);

      const result = await service.archiveDelivery(DELIVERY, { userId: "user_1" });

      expect(result).toMatchObject({ success: true, versionsArchived: 1, versionsSkipped: 2, assetsArchived: 1 });
      expect(result.bytesArchived).toBe(14);

      const archivedA = ctx.versions.get("ver_a1");
      expect(archivedA.siloArchiveKey).toMatch(
        new RegExp(`^silo/workspaces/${WS}/deliveries/${DELIVERY}/assets/${ASSET_A}/v1/\\d+-master\\.mov$`)
      );
      expect(archivedA.rawFileUrl).toBe(`silo://${archivedA.siloArchiveKey}`);
      expect(await silo.getArchiveObjectInfo(archivedA.siloArchiveKey)).toEqual({ sizeBytes: 14, storageClass: "DEEP_ARCHIVE" });

      // R2 original and Stream copy of A are gone; the Stream columns no longer point at it.
      expect(ctx.r2[KEY_A]).toBeUndefined();
      expect(ctx.activeStorage.deleteAsset).toHaveBeenCalledWith(KEY_A);
      expect(ctx.activeStorage.deleteAsset).toHaveBeenCalledWith(STREAM_UID);
      expect(archivedA.hlsManifestUrl).toBeNull();
      expect(archivedA.thumbnailUrl).toBeNull();

      // The version row pointed at Glacier before the original was deleted.
      const firstVersionWrite = ctx.assetVersionRepo.update.mock.invocationCallOrder[0];
      const firstDelete = ctx.activeStorage.deleteAsset.mock.invocationCallOrder[0];
      expect(firstVersionWrite).toBeLessThan(firstDelete);

      // Another workspace's key and the Stream-only video are left alone.
      expect(ctx.activeStorage.getObjectStream).not.toHaveBeenCalledWith(KEY_FOREIGN);
      expect(ctx.activeStorage.deleteAsset).not.toHaveBeenCalledWith(KEY_FOREIGN);
      expect(ctx.activeStorage.deleteAsset).not.toHaveBeenCalledWith(OTHER_STREAM_UID);
      expect(ctx.r2[KEY_FOREIGN]).toBeDefined();
      expect(ctx.versions.get("ver_b1").rawFileUrl).toBe(KEY_FOREIGN);
      expect(ctx.versions.get("ver_c1").rawFileUrl).toBe(OTHER_STREAM_UID);

      // Only the fully archived file goes to Trash.
      expect(ctx.assetRepo.archive).toHaveBeenCalledTimes(1);
      expect(ctx.assetRepo.archive).toHaveBeenCalledWith(ASSET_A);

      // The database keeps storage_used_bytes; the service never writes it.
      expect(ctx.workspaceRepo.incrementStorageUsed).not.toHaveBeenCalled();

      expect(ctx.deliveries.get(DELIVERY)).toMatchObject({
        status: "archived",
        siloStatus: "archived",
        siloMetadata: expect.objectContaining({ versionsArchived: 1, versionsSkipped: 2, archivedByUserId: "user_1" }),
      });
    });

    it("keeps the original and stops when the Glacier copy cannot be confirmed", async () => {
      const ctx = setup();
      class ShortUpload extends TestSilo {
        async getArchiveObjectInfo(key: string): Promise<SiloArchiveObjectInfo | null> {
          const info = await super.getArchiveObjectInfo(key);
          return info ? { ...info, sizeBytes: info.sizeBytes - 1 } : null;
        }
      }
      const silo = new ShortUpload();
      const deleteArchive = vi.spyOn(silo, "deleteArchiveObject");
      const service = ctx.build(silo);

      await expect(service.archiveDelivery(DELIVERY)).rejects.toThrow(/could not be confirmed/);

      expect(ctx.r2[KEY_A]).toBeDefined();
      expect(ctx.activeStorage.deleteAsset).not.toHaveBeenCalled();
      expect(ctx.versions.get("ver_a1").rawFileUrl).toBe(KEY_A);
      expect(ctx.versions.get("ver_a1").siloArchiveKey).toBeNull();
      expect(deleteArchive).toHaveBeenCalledTimes(1);
      expect(ctx.deliveryRepo.update).not.toHaveBeenCalled();
      expect(ctx.assetRepo.archive).not.toHaveBeenCalled();
    });

    it("does not delete a Stream video that was not created for this workspace", async () => {
      const ctx = setup({ streamOwner: OTHER_WS });
      const service = ctx.build(new TestSilo());

      const result = await service.archiveDelivery(DELIVERY);

      expect(result.streamDeletesFailed).toBe(1);
      expect(ctx.activeStorage.deleteAsset).toHaveBeenCalledWith(KEY_A);
      expect(ctx.activeStorage.deleteAsset).not.toHaveBeenCalledWith(STREAM_UID);
      expect(ctx.versions.get("ver_a1").hlsManifestUrl).toContain(STREAM_UID);
    });

    it("changes nothing when none of the files can be archived", async () => {
      const ctx = setup();
      ctx.assets.delete(ASSET_A);
      const service = ctx.build(new TestSilo());

      await expect(service.archiveDelivery(DELIVERY)).rejects.toThrow(/nothing was changed/);
      expect(ctx.deliveryRepo.update).not.toHaveBeenCalled();
      expect(ctx.activeStorage.deleteAsset).not.toHaveBeenCalled();
    });

    it("refuses when the workspace plan does not include The Silo", async () => {
      const ctx = setup();
      ctx.subscriptionService.isSiloArchiveAllowed.mockResolvedValue(false);
      const service = ctx.build(new TestSilo());

      await expect(service.archiveDelivery(DELIVERY)).rejects.toThrow(/requires a Pro, Studio, or Enterprise/);
      expect(ctx.activeStorage.getObjectStream).not.toHaveBeenCalled();
    });
  });

  describe("restore", () => {
    it("finds the archived files in Trash, restores only keys under this workspace, and finalizes once thawed", async () => {
      const ctx = setup();
      const silo = new TestSilo();
      const service = ctx.build(silo);
      await service.archiveDelivery(DELIVERY);
      const archiveKey = ctx.versions.get("ver_a1").siloArchiveKey as string;

      // A member pointed a trashed file of this delivery at another workspace's Glacier object.
      const foreignArchiveKey = `silo/workspaces/${OTHER_WS}/deliveries/${OTHER_DELIVERY}/assets/x/v1/1-their.mov`;
      ctx.assets.set("asset_d", { id: "asset_d", workspaceId: WS, deliveryId: DELIVERY, title: "D", isArchived: true });
      ctx.versions.set("ver_d1", {
        id: "ver_d1",
        assetId: "asset_d",
        versionNumber: 1,
        rawFileUrl: `silo://${foreignArchiveKey}`,
        siloArchiveKey: foreignArchiveKey,
        fileSizeBytes: 5,
      });

      // Before a restore is requested nothing is copied back.
      expect(await service.checkAndFinalizeRestore(DELIVERY)).toMatchObject({ isReady: false, status: "archived" });
      expect(ctx.activeStorage.putObjectStream).not.toHaveBeenCalled();

      const requestRestore = vi.spyOn(silo, "requestRestore");
      const restore = await service.requestRestoreDelivery(DELIVERY, "Standard", 7);
      expect(restore).toMatchObject({ success: true, status: "restoring", tier: "Standard", estimatedHours: 12 });
      expect(requestRestore).toHaveBeenCalledTimes(1);
      expect(requestRestore).toHaveBeenCalledWith({ key: archiveKey, tier: "Standard", days: 7 });
      expect(ctx.deliveries.get(DELIVERY)).toMatchObject({ siloStatus: "restoring", siloRestoreTier: "Standard" });

      // The mock thaws instantly, so the next check copies the file back.
      const check = await service.checkAndFinalizeRestore(DELIVERY);
      expect(check).toMatchObject({ isReady: true, status: "ready", thawedVersionsCount: 1, totalVersionsCount: 1 });

      const restoredKey = ctx.versions.get("ver_a1").rawFileUrl as string;
      expect(restoredKey.startsWith(`private/workspaces/${WS}/deliveries/${DELIVERY}/assets/${ASSET_A}/v1/`)).toBe(true);
      expect(ctx.r2[restoredKey]?.toString()).toBe("A-master-bytes");
      expect(ctx.assets.get(ASSET_A).isArchived).toBe(false);
      expect(ctx.assets.get("asset_d").isArchived).toBe(true);
      expect(ctx.versions.get("ver_d1").rawFileUrl).toBe(`silo://${foreignArchiveKey}`);
      expect(ctx.deliveries.get(DELIVERY)).toMatchObject({ status: "approved", siloStatus: "restored" });
      expect(ctx.workspaceRepo.incrementStorageUsed).not.toHaveBeenCalled();

      // Email links use the configured app URL, and go to owners/admins only.
      expect(ctx.notificationService.notifySiloRestoreCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: DELIVERY,
          recipientEmails: ["owner@studio.test"],
          origin: new URL(env.NEXT_PUBLIC_APP_URL).origin,
        })
      );

      // Checking again is a no-op.
      expect(await service.checkAndFinalizeRestore(DELIVERY)).toMatchObject({ isReady: true, status: "ready" });
      expect(ctx.activeStorage.putObjectStream).toHaveBeenCalledTimes(1);
    });

    it("refuses to restore a delivery that is not in The Silo, and the Expedited tier", async () => {
      const ctx = setup();
      const service = ctx.build(new TestSilo());

      await expect(service.requestRestoreDelivery(DELIVERY)).rejects.toThrow(/not archived in The Silo/);
      await expect(service.requestRestoreDelivery(DELIVERY, "Expedited" as any)).rejects.toThrow(/Bulk or Standard/);
    });
  });

  describe("archive keys", () => {
    it("accepts keys under a workspace's Silo prefix and rejects anything else", () => {
      const key = `silo/workspaces/${WS}/deliveries/${DELIVERY}/assets/${ASSET_A}/v1/1-master.mov`;
      expect(parseSiloArchiveKey(key)).toEqual({ key, workspaceId: WS, deliveryId: DELIVERY });
      expect(parseSiloArchiveKey(`silo://${key}`)?.key).toBe(key);
      expect(isSiloKeyInWorkspace(key, WS)).toBe(true);
      expect(isSiloKeyInWorkspace(key, OTHER_WS)).toBe(false);

      expect(parseSiloArchiveKey(`silo/workspaces/${WS}/deliveries/${DELIVERY}/../../${OTHER_WS}/x`)).toBeNull();
      expect(parseSiloArchiveKey(`silo/workspaces/${WS}//deliveries/${DELIVERY}/x`)).toBeNull();
      expect(parseSiloArchiveKey(`private/workspaces/${WS}/deliveries/${DELIVERY}/x`)).toBeNull();
      expect(parseSiloArchiveKey(`silo/workspaces/not-a-uuid/deliveries/${DELIVERY}/x`)).toBeNull();
      expect(parseSiloArchiveKey(null)).toBeNull();
    });

    it("builds email links from the configured app URL", () => {
      expect(siloEmailOrigin()).toBe(new URL(env.NEXT_PUBLIC_APP_URL).origin);
    });
  });
});

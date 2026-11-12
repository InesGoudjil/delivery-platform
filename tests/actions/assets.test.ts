import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deleteAssetAction,
  restoreAssetAction,
  permanentDeleteAssetAction,
  listTrashAssetsAction,
  emptyTrashAction,
  updateAssetAction,
  setActiveVersionAction,
} from "@/app/actions/assets";
import { deleteDeliveryAction } from "@/app/actions/deliveries";
import * as guards from "@/core/security/guards";
import * as serverModule from "@/core/server";
import { AssetUploadService } from "@/core/services/asset-upload.service";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("app/actions/assets", () => {
  const mockAsset = {
    id: "asset_123",
    workspaceId: "ws_test",
    deliveryId: "del_123",
    title: "Cut Scene 1",
    type: "video",
    updatedAt: new Date().toISOString(),
  };

  let mockServices: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockServices = {
      asset: {
        getAssetById: vi.fn().mockResolvedValue(mockAsset),
        archiveAsset: vi.fn().mockResolvedValue(undefined),
        restoreAsset: vi.fn().mockResolvedValue(undefined),
        deleteAsset: vi.fn().mockResolvedValue(undefined),
        listVersions: vi.fn().mockResolvedValue([
          {
            id: "ver_1",
            fileSizeBytes: 1024 * 1024 * 5, // 5MB
            rawFileUrl: "https://storage.cut.com/raw.mp4",
            hlsManifestUrl: "https://storage.cut.com/hls.m3u8",
            thumbnailUrl: "https://storage.cut.com/thumb.jpg",
          },
        ]),
        listTrashAssets: vi.fn().mockResolvedValue([mockAsset]),
        getActiveVersion: vi.fn().mockResolvedValue({
          id: "ver_1",
          rawFileUrl: "https://storage.cut.com/raw.mp4",
          thumbnailUrl: "https://storage.cut.com/thumb.jpg",
          fileSizeBytes: 1024 * 1024 * 5,
        }),
        updateAsset: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...mockAsset, ...data })),
        updateThumbnail: vi.fn().mockResolvedValue(undefined),
        renameVersion: vi.fn().mockResolvedValue(undefined),
        setActiveVersion: vi.fn().mockResolvedValue(undefined),
        listDeliveryAssets: vi.fn().mockResolvedValue([mockAsset]),
        detachAllFromDelivery: vi.fn().mockResolvedValue(undefined),
      },
      portfolio: {
        getPortfolioById: vi.fn().mockResolvedValue({
          id: "port_123",
          appearance: { featuredItemIds: ["asset_123", "other_asset"] },
        }),
        getPortfolioByWorkspace: vi.fn().mockResolvedValue({
          id: "port_123",
          appearance: { featuredItemIds: ["asset_123"] },
        }),
        updatePortfolio: vi.fn().mockResolvedValue(undefined),
      },
      workspace: {
        getWorkspaceById: vi.fn().mockResolvedValue({
          id: "ws_test",
          storageUsedBytes: 1024 * 1024 * 50,
        }),
        updateWorkspace: vi.fn().mockResolvedValue(undefined),
      },
      project: {
        detachAssetFromProject: vi.fn().mockResolvedValue(undefined),
        getProjectById: vi.fn().mockResolvedValue(null),
        updateProject: vi.fn().mockResolvedValue(undefined),
      },
      delivery: {
        getDeliveryById: vi.fn().mockResolvedValue({
          id: "del_123",
          workspaceId: "ws_test",
          shareToken: "token_123",
        }),
        updateDelivery: vi.fn().mockResolvedValue({ id: "del_123", title: "Updated" }),
        deleteDelivery: vi.fn().mockResolvedValue(undefined),
      },
      auth: {
        getCurrentUser: vi.fn().mockResolvedValue({ id: "user_test", email: "test@example.com" }),
      },
      storage: {
        deleteAsset: vi.fn().mockResolvedValue(undefined),
      },
    };

    vi.spyOn(serverModule, "getServerServices").mockResolvedValue(mockServices);
    vi.spyOn(guards, "requireWorkspaceMember").mockResolvedValue({
      workspace: { id: "ws_test" },
      role: "editor",
    } as any);
  });

  describe("deleteAssetAction (archive)", () => {
    it("returns error when assetId is empty", async () => {
      const result = await deleteAssetAction("   ");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Asset ID is required");
    });

    it("archives asset and unpins from portfolio", async () => {
      const result = await deleteAssetAction("asset_123", { portfolioId: "port_123" });
      expect(result.success).toBe(true);
      expect(mockServices.asset.archiveAsset).toHaveBeenCalledWith("asset_123");
      expect(mockServices.portfolio.updatePortfolio).toHaveBeenCalledWith(
        "port_123",
        expect.objectContaining({
          appearance: expect.objectContaining({
            featuredItemIds: ["other_asset"],
          }),
        })
      );
    });
  });

  describe("restoreAssetAction", () => {
    it("restores an archived asset", async () => {
      const result = await restoreAssetAction("asset_123");
      expect(result.success).toBe(true);
      expect(mockServices.asset.restoreAsset).toHaveBeenCalledWith("asset_123");
    });
  });

  describe("permanentDeleteAssetAction", () => {
    // Real ids: stored keys are checked against the file's workspace id.
    const WS = "10000000-0000-4000-8000-00000000000a";
    const OTHER_WS = "10000000-0000-4000-8000-00000000000b";
    const ASSET_ID = "40000000-0000-4000-8000-0000000000a1";
    const ownKey = `private/workspaces/${WS}/deliveries/30000000-0000-4000-8000-00000000000a/assets/${ASSET_ID}/v1/1-cut.mp4`;
    const foreignKey = `private/workspaces/${OTHER_WS}/deliveries/30000000-0000-4000-8000-00000000000b/assets/x/v1/1-secret.jpg`;
    const order: string[] = [];

    beforeEach(() => {
      order.length = 0;
      mockServices.asset.getAssetById.mockResolvedValue({ ...mockAsset, id: ASSET_ID, workspaceId: WS });
      mockServices.asset.listVersions.mockResolvedValue([
        { id: "ver_1", assetId: ASSET_ID, rawFileUrl: ownKey, hlsManifestUrl: null, thumbnailUrl: foreignKey, fileSizeBytes: 5 },
      ]);
      mockServices.asset.deleteAsset.mockImplementation(async () => {
        order.push("database");
      });
      mockServices.storage.deleteAsset.mockImplementation(async (target: string) => {
        order.push(`storage:${target}`);
      });
      const none = {} as any;
      mockServices.upload = new AssetUploadService(mockServices.storage, none, none, none, none, none, none);
    });

    it("deletes the database rows first, then only the file's own stored files", async () => {
      const result = await permanentDeleteAssetAction(ASSET_ID);
      expect(result.success).toBe(true);
      expect(guards.requireWorkspaceMember).toHaveBeenCalledWith(WS, "admin");
      expect(order).toEqual(["database", `storage:${ownKey}`]);
      // The storage counter is maintained by database triggers, not by the app.
      expect(mockServices.workspace.updateWorkspace).not.toHaveBeenCalled();
    });

    it("touches no stored file when the database refuses the delete", async () => {
      mockServices.asset.deleteAsset.mockRejectedValue(new Error("File not found, or you can't delete it (admins only)."));
      const result = await permanentDeleteAssetAction(ASSET_ID);
      expect(result.success).toBe(false);
      expect(mockServices.storage.deleteAsset).not.toHaveBeenCalled();
    });
  });

  describe("listTrashAssetsAction & emptyTrashAction", () => {
    it("lists trash assets with enriched metadata and days remaining", async () => {
      const result = await listTrashAssetsAction("ws_test");
      expect(result.success).toBe(true);
      expect(result.assets).toHaveLength(1);
      expect(result.assets[0].daysRemaining).toBeLessThanOrEqual(30);
    });

    it("empties trash by calling permanent delete for each asset", async () => {
      mockServices.upload = { deleteStoredFiles: vi.fn().mockResolvedValue({ deleted: 0, skipped: 0 }) };
      const result = await emptyTrashAction("ws_test");
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(mockServices.asset.deleteAsset).toHaveBeenCalledWith("asset_123");
      expect(mockServices.upload.deleteStoredFiles).toHaveBeenCalledWith(
        expect.objectContaining({ id: "asset_123", workspaceId: "ws_test" }),
        expect.any(Array)
      );
    });

    it("reports the files it couldn't delete, and skips files of other workspaces", async () => {
      mockServices.upload = { deleteStoredFiles: vi.fn() };
      mockServices.asset.listTrashAssets.mockResolvedValue([
        mockAsset,
        { ...mockAsset, id: "asset_other_ws", workspaceId: "ws_other" },
      ]);
      mockServices.asset.deleteAsset.mockRejectedValue(new Error("File not found, or you can't delete it (admins only)."));

      const result = await emptyTrashAction("ws_test");
      expect(result).toMatchObject({ success: false, count: 0 });
      expect(mockServices.asset.deleteAsset).toHaveBeenCalledTimes(1);
      expect(mockServices.asset.deleteAsset).not.toHaveBeenCalledWith("asset_other_ws");
      expect(mockServices.upload.deleteStoredFiles).not.toHaveBeenCalled();
    });
  });

  describe("updateAssetAction", () => {
    const WS = "10000000-0000-4000-8000-00000000000a";
    const ASSET_ID = "40000000-0000-4000-8000-0000000000a1";
    const DELIVERY = "30000000-0000-4000-8000-00000000000a";
    const sameWorkspaceImage = `private/workspaces/${WS}/deliveries/${DELIVERY}/assets/40000000-0000-4000-8000-0000000000a2/v1/1-still.jpg`;
    const foreignImage = `private/workspaces/10000000-0000-4000-8000-00000000000b/deliveries/x/assets/y/v1/1-secret.jpg`;
    let adminVersionRepo: { update: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      const asset = { ...mockAsset, id: ASSET_ID, workspaceId: WS, deliveryId: DELIVERY };
      const version = { id: "ver_1", assetId: ASSET_ID, rawFileUrl: "", thumbnailUrl: null, fileSizeBytes: 5 };
      mockServices.asset.getAssetById.mockResolvedValue(asset);
      mockServices.asset.getActiveVersion.mockResolvedValue(version);
      mockServices.asset.listVersions.mockResolvedValue([version]);
      adminVersionRepo = { update: vi.fn(async (id: string, data: any) => ({ ...version, ...data })) };
      const none = {} as any;
      vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue({
        upload: new AssetUploadService(mockServices.storage, none, none, none, adminVersionRepo as any, none, none),
      } as any);
    });

    it("updates asset metadata, and the server stores a thumbnail from the asset's own workspace", async () => {
      const result = await updateAssetAction(ASSET_ID, {
        title: "New Cut Title",
        aspectRatio: "16:9",
        thumbnailUrl: `/api/media/${sameWorkspaceImage}`,
      });

      expect(result.success).toBe(true);
      expect(mockServices.asset.updateAsset).toHaveBeenCalledWith(
        ASSET_ID,
        expect.objectContaining({
          title: "New Cut Title",
          aspectRatio: "16:9",
        })
      );
      expect(adminVersionRepo.update).toHaveBeenCalledWith("ver_1", { thumbnailUrl: sameWorkspaceImage });
      // Not through the caller's own connection: API users can't write file-location columns.
      expect(mockServices.asset.updateThumbnail).not.toHaveBeenCalled();
    });

    it("refuses a thumbnail from another workspace or outside storage, and changes nothing", async () => {
      for (const thumbnailUrl of [foreignImage, `/api/media/${foreignImage}`, "https://storage.cut.com/new-thumb.jpg"]) {
        const result = await updateAssetAction(ASSET_ID, { title: "Renamed", thumbnailUrl });
        expect(result.success, thumbnailUrl).toBe(false);
      }
      expect(adminVersionRepo.update).not.toHaveBeenCalled();
      expect(mockServices.asset.updateAsset).not.toHaveBeenCalled();
    });
  });

  describe("setActiveVersionAction", () => {
    it("sets the active version for an asset", async () => {
      const result = await setActiveVersionAction("asset_123", "ver_2", {
        deliveryId: "del_123",
      });
      expect(result.success).toBe(true);
      expect(mockServices.asset.setActiveVersion).toHaveBeenCalledWith("asset_123", "ver_2");
    });
  });

  describe("deleteDeliveryAction", () => {
    it("moves the delivery's files to Trash, then deletes the delivery (admins only)", async () => {
      const access = vi.spyOn(guards, "requireDeliveryAccess").mockResolvedValue({
        services: mockServices,
        delivery: { id: "del_123", workspaceId: "ws_test" },
        workspace: { id: "ws_test" },
        role: "admin",
        user: { id: "user_test" },
      } as any);

      const result = await deleteDeliveryAction("del_123", "ws-test");
      expect(result.success).toBe(true);
      expect(access).toHaveBeenCalledWith("del_123", "admin");
      expect(mockServices.asset.detachAllFromDelivery).toHaveBeenCalledWith("del_123");
      expect(mockServices.delivery.deleteDelivery).toHaveBeenCalledWith("del_123");
    });

    it("touches nothing when the caller isn't an admin", async () => {
      vi.spyOn(guards, "requireDeliveryAccess").mockRejectedValue(
        new Error('Forbidden: Requires at least "admin" role permissions.')
      );

      const result = await deleteDeliveryAction("del_123", "ws-test");
      expect(result.success).toBe(false);
      expect(mockServices.asset.detachAllFromDelivery).not.toHaveBeenCalled();
      expect(mockServices.delivery.deleteDelivery).not.toHaveBeenCalled();
    });
  });
});

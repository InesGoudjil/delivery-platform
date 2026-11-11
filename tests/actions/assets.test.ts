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
    it("purges storage files, updates workspace storage, and deletes asset", async () => {
      const result = await permanentDeleteAssetAction("asset_123");
      expect(result.success).toBe(true);
      expect(guards.requireWorkspaceMember).toHaveBeenCalledWith("ws_test", "admin");
      expect(mockServices.storage.deleteAsset).toHaveBeenCalled();
      expect(mockServices.workspace.updateWorkspace).toHaveBeenCalledWith(
        "ws_test",
        expect.objectContaining({
          storageUsedBytes: 1024 * 1024 * 45, // 50MB - 5MB
        })
      );
      expect(mockServices.asset.deleteAsset).toHaveBeenCalledWith("asset_123");
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
      const result = await emptyTrashAction("ws_test");
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(mockServices.asset.deleteAsset).toHaveBeenCalledWith("asset_123");
    });
  });

  describe("updateAssetAction", () => {
    it("updates asset metadata and active version thumbnail", async () => {
      const result = await updateAssetAction("asset_123", {
        title: "New Cut Title",
        aspectRatio: "16:9",
        thumbnailUrl: "https://storage.cut.com/new-thumb.jpg",
      });

      expect(result.success).toBe(true);
      expect(mockServices.asset.updateAsset).toHaveBeenCalledWith(
        "asset_123",
        expect.objectContaining({
          title: "New Cut Title",
          aspectRatio: "16:9",
        })
      );
      expect(mockServices.asset.updateThumbnail).toHaveBeenCalledWith(
        "ver_1",
        "https://storage.cut.com/new-thumb.jpg"
      );
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
    it("deletes all delivery assets and then the delivery", async () => {
      const result = await deleteDeliveryAction("del_123", "ws-test");
      expect(result.success).toBe(true);
      expect(mockServices.asset.listDeliveryAssets).toHaveBeenCalledWith("del_123");
      expect(mockServices.asset.archiveAsset).toHaveBeenCalledWith("asset_123");
      expect(mockServices.asset.detachAllFromDelivery).toHaveBeenCalledWith("del_123");
      expect(mockServices.delivery.deleteDelivery).toHaveBeenCalledWith("del_123");
    });
  });
});

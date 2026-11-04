import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectService } from "@/core/services/project.service";
import type { IProjectRepository } from "@/core/repositories/i-project-repository";
import type { IAssetRepository, IAssetVersionRepository } from "@/core/repositories/i-asset-repository";
import type { SubscriptionService } from "@/core/services/subscription.service";

describe("core/services/ProjectService", () => {
  let projectRepo: Partial<IProjectRepository>;
  let assetRepo: Partial<IAssetRepository>;
  let assetVersionRepo: Partial<IAssetVersionRepository>;
  let subscriptionService: Partial<SubscriptionService>;
  let service: ProjectService;

  const mockProject = {
    id: "proj_123",
    workspaceId: "ws_1",
    portfolioId: "port_1",
    title: "Brand Film",
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    projectRepo = {
      listByPortfolioId: vi.fn().mockResolvedValue([mockProject]),
      create: vi.fn().mockImplementation((dto) => Promise.resolve({ id: "proj_new", ...dto })),
      findById: vi.fn().mockResolvedValue(mockProject),
      getProjectAssetIds: vi.fn().mockResolvedValue(["asset_1"]),
      delete: vi.fn().mockResolvedValue(undefined),
      attachAsset: vi.fn().mockResolvedValue(undefined),
      detachAsset: vi.fn().mockResolvedValue(undefined),
    };

    assetRepo = {
      listByIds: vi.fn().mockResolvedValue([
        { id: "asset_1", workspaceId: "ws_1", title: "Hero Video", type: "video" },
      ]),
    };

    assetVersionRepo = {
      findActiveVersion: vi.fn().mockResolvedValue({
        id: "ver_1",
        assetId: "asset_1",
        versionNumber: 1,
        status: "ready",
      }),
    };

    subscriptionService = {
      canAddPortfolioVideo: vi.fn().mockResolvedValue({ allowed: true }),
    };

    service = new ProjectService(
      projectRepo as IProjectRepository,
      assetRepo as IAssetRepository,
      assetVersionRepo as IAssetVersionRepository,
      subscriptionService as SubscriptionService
    );
  });

  describe("createProject", () => {
    it("creates a project when within subscription plan limits", async () => {
      const result = await service.createProject({
        workspaceId: "ws_1",
        portfolioId: "port_1",
        title: "Nike Commercial",
      });

      expect(result.id).toBe("proj_new");
      expect(result.title).toBe("Nike Commercial");
      expect(projectRepo.create).toHaveBeenCalledOnce();
    });

    it("throws an error when portfolio showcase film limit is exceeded", async () => {
      vi.mocked(subscriptionService.canAddPortfolioVideo!).mockResolvedValue({
        allowed: false,
        currentCount: 5,
        maxAllowed: 5,
        reason: "Portfolio showcase film limit reached. Please upgrade your subscription plan.",
      });

      await expect(
        service.createProject({
          workspaceId: "ws_1",
          portfolioId: "port_1",
          title: "Nike Commercial",
        })
      ).rejects.toThrow("Portfolio showcase film limit reached");

      expect(projectRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("getProjectWithAssets", () => {
    it("enriches project assets with their corresponding active version", async () => {
      const enriched = await service.getProjectWithAssets("proj_123");

      expect(enriched).toBeDefined();
      expect(enriched?.id).toBe("proj_123");
      expect(enriched?.assets).toHaveLength(1);
      expect(enriched?.assets[0].id).toBe("asset_1");
      expect(enriched?.assets[0].activeVersion?.id).toBe("ver_1");
      expect(assetVersionRepo.findActiveVersion).toHaveBeenCalledWith("asset_1");
    });

    it("returns null if project is not found", async () => {
      vi.mocked(projectRepo.findById!).mockResolvedValue(null);

      const result = await service.getProjectWithAssets("non_existent");
      expect(result).toBeNull();
    });
  });

  describe("attachAssetToProject and detachAssetFromProject", () => {
    it("delegates attachAsset to project repository", async () => {
      await service.attachAssetToProject("proj_123", "asset_999", 2);
      expect(projectRepo.attachAsset).toHaveBeenCalledWith("proj_123", "asset_999", 2);
    });

    it("delegates detachAsset to project repository", async () => {
      await service.detachAssetFromProject("proj_123", "asset_999");
      expect(projectRepo.detachAsset).toHaveBeenCalledWith("proj_123", "asset_999");
    });
  });
});

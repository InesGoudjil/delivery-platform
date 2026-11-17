import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeliveryService } from "@/core/services/delivery.service";
import type { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import type { IClientRepository } from "@/core/repositories/client.repository";
import type { IAssetRepository, IAssetVersionRepository } from "@/core/repositories/i-asset-repository";
import type { IFeedbackRepository } from "@/core/repositories/feedback.repository";
import type { SubscriptionService } from "@/core/services/subscription.service";
import type { Delivery } from "@/core/entities/delivery";

describe("core/services/DeliveryService", () => {
  let deliveryRepo: Partial<IDeliveryRepository>;
  let clientRepo: Partial<IClientRepository>;
  let assetRepo: Partial<IAssetRepository>;
  let assetVersionRepo: Partial<IAssetVersionRepository>;
  let feedbackRepo: Partial<IFeedbackRepository>;
  let subscriptionService: Partial<SubscriptionService>;
  let service: DeliveryService;

  const mockDelivery: Delivery = {
    id: "del_1",
    workspaceId: "ws_1",
    title: "Client Video Delivery",
    shareToken: "token_123",
    status: "in_review",
    isDownloadAllowed: true,
    isCommentAllowed: true,
    notifyOnDownload: true,
    isWatermarked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    deliveryRepo = {
      findById: vi.fn().mockResolvedValue(mockDelivery),
      findByShareToken: vi.fn().mockResolvedValue(mockDelivery),
      create: vi.fn().mockImplementation((dto) => Promise.resolve({ id: "del_new", ...dto })),
      update: vi.fn().mockImplementation((id, dto) => Promise.resolve({ ...mockDelivery, ...dto })),
      listByWorkspaceId: vi.fn().mockResolvedValue([mockDelivery]),
    };

    clientRepo = {
      findById: vi.fn().mockResolvedValue({ id: "client_1", name: "Acme Corp" } as any),
    };

    assetRepo = {
      listByDeliveryId: vi.fn().mockResolvedValue([
        { id: "asset_1", deliveryId: "del_1", title: "Video Cut", isApproved: false },
      ]),
      countByDeliveryId: vi.fn().mockResolvedValue(0),
    };

    assetVersionRepo = {
      listByAssetIds: vi.fn().mockResolvedValue([
        { id: "ver_1", assetId: "asset_1", isActiveVersion: true },
      ]),
    };

    feedbackRepo = {
      listByAssetVersionIds: vi.fn().mockResolvedValue([
        { id: "fb_1", assetVersionId: "ver_1", commentText: "Great cut!" },
      ]),
    };

    subscriptionService = {
      canCreateProject: vi.fn().mockResolvedValue({ allowed: true }),
    };

    service = new DeliveryService(
      deliveryRepo as IDeliveryRepository,
      clientRepo as IClientRepository,
      assetRepo as IAssetRepository,
      assetVersionRepo as IAssetVersionRepository,
      feedbackRepo as IFeedbackRepository,
      undefined,
      subscriptionService as SubscriptionService
    );
  });

  describe("createDelivery", () => {
    it("creates delivery when subscription quota is not exceeded", async () => {
      const result = await service.createDelivery({
        workspaceId: "ws_1",
        title: "Commercial Cut",
        shareToken: "token_abc",
      });

      expect(result.id).toBe("del_new");
      expect(deliveryRepo.create).toHaveBeenCalledOnce();
    });

    it("throws an error when subscription client links limit is reached", async () => {
      vi.mocked(subscriptionService.canCreateProject!).mockResolvedValue({
        allowed: false,
        currentCount: 1,
        maxAllowed: 1,
        reason: "Active client delivery link limit reached.",
      });

      await expect(
        service.createDelivery({
          workspaceId: "ws_1",
          title: "Commercial Cut",
          shareToken: "token_abc",
        })
      ).rejects.toThrow("Active client delivery link limit reached");

      expect(deliveryRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("getDeliveryByShareToken", () => {
    it("returns delivery when not expired", async () => {
      const result = await service.getDeliveryByShareToken("token_123");
      expect(result?.id).toBe("del_1");
    });

    it("throws error when delivery link has expired and allowExpired is false", async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      vi.mocked(deliveryRepo.findByShareToken!).mockResolvedValue({
        ...mockDelivery,
        expiresAt: pastDate,
      });

      await expect(service.getDeliveryByShareToken("token_123")).rejects.toThrow(
        "This delivery link has expired."
      );
    });

    it("allows access to expired delivery when allowExpired: true is passed", async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      vi.mocked(deliveryRepo.findByShareToken!).mockResolvedValue({
        ...mockDelivery,
        expiresAt: pastDate,
      });

      const result = await service.getDeliveryByShareToken("token_123", { allowExpired: true });
      expect(result?.id).toBe("del_1");
    });
  });

  describe("regenerateShareToken", () => {
    it("generates a new 32-character hex share token and updates delivery", async () => {
      await service.regenerateShareToken("del_1");

      expect(deliveryRepo.update).toHaveBeenCalledWith(
        "del_1",
        expect.objectContaining({
          shareToken: expect.stringMatching(/^[a-f0-9]{32}$/),
        })
      );
    });
  });

  describe("getDeliveryWithFullDetails", () => {
    it("enriches delivery with client, assets, active versions, and feedback", async () => {
      const fullDetails = await service.getDeliveryWithFullDetails({ ...mockDelivery, clientId: "client_1" } as any);

      expect(fullDetails).toBeDefined();
      expect(fullDetails?.client?.name).toBe("Acme Corp");
      expect(fullDetails?.assets).toHaveLength(1);
      expect(fullDetails?.assets[0].activeVersion?.id).toBe("ver_1");
      expect(fullDetails?.assets[0].feedback).toHaveLength(1);
      expect(fullDetails?.assets[0].feedback[0].commentText).toBe("Great cut!");
      expect(assetRepo.listByDeliveryId).toHaveBeenCalledWith(mockDelivery.id, { workspaceId: mockDelivery.workspaceId });
    });

    it("loads every file's versions and comments in one query each, and gives each file its own", async () => {
      vi.mocked(assetRepo.listByDeliveryId!).mockResolvedValue([
        { id: "asset_1", deliveryId: "del_1", title: "Film", isApproved: true },
        { id: "asset_2", deliveryId: "del_1", title: "Still", isApproved: false },
        { id: "asset_3", deliveryId: "del_1", title: "Empty", isApproved: false },
      ] as any);
      vi.mocked(assetVersionRepo.listByAssetIds!).mockResolvedValue([
        { id: "ver_2", assetId: "asset_1", versionNumber: 2, isActiveVersion: false },
        { id: "ver_1", assetId: "asset_1", versionNumber: 1, isActiveVersion: true },
        { id: "ver_3", assetId: "asset_2", versionNumber: 1, isActiveVersion: false },
      ] as any);
      vi.mocked(feedbackRepo.listByAssetVersionIds!).mockResolvedValue([
        { id: "fb_1", assetVersionId: "ver_2", commentText: "On v2" },
        { id: "fb_2", assetVersionId: "ver_3", commentText: "On the still" },
        { id: "fb_3", assetVersionId: "ver_1", commentText: "On v1" },
      ] as any);

      const details = await service.getDeliveryWithFullDetails(mockDelivery);

      expect(assetVersionRepo.listByAssetIds).toHaveBeenCalledTimes(1);
      expect(assetVersionRepo.listByAssetIds).toHaveBeenCalledWith(["asset_1", "asset_2", "asset_3"]);
      expect(feedbackRepo.listByAssetVersionIds).toHaveBeenCalledTimes(1);
      expect(feedbackRepo.listByAssetVersionIds).toHaveBeenCalledWith(["ver_2", "ver_1", "ver_3"]);

      const [film, still, empty] = details!.assets;
      expect(film.versions.map((v) => v.id)).toEqual(["ver_2", "ver_1"]);
      expect(film.activeVersion?.id).toBe("ver_1");
      expect(film.feedback.map((f) => f.id)).toEqual(["fb_1", "fb_3"]);
      // Without an active version, the newest one stands in.
      expect(still.activeVersion?.id).toBe("ver_3");
      expect(still.feedback.map((f) => f.id)).toEqual(["fb_2"]);
      expect(empty).toMatchObject({ versions: [], activeVersion: null, feedback: [] });
      expect(details!.approvedAssetsCount).toBe(1);
    });

    it("looks up by delivery id only: a share token never resolves here", async () => {
      vi.mocked(deliveryRepo.findById).mockResolvedValue(null);
      expect(await service.getDeliveryWithFullDetails("token_123")).toBeNull();
      expect(deliveryRepo.findByShareToken).not.toHaveBeenCalled();
    });
  });
});

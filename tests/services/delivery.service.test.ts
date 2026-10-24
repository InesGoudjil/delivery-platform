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
    createdAt: new Date(),
    updatedAt: new Date(),
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
      listByAssetId: vi.fn().mockResolvedValue([
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
      vi.mocked(deliveryRepo.findByShareToken!).mockResolvedValue({
        ...mockDelivery,
        clientId: "client_1",
      });

      const fullDetails = await service.getDeliveryWithFullDetails("token_123");

      expect(fullDetails).toBeDefined();
      expect(fullDetails?.client?.name).toBe("Acme Corp");
      expect(fullDetails?.assets).toHaveLength(1);
      expect(fullDetails?.assets[0].activeVersion?.id).toBe("ver_1");
      expect(fullDetails?.assets[0].feedback).toHaveLength(1);
      expect(fullDetails?.assets[0].feedback[0].commentText).toBe("Great cut!");
    });
  });
});

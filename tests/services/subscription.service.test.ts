import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscriptionService } from "@/core/services/subscription.service";
import type { ISubscriptionRepository } from "@/core/repositories/subscription.repository";
import type { IPlanRepository } from "@/core/repositories/plan.repository";
import type { IWorkspaceFeaturesRepository } from "@/core/repositories/workspace.repository";
import type { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import type { Plan } from "@/core/entities/plan";

describe("core/services/SubscriptionService", () => {
  let subscriptionRepo: Partial<ISubscriptionRepository>;
  let planRepo: Partial<IPlanRepository>;
  let featuresRepo: Partial<IWorkspaceFeaturesRepository>;
  let deliveryRepo: Partial<IDeliveryRepository>;
  let service: SubscriptionService;

  const starterPlan: Plan = {
    id: "plan_starter",
    name: "Starter",
    slug: "starter",
    priceCents: 0,
    currency: "usd",
    billingInterval: "month",
    sortOrder: 1,
    isActive: true,
    features: {
      client_links: 1,
      portfolio_videos: 4,
      watermark: false,
      password_protected: false,
      silo_archive: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const proPlan: Plan = {
    id: "plan_pro",
    name: "Pro",
    slug: "pro",
    priceCents: 2900,
    currency: "usd",
    billingInterval: "month",
    sortOrder: 2,
    isActive: true,
    features: {
      client_links: -1, // Unlimited
      portfolio_videos: -1,
      watermark: true,
      password_protected: true,
      silo_archive: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    planRepo = {
      listActivePlans: vi.fn().mockResolvedValue([starterPlan, proPlan]),
      listAllPlans: vi.fn().mockResolvedValue([starterPlan, proPlan]),
      findById: vi.fn().mockImplementation((id) =>
        Promise.resolve(id === "plan_starter" ? starterPlan : id === "plan_pro" ? proPlan : null)
      ),
      findBySlug: vi.fn().mockImplementation((slug) =>
        Promise.resolve(slug === "starter" ? starterPlan : slug === "pro" ? proPlan : null)
      ),
      create: vi.fn().mockImplementation((d) => Promise.resolve({ id: "plan_new", ...d })),
      update: vi.fn().mockResolvedValue(starterPlan),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    subscriptionRepo = {
      listAllSubscriptions: vi.fn().mockResolvedValue([]),
      findByWorkspaceId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((d) => Promise.resolve({ id: "sub_1", ...d })),
      update: vi.fn().mockImplementation((id, d) => Promise.resolve({ id, ...d })),
    };

    featuresRepo = {
      findByWorkspaceId: vi.fn().mockResolvedValue({ workspaceId: "ws_1", features: starterPlan.features } as any),
      upsertFeatures: vi.fn().mockImplementation((wsId, f) => Promise.resolve({ workspaceId: wsId, features: f } as any)),
    };

    deliveryRepo = {
      listByWorkspaceId: vi.fn().mockResolvedValue([]),
    };

    service = new SubscriptionService(
      subscriptionRepo as ISubscriptionRepository,
      planRepo as IPlanRepository,
      featuresRepo as IWorkspaceFeaturesRepository,
      deliveryRepo as IDeliveryRepository
    );
  });

  describe("canCreateProject (Client Link Quota)", () => {
    it("allows creation when under limit on Starter plan", async () => {
      vi.mocked(deliveryRepo.listByWorkspaceId!).mockResolvedValue([]);

      const result = await service.canCreateProject("ws_1");
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.maxAllowed).toBe(1);
    });

    it("blocks creation when client links reach Starter limit", async () => {
      vi.mocked(deliveryRepo.listByWorkspaceId!).mockResolvedValue([
        { id: "del_1", status: "in_review" } as any,
      ]);

      const result = await service.canCreateProject("ws_1");
      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(1);
      expect(result.reason).toContain("allows up to 1 active project link");
    });

    it("does not count archived deliveries against the active link limit", async () => {
      vi.mocked(deliveryRepo.listByWorkspaceId!).mockResolvedValue([
        { id: "del_archived", status: "archived" } as any,
      ]);

      const result = await service.canCreateProject("ws_1");
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
    });

    it("allows unlimited deliveries on Pro plan (-1 limit)", async () => {
      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue({ workspaceId: "ws_1", features: proPlan.features } as any);
      vi.mocked(deliveryRepo.listByWorkspaceId!).mockResolvedValue([
        { id: "del_1", status: "in_review" } as any,
        { id: "del_2", status: "in_review" } as any,
        { id: "del_3", status: "in_review" } as any,
      ]);

      const result = await service.canCreateProject("ws_1");
      expect(result.allowed).toBe(true);
      expect(result.maxAllowed).toBe(-1);
    });
  });

  describe("canAddPortfolioVideo", () => {
    it("allows adding showcase film when below Starter limit (4)", async () => {
      const result = await service.canAddPortfolioVideo("ws_1", 3);
      expect(result.allowed).toBe(true);
    });

    it("blocks adding showcase film when Starter limit (4) is reached", async () => {
      const result = await service.canAddPortfolioVideo("ws_1", 4);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("allows up to 4 showcase film(s)");
    });
  });

  describe("Feature Entitlements", () => {
    it("correctly evaluates boolean feature flags for Starter vs Pro", async () => {
      // Starter
      expect(await service.isPasswordProtectionAllowed("ws_1")).toBe(false);
      expect(await service.isWatermarkAllowed("ws_1")).toBe(false);
      expect(await service.isSiloArchiveAllowed("ws_1")).toBe(false);

      // Pro
      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue({ workspaceId: "ws_1", features: proPlan.features } as any);
      expect(await service.isPasswordProtectionAllowed("ws_1")).toBe(true);
      expect(await service.isWatermarkAllowed("ws_1")).toBe(true);
      expect(await service.isSiloArchiveAllowed("ws_1")).toBe(true);
    });
  });

  describe("deletePlan Safety Invariants", () => {
    it("prevents deletion of the system-protected 'starter' plan", async () => {
      await expect(service.deletePlan("plan_starter")).rejects.toThrow(
        'System protected plan "starter" cannot be deleted.'
      );
    });

    it("soft-deletes (archives) a plan if active subscribers exist", async () => {
      vi.mocked(subscriptionRepo.listAllSubscriptions!).mockResolvedValue([
        { id: "sub_1", planId: "plan_pro", status: "active" } as any,
      ]);

      const result = await service.deletePlan("plan_pro");
      expect(result.action).toBe("archived");
      expect(planRepo.update).toHaveBeenCalledWith("plan_pro", { isActive: false });
      expect(planRepo.delete).not.toHaveBeenCalled();
    });

    it("hard-deletes a plan if it has 0 subscribers", async () => {
      vi.mocked(subscriptionRepo.listAllSubscriptions!).mockResolvedValue([]);

      const result = await service.deletePlan("plan_pro");
      expect(result.action).toBe("deleted");
      expect(planRepo.delete).toHaveBeenCalledWith("plan_pro");
    });
  });

  describe("createPlan", () => {
    it("prevents creating a plan with a duplicate slug", async () => {
      await expect(
        service.createPlan({
          name: "Pro Duplicate",
          slug: "pro",
          priceCents: 2900,
        })
      ).rejects.toThrow('A plan with slug "pro" already exists.');
    });
  });
});

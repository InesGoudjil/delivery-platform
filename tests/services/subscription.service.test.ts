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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

  describe("Single Source of Truth (SSOT) Entitlements & Lifecycle Resolution", () => {
    it("dynamically resolves features from active subscription without requiring workspace_features copy", async () => {
      // workspace_features is empty (no custom overrides)
      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue({ workspaceId: "ws_active_pro", features: {} } as any);
      vi.mocked(subscriptionRepo.findByWorkspaceId!).mockResolvedValue({
        id: "sub_pro",
        workspaceId: "ws_active_pro",
        planId: "plan_pro",
        status: "active",
      } as any);

      const features = await service.getFeatures("ws_active_pro");
      expect(features.watermark).toBe(true);
      expect(features.password_protected).toBe(true);
      expect(features.client_links).toBe(-1);
    });

    it("grants plan features when subscription is trialing and within trial period", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue(null);
      vi.mocked(subscriptionRepo.findByWorkspaceId!).mockResolvedValue({
        id: "sub_trial",
        workspaceId: "ws_trial",
        planId: "plan_pro",
        status: "trialing",
        trialEndsAt: futureDate.toISOString(),
      } as any);

      const features = await service.getFeatures("ws_trial");
      expect(features.watermark).toBe(true);
      expect(features.password_protected).toBe(true);
    });

    it("automatically downgrades to Starter when trial has expired", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue(null);
      vi.mocked(subscriptionRepo.findByWorkspaceId!).mockResolvedValue({
        id: "sub_expired_trial",
        workspaceId: "ws_expired",
        planId: "plan_pro",
        status: "trialing",
        trialEndsAt: pastDate.toISOString(),
      } as any);

      const features = await service.getFeatures("ws_expired");
      expect(features.watermark).toBe(false);
      expect(features.password_protected).toBe(false);
      expect(features.client_links).toBe(1);
    });

    it("automatically downgrades to Starter when subscription is canceled or past_due", async () => {
      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue(null);

      // Canceled
      vi.mocked(subscriptionRepo.findByWorkspaceId!).mockResolvedValue({
        id: "sub_canceled",
        workspaceId: "ws_canceled",
        planId: "plan_pro",
        status: "canceled",
      } as any);

      let features = await service.getFeatures("ws_canceled");
      expect(features.watermark).toBe(false);
      expect(features.client_links).toBe(1);

      // Past Due
      vi.mocked(subscriptionRepo.findByWorkspaceId!).mockResolvedValue({
        id: "sub_past_due",
        workspaceId: "ws_past_due",
        planId: "plan_pro",
        status: "past_due",
      } as any);

      features = await service.getFeatures("ws_past_due");
      expect(features.watermark).toBe(false);
      expect(features.client_links).toBe(1);
    });

    it("merges custom workspace overrides over the active plan baseline", async () => {
      // Pro plan has client_links: -1, storage_gb: undefined
      // Custom override gives 10TB storage and disables watermarking
      vi.mocked(subscriptionRepo.findByWorkspaceId!).mockResolvedValue({
        id: "sub_pro",
        workspaceId: "ws_custom",
        planId: "plan_pro",
        status: "active",
      } as any);

      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue({
        workspaceId: "ws_custom",
        features: {
          storage_gb: 10240,
          custom_beta_flag: true,
          watermark: false, // override
        },
      } as any);

      const features = await service.getFeatures("ws_custom");
      expect(features.storage_gb).toBe(10240);
      expect(features.custom_beta_flag).toBe(true);
      expect(features.watermark).toBe(false); // custom override took precedence
      expect(features.password_protected).toBe(true); // inherited from Pro
    });

    it("reflects plan feature changes immediately without requiring database triggers", async () => {
      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue(null);
      vi.mocked(subscriptionRepo.findByWorkspaceId!).mockResolvedValue({
        id: "sub_pro",
        workspaceId: "ws_dynamic",
        planId: "plan_pro",
        status: "active",
      } as any);

      const initialFeatures = await service.getFeatures("ws_dynamic");
      expect(initialFeatures.watermark).toBe(true);

      // Admin updates Pro plan in DB
      const updatedProPlan: Plan = {
        ...proPlan,
        features: {
          ...proPlan.features,
          white_label: true,
        },
      };
      vi.mocked(planRepo.findById!).mockResolvedValue(updatedProPlan);

      const updatedFeatures = await service.getFeatures("ws_dynamic");
      expect(updatedFeatures.white_label).toBe(true);
    });
  });

  describe("getEntitlements", () => {
    it("returns strongly-typed limits and boolean capabilities for Starter plan", async () => {
      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue(null);
      vi.mocked(subscriptionRepo.findByWorkspaceId!).mockResolvedValue(null);

      const entitlements = await service.getEntitlements("ws_starter");
      expect(entitlements.planSlug).toBe("starter");
      expect(entitlements.limits.clientLinksMax).toBe(1);
      expect(entitlements.limits.portfolioVideosMax).toBe(4);
      expect(entitlements.limits.teamSeatsMax).toBe(1);
      expect(entitlements.can.watermark).toBe(false);
      expect(entitlements.can.whiteLabel).toBe(false);
      expect(entitlements.can.sendWhatsApp).toBe(false);
      expect(entitlements.can.receiveDownloadNotifications).toBe(false);
    });

    it("returns strongly-typed limits and boolean capabilities for Pro plan", async () => {
      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue(null);
      vi.mocked(subscriptionRepo.findByWorkspaceId!).mockResolvedValue({
        id: "sub_pro",
        workspaceId: "ws_pro",
        planId: "plan_pro",
        status: "active",
      } as any);

      const entitlements = await service.getEntitlements("ws_pro");
      expect(entitlements.planSlug).toBe("pro");
      expect(entitlements.limits.clientLinksMax).toBe(-1); // unlimited
      expect(entitlements.limits.portfolioVideosMax).toBe(-1);
      expect(entitlements.can.watermark).toBe(true);
      expect(entitlements.can.passwordProtect).toBe(true);
      expect(entitlements.isActive).toBe(true);

      // The Silo also needs its kill switch (SILO_ENABLED) on, whatever the plan says.
      const { env } = await import("@/lib/env");
      const siloWasEnabled = env.isSiloEnabled;
      try {
        env.isSiloEnabled = true;
        expect((await service.getEntitlements("ws_pro")).can.useSiloArchive).toBe(true);
        env.isSiloEnabled = false;
        expect((await service.getEntitlements("ws_pro")).can.useSiloArchive).toBe(false);
      } finally {
        env.isSiloEnabled = siloWasEnabled;
      }
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
      const { env } = await import("@/lib/env");
      const siloWasEnabled = env.isSiloEnabled;
      env.isSiloEnabled = true;
      try {
        // Starter
        expect(await service.isPasswordProtectionAllowed("ws_1")).toBe(false);
        expect(await service.isWatermarkAllowed("ws_1")).toBe(false);
        expect(await service.isSiloArchiveAllowed("ws_1")).toBe(false);

        // Pro
        vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue({ workspaceId: "ws_1", features: proPlan.features } as any);
        expect(await service.isPasswordProtectionAllowed("ws_1")).toBe(true);
        expect(await service.isWatermarkAllowed("ws_1")).toBe(true);
        expect(await service.isSiloArchiveAllowed("ws_1")).toBe(true);

        // The Silo kill switch overrides the plan.
        env.isSiloEnabled = false;
        expect(await service.isSiloArchiveAllowed("ws_1")).toBe(false);
      } finally {
        env.isSiloEnabled = siloWasEnabled;
      }
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

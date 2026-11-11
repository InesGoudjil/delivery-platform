import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stripe/client", () => ({
  getStripeClient: vi.fn(),
  createStripeProductAndPrice: vi.fn(),
  archiveStripeProductAndPrice: vi.fn(),
}));

import { getStripeClient } from "@/lib/stripe/client";
import { StripeService } from "@/core/services/stripe.service";

describe("StripeService", () => {
  let stripe: any;
  let subscriptionRepo: any;
  let planRepo: any;
  let memberRepo: any;
  let workspaceRepo: any;
  let billingEventRepo: any;
  let claimed: Set<string>;
  let subscriptionService: any;
  let service: StripeService;

  const addonSession = (overrides: Record<string, any> = {}) => ({
    id: "cs_addon_1",
    status: "complete",
    payment_status: "paid",
    client_reference_id: "ws_1",
    customer: "cus_1",
    invoice: "in_1",
    subscription: { id: "sub_addon", status: "active" },
    metadata: { type: "storage_addon", storage_gb_delta: "1024", workspace_id: "ws_1" },
    line_items: { data: [] },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    stripe = {
      billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: "https://billing.test/portal" }) } },
      customers: { retrieve: vi.fn().mockResolvedValue({ id: "cus_1", deleted: false }) },
      checkout: { sessions: { retrieve: vi.fn() } },
      subscriptions: { retrieve: vi.fn() },
    };
    vi.mocked(getStripeClient).mockReturnValue(stripe);

    subscriptionRepo = {
      findByWorkspaceId: vi.fn().mockResolvedValue({ paymentProviderCustId: "cus_1" }),
    };
    planRepo = {
      findById: vi.fn().mockResolvedValue({
        id: "plan_pro",
        name: "Pro",
        priceCents: 2900,
        currency: "USD",
        billingInterval: "month",
      }),
      listAllPlans: vi.fn().mockResolvedValue([]),
    };
    memberRepo = { findByWorkspaceAndUserId: vi.fn().mockResolvedValue(null) };
    workspaceRepo = { findById: vi.fn().mockResolvedValue({ id: "ws_1", slug: "ws-1", ownerId: "owner_1" }) };

    claimed = new Set<string>();
    billingEventRepo = {
      claim: vi.fn(async (id: string) => {
        if (claimed.has(id)) return false;
        claimed.add(id);
        return true;
      }),
      release: vi.fn(async (id: string) => {
        claimed.delete(id);
      }),
    };

    subscriptionService = {
      getFeatures: vi.fn().mockResolvedValue({ storage_gb: 50, team_seats: 3, silo_archive: true }),
      getFeatureOverrides: vi.fn().mockResolvedValue({}),
      updateWorkspaceFeatures: vi.fn().mockResolvedValue({}),
      recordInvoice: vi.fn().mockResolvedValue(null),
      upgradePlan: vi.fn().mockResolvedValue({}),
    };

    service = new StripeService(subscriptionRepo, planRepo, memberRepo, workspaceRepo, billingEventRepo);
  });

  describe("createBillingPortalSession", () => {
    const input = { workspaceId: "ws_1", userId: "intruder", origin: "https://app.test" };

    it("refuses users who are not owners or admins of the workspace", async () => {
      await expect(service.createBillingPortalSession(input)).rejects.toThrow(/Permission denied/);
      expect(subscriptionRepo.findByWorkspaceId).not.toHaveBeenCalled();
      expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
    });

    it("refuses viewers and editors", async () => {
      memberRepo.findByWorkspaceAndUserId.mockResolvedValue({ role: "editor" });
      await expect(service.createBillingPortalSession(input)).rejects.toThrow(/Permission denied/);
      expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
    });

    it("opens the portal for a workspace admin", async () => {
      memberRepo.findByWorkspaceAndUserId.mockResolvedValue({ role: "admin" });
      const result = await service.createBillingPortalSession(input);
      expect(result.url).toBe("https://billing.test/portal");
      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: "cus_1" })
      );
    });

    it("opens the portal for the workspace owner", async () => {
      const result = await service.createBillingPortalSession({ ...input, userId: "owner_1" });
      expect(result.url).toBe("https://billing.test/portal");
    });
  });

  describe("syncCheckoutSession", () => {
    it("applies a storage add-on once, however often the success URL is loaded", async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(addonSession());

      const first = await service.syncCheckoutSession("cs_addon_1", subscriptionService);
      const second = await service.syncCheckoutSession("cs_addon_1", subscriptionService);
      const third = await service.syncCheckoutSession("cs_addon_1", subscriptionService);

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(third.success).toBe(true);
      expect(subscriptionService.updateWorkspaceFeatures).toHaveBeenCalledTimes(1);
      expect(subscriptionService.recordInvoice).toHaveBeenCalledTimes(1);
    });

    it("stores only the storage override, not the whole plan feature set", async () => {
      subscriptionService.getFeatureOverrides.mockResolvedValue({ watermark: true });
      stripe.checkout.sessions.retrieve.mockResolvedValue(addonSession());

      await service.syncCheckoutSession("cs_addon_1", subscriptionService);

      expect(subscriptionService.updateWorkspaceFeatures).toHaveBeenCalledWith("ws_1", {
        watermark: true,
        storage_gb: 50 + 1024,
      });
    });

    it("grants nothing when the subscription is no longer active", async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(
        addonSession({ subscription: { id: "sub_addon", status: "canceled" } })
      );

      const result = await service.syncCheckoutSession("cs_addon_1", subscriptionService);

      expect(result.success).toBe(false);
      expect(billingEventRepo.claim).not.toHaveBeenCalled();
      expect(subscriptionService.updateWorkspaceFeatures).not.toHaveBeenCalled();
    });

    it("does not re-activate a plan when an old success URL is replayed", async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(
        addonSession({
          id: "cs_plan_1",
          metadata: { plan_id: "plan_pro", workspace_id: "ws_1" },
          subscription: { id: "sub_plan", status: "active" },
        })
      );

      const first = await service.syncCheckoutSession("cs_plan_1", subscriptionService);
      const replay = await service.syncCheckoutSession("cs_plan_1", subscriptionService);

      expect(first).toEqual({ success: true, planName: "Pro" });
      expect(replay).toEqual({ success: true, planName: "Pro" });
      expect(subscriptionService.upgradePlan).toHaveBeenCalledTimes(1);
    });

    it("releases the claim when applying the add-on fails, so it can be retried", async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(addonSession());
      subscriptionService.updateWorkspaceFeatures.mockRejectedValueOnce(new Error("db down"));

      const failed = await service.syncCheckoutSession("cs_addon_1", subscriptionService);
      expect(failed.success).toBe(false);
      expect(billingEventRepo.release).toHaveBeenCalledWith("cs_addon_1");

      const retried = await service.syncCheckoutSession("cs_addon_1", subscriptionService);
      expect(retried.success).toBe(true);
      expect(subscriptionService.updateWorkspaceFeatures).toHaveBeenCalledTimes(2);
    });

    it("refuses to apply anything without the billing ledger", async () => {
      const withoutLedger = new StripeService(subscriptionRepo, planRepo, memberRepo, workspaceRepo);
      stripe.checkout.sessions.retrieve.mockResolvedValue(addonSession());

      const result = await withoutLedger.syncCheckoutSession("cs_addon_1", subscriptionService);

      expect(result.success).toBe(false);
      expect(subscriptionService.updateWorkspaceFeatures).not.toHaveBeenCalled();
    });
  });
});

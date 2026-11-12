import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as siloActions from "@/app/actions/silo";
import { restoreDeliveryFromSiloAction, checkDeliverySiloStatusAction } from "@/app/actions/silo";
import { archiveDeliveryAction } from "@/app/actions/deliveries/manage-delivery";
import * as guards from "@/core/security/guards";
import * as serverModule from "@/core/server";
import { SILO_UNAVAILABLE_MESSAGE } from "@/core/providers/storage/silo-glacier.provider";
import { env } from "@/lib/env";

const DELIVERY = { id: "del_1", workspaceId: "ws_1", title: "Spot", siloStatus: "archived" };

describe("app/actions/silo", () => {
  const siloWasEnabled = env.isSiloEnabled;
  let userServices: any;
  let adminServices: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    env.isSiloEnabled = true;

    userServices = {
      subscription: { isSiloArchiveAllowed: vi.fn().mockResolvedValue(true) },
      silo: {
        archiveDelivery: vi.fn().mockResolvedValue({ success: true }),
        requestRestoreDelivery: vi.fn().mockResolvedValue({
          success: true,
          deliveryId: DELIVERY.id,
          status: "restoring",
          tier: "Bulk",
          estimatedHours: 48,
        }),
        checkAndFinalizeRestore: vi.fn(),
      },
      delivery: { getDeliveryById: vi.fn().mockResolvedValue(DELIVERY) },
    };
    adminServices = {
      silo: {
        checkAndFinalizeRestore: vi.fn().mockResolvedValue({
          deliveryId: DELIVERY.id,
          isReady: false,
          status: "restoring",
          thawedVersionsCount: 1,
          totalVersionsCount: 2,
        }),
      },
    };

    vi.spyOn(guards, "requireDeliveryAccess").mockResolvedValue({
      services: userServices,
      delivery: DELIVERY as any,
      workspace: { id: "ws_1", slug: "studio" } as any,
      role: "admin",
      user: { id: "user_1" } as any,
    });
    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(adminServices);
    vi.spyOn(serverModule, "getServerServices").mockResolvedValue(userServices);
  });

  afterEach(() => {
    env.isSiloEnabled = siloWasEnabled;
  });

  it("exports only the guarded restore and status actions (the unused duplicates are gone)", () => {
    expect(Object.keys(siloActions).sort()).toEqual(["checkDeliverySiloStatusAction", "restoreDeliveryFromSiloAction"]);
  });

  describe("while The Silo is switched off", () => {
    it("refuses archive, restore and status checks before touching anything", async () => {
      env.isSiloEnabled = false;

      expect(await archiveDeliveryAction(DELIVERY.id)).toEqual({ error: SILO_UNAVAILABLE_MESSAGE });
      expect(await restoreDeliveryFromSiloAction(DELIVERY.id, "Bulk")).toEqual({
        success: false,
        error: SILO_UNAVAILABLE_MESSAGE,
      });
      expect(await checkDeliverySiloStatusAction(DELIVERY.id)).toEqual({
        success: false,
        error: SILO_UNAVAILABLE_MESSAGE,
      });

      expect(guards.requireDeliveryAccess).not.toHaveBeenCalled();
      expect(serverModule.getServerAdminServices).not.toHaveBeenCalled();
      expect(userServices.silo.archiveDelivery).not.toHaveBeenCalled();
      expect(userServices.silo.requestRestoreDelivery).not.toHaveBeenCalled();
      expect(adminServices.silo.checkAndFinalizeRestore).not.toHaveBeenCalled();
    });
  });

  describe("restoreDeliveryFromSiloAction", () => {
    it("requires workspace admin access and a plan with The Silo", async () => {
      const result = await restoreDeliveryFromSiloAction(DELIVERY.id, "Standard");

      expect(guards.requireDeliveryAccess).toHaveBeenCalledWith(DELIVERY.id, "admin");
      expect(userServices.subscription.isSiloArchiveAllowed).toHaveBeenCalledWith("ws_1");
      expect(userServices.silo.requestRestoreDelivery).toHaveBeenCalledWith(DELIVERY.id, "Standard", 7);
      expect(result).toMatchObject({ success: true, status: "restoring", deliveryId: DELIVERY.id });
    });

    it("refuses when the plan does not include The Silo", async () => {
      userServices.subscription.isSiloArchiveAllowed.mockResolvedValue(false);

      const result = await restoreDeliveryFromSiloAction(DELIVERY.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain("requires a Studio or Enterprise plan");
      expect(userServices.silo.requestRestoreDelivery).not.toHaveBeenCalled();
    });

    it("refuses callers below admin", async () => {
      vi.mocked(guards.requireDeliveryAccess).mockRejectedValue(
        new Error('Forbidden: Requires at least "admin" role permissions.')
      );

      const result = await restoreDeliveryFromSiloAction(DELIVERY.id);

      expect(result).toEqual({ success: false, error: 'Forbidden: Requires at least "admin" role permissions.' });
      expect(userServices.silo.requestRestoreDelivery).not.toHaveBeenCalled();
    });

    it("rejects the Expedited tier, which Deep Archive does not offer", async () => {
      const result = await restoreDeliveryFromSiloAction(DELIVERY.id, "Expedited" as any);

      expect(result.success).toBe(false);
      expect(guards.requireDeliveryAccess).not.toHaveBeenCalled();
    });
  });

  describe("checkDeliverySiloStatusAction", () => {
    it("requires viewer access and finalizes with the service role", async () => {
      const result = await checkDeliverySiloStatusAction(DELIVERY.id);

      expect(guards.requireDeliveryAccess).toHaveBeenCalledWith(DELIVERY.id, "viewer");
      expect(adminServices.silo.checkAndFinalizeRestore).toHaveBeenCalledWith(DELIVERY.id);
      expect(userServices.silo.checkAndFinalizeRestore).not.toHaveBeenCalled();
      expect(result).toMatchObject({ success: true, isReady: false, thawedVersionsCount: 1, totalVersionsCount: 2 });
    });

    it("does nothing for callers without access to the delivery", async () => {
      vi.mocked(guards.requireDeliveryAccess).mockRejectedValue(
        new Error("Forbidden: You do not have access to this workspace.")
      );

      const result = await checkDeliverySiloStatusAction(DELIVERY.id);

      expect(result.success).toBe(false);
      expect(serverModule.getServerAdminServices).not.toHaveBeenCalled();
      expect(adminServices.silo.checkAndFinalizeRestore).not.toHaveBeenCalled();
    });
  });

  describe("archiveDeliveryAction", () => {
    it("requires workspace admin access before archiving", async () => {
      await archiveDeliveryAction(DELIVERY.id);

      expect(guards.requireDeliveryAccess).toHaveBeenCalledWith(DELIVERY.id, "admin");
      expect(userServices.silo.archiveDelivery).toHaveBeenCalledWith(DELIVERY.id, { userId: "user_1" });
    });
  });
});

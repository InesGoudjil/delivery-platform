import { describe, it, expect, vi, beforeEach } from "vitest";
import * as adminContext from "@/core/admin/context";
import {
  banUserAction,
  deletePlanAction,
  searchAdminAction,
  suspendWorkspaceAction,
  unsuspendWorkspaceAction,
  resetUserTwoFactorAction,
  signOutUserEverywhereAction,
  unbanUserAction,
  updatePlanAction,
  updateUserRoleAction,
  updateWorkspaceFeaturesAction,
  updateWorkspacePlanAction,
} from "@/app/actions/admin";

/**
 * Platform-admin actions (app/actions/admin.ts) on createPlatformAdminAction(): a reason is
 * required, every attempt is audited, and the guard rails hold.
 */

const ADMIN = "00000000-0000-4000-8000-0000000000f1";
const OTHER_USER = "00000000-0000-4000-8000-0000000000f2";
const WS = "10000000-0000-4000-8000-00000000000a";
const PLAN = "20000000-0000-4000-8000-000000000002";
const STARTER = "20000000-0000-4000-8000-000000000001";

let record: ReturnType<typeof vi.fn>;
let services: any;
let sessionServices: any;
let readModel: any;
let userControls: any;
let workspaceControls: any;

beforeEach(() => {
  vi.restoreAllMocks();
  record = vi.fn().mockResolvedValue(undefined);
  services = {
    workspace: { getWorkspaceById: vi.fn().mockResolvedValue({ id: WS, brandName: "Studio A" }) },
    subscription: {
      getFeatureOverrides: vi.fn().mockResolvedValue({ storage_gb: 500, watermark: false, junk_key: 1 }),
      updateWorkspaceFeatures: vi.fn(async (workspaceId: string, features: object) => ({ workspaceId, features, updatedAt: "" })),
      getSubscription: vi.fn().mockResolvedValue({ planId: STARTER, status: "active", paymentProviderSubId: null }),
      getPlanById: vi.fn().mockResolvedValue({ id: PLAN, name: "Pro", slug: "pro", priceCents: 3900, stripePriceId: null, isActive: true }),
      adminChangeWorkspacePlan: vi.fn().mockResolvedValue({ id: "sub_1", planId: PLAN, status: "active" }),
      updatePlan: vi.fn(async (id: string, changes: object) => ({ id, name: "Pro", priceCents: 3900, ...changes })),
      deletePlan: vi.fn().mockResolvedValue({ action: "deleted", message: "Deleted." }),
    },
    stripe: { archiveStripeProductAndPrice: vi.fn().mockResolvedValue(undefined) },
    profile: { updatePlatformRole: vi.fn() },
  };
  sessionServices = {
    profile: { updatePlatformRole: vi.fn(async (id: string, role: string) => ({ id, platformRole: role })) },
  };
  readModel = {
    getWorkspace: vi.fn().mockResolvedValue({ id: WS, brandName: "Studio A", slug: "studio-a", suspendedAt: null, suspendedReason: null }),
    search: vi.fn().mockResolvedValue({ workspaces: [{ id: WS, name: "Studio A", slug: "studio-a", ownerEmail: null }], users: [], deliveries: [] }),
    getUser: vi.fn().mockResolvedValue({ id: OTHER_USER, email: "other@test", platformRole: "user", bannedUntil: null, mfaEnabled: true }),
  };
  workspaceControls = {
    suspend: vi.fn().mockResolvedValue({ suspendedAt: "2026-11-13T12:00:00Z" }),
    unsuspend: vi.fn().mockResolvedValue(undefined),
  };
  userControls = {
    signOutEverywhere: vi.fn().mockResolvedValue({ revokedDevices: 2, endedLogins: 3 }),
    ban: vi.fn().mockResolvedValue({ bannedUntil: "2026-11-20T00:00:00Z", revokedDevices: 2, endedLogins: 3 }),
    unban: vi.fn().mockResolvedValue(undefined),
    resetTwoFactor: vi.fn().mockResolvedValue({ removedFactors: 1, revokedDevices: 2, endedLogins: 3 }),
  };
  vi.spyOn(adminContext, "getPlatformAdminServices").mockResolvedValue({
    user: { id: ADMIN, email: "admin@test" },
    profile: { platformRole: "admin" },
    services,
    sessionServices,
    readModel,
    userControls,
    workspaceControls,
    audit: { record },
  } as any);
});

const lastAudit = () => record.mock.calls.at(-1)?.[0];

describe("every admin action", () => {
  it("needs a reason, and runs nothing without one", async () => {
    const result = await updateWorkspaceFeaturesAction({ workspaceId: WS, set: { storage_gb: 1000 } });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/why/i);
    expect(services.subscription.updateWorkspaceFeatures).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("is refused without the platform-admin check, and records nothing", async () => {
    vi.spyOn(adminContext, "getPlatformAdminServices").mockRejectedValue(
      new Error("Forbidden: Two-factor verification is required for platform admins.")
    );
    const result = await updateWorkspaceFeaturesAction({ workspaceId: WS, set: { storage_gb: 1000 }, reason: "Customer asked" });
    expect(result).toEqual({ success: false, error: "Forbidden: Two-factor verification is required for platform admins." });
    expect(record).not.toHaveBeenCalled();
  });

  it("still succeeds when the audit write fails (the change has happened), and logs it", async () => {
    record.mockRejectedValue(new Error("database unavailable"));
    const result = await updateWorkspaceFeaturesAction({ workspaceId: WS, set: { storage_gb: 1000 }, reason: "Customer asked" });
    expect(result.success).toBe(true);
  });
});

describe("updateWorkspaceFeaturesAction", () => {
  it("merges into the existing overrides instead of replacing them, and records before and after", async () => {
    const result = await updateWorkspaceFeaturesAction({
      workspaceId: WS,
      set: { storage_gb: 1000 },
      remove: ["junk_key"],
      reason: "Agreed extra storage for the beta",
    });

    expect(result.success).toBe(true);
    expect(services.subscription.updateWorkspaceFeatures).toHaveBeenCalledWith(WS, { storage_gb: 1000, watermark: false });
    expect(lastAudit()).toMatchObject({
      action: "workspace.override_features",
      targetType: "workspace",
      targetId: WS,
      targetLabel: "Studio A",
      reason: "Agreed extra storage for the beta",
      outcome: "succeeded",
      changes: {
        before: { storage_gb: 500, watermark: false, junk_key: 1 },
        after: { storage_gb: 1000, watermark: false },
      },
    });
  });

  it("rejects unknown feature keys and values of the wrong type", async () => {
    const typo = await updateWorkspaceFeaturesAction({ workspaceId: WS, set: { storage_gbb: 1000 }, reason: "Customer asked" });
    expect(typo.success).toBe(false);
    const wrongType = await updateWorkspaceFeaturesAction({ workspaceId: WS, set: { storage_gb: "lots" }, reason: "Customer asked" });
    expect(wrongType.success).toBe(false);
    expect(services.subscription.updateWorkspaceFeatures).not.toHaveBeenCalled();
  });
});

describe("updateWorkspacePlanAction", () => {
  it("changes the plan of a workspace that isn't billed through Stripe", async () => {
    const result = await updateWorkspacePlanAction({ workspaceId: WS, planId: PLAN, reason: "Beta tester gets Pro" });
    expect(result.success).toBe(true);
    expect(services.subscription.adminChangeWorkspacePlan).toHaveBeenCalledWith(WS, PLAN, "active");
    expect(lastAudit()).toMatchObject({
      action: "workspace.change_plan",
      outcome: "succeeded",
      changes: { before: { planId: STARTER, status: "active" }, after: { planId: PLAN, planName: "Pro", status: "active" } },
    });
  });

  it("refuses Stripe-billed workspaces, whose change the webhook would overwrite, and records the attempt", async () => {
    services.subscription.getSubscription.mockResolvedValue({ planId: STARTER, status: "active", paymentProviderSubId: "sub_stripe" });
    const result = await updateWorkspacePlanAction({ workspaceId: WS, planId: PLAN, reason: "Upgrade them" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Stripe/);
    expect(services.subscription.adminChangeWorkspacePlan).not.toHaveBeenCalled();
    expect(lastAudit()).toMatchObject({ action: "workspace.change_plan", outcome: "failed", errorMessage: result.error });
  });
});

describe("updateUserRoleAction", () => {
  it("writes the role through the admin's own session, which the database trigger requires", async () => {
    const result = await updateUserRoleAction({ userId: OTHER_USER, role: "admin", reason: "New co-founder" });
    expect(result.success).toBe(true);
    expect(sessionServices.profile.updatePlatformRole).toHaveBeenCalledWith(OTHER_USER, "admin");
    expect(services.profile.updatePlatformRole).not.toHaveBeenCalled();
    expect(lastAudit()).toMatchObject({
      action: "user.change_role",
      targetLabel: "other@test",
      changes: { before: { platformRole: "user" }, after: { platformRole: "admin" } },
    });
  });

  it("won't let admins remove their own admin role", async () => {
    const result = await updateUserRoleAction({ userId: ADMIN, role: "user", reason: "Stepping back" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/your own admin role/);
    expect(sessionServices.profile.updatePlatformRole).not.toHaveBeenCalled();
  });
});

describe("plan actions", () => {
  it("refuse to change the price of a plan Stripe charges", async () => {
    services.subscription.getPlanById.mockResolvedValue({ id: PLAN, name: "Pro", slug: "pro", priceCents: 3900, stripePriceId: "price_1" });
    const result = await updatePlanAction({ planId: PLAN, priceCents: 4900, reason: "New pricing" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Stripe charges/);
    expect(services.subscription.updatePlan).not.toHaveBeenCalled();

    const rename = await updatePlanAction({ planId: PLAN, name: "Pro (2026)", reason: "Clearer name" });
    expect(rename.success).toBe(true);
    expect(services.subscription.updatePlan).toHaveBeenCalledWith(PLAN, { name: "Pro (2026)" });
  });

  it("refuse to delete the starter plan, before touching Stripe", async () => {
    services.subscription.getPlanById.mockResolvedValue({ id: STARTER, name: "Starter", slug: "starter", stripePriceId: "price_free" });
    const result = await deletePlanAction({ planId: STARTER, reason: "Cleaning up" });
    expect(result.success).toBe(false);
    expect(services.stripe.archiveStripeProductAndPrice).not.toHaveBeenCalled();
    expect(services.subscription.deletePlan).not.toHaveBeenCalled();
  });
});

describe("user controls", () => {
  it("signs another user out everywhere and records how many devices and logins ended", async () => {
    const result = await signOutUserEverywhereAction({ userId: OTHER_USER, reason: "Lost laptop" });
    expect(result).toMatchObject({ success: true, revokedDevices: 2, endedLogins: 3 });
    expect(userControls.signOutEverywhere).toHaveBeenCalledWith(OTHER_USER);
    expect(lastAudit()).toMatchObject({
      action: "user.sign_out_everywhere",
      targetLabel: "other@test",
      changes: { after: { revokedDevices: 2, endedLogins: 3 } },
    });
  });

  it("won't sign out, ban or reset the two-factor of the admin doing it", async () => {
    for (const result of [
      await signOutUserEverywhereAction({ userId: ADMIN, reason: "Testing it" }),
      await banUserAction({ userId: ADMIN, duration: "24h", reason: "Testing it" }),
      await resetUserTwoFactorAction({ userId: ADMIN, reason: "Testing it" }),
    ]) {
      expect(result.success).toBe(false);
    }
    expect(userControls.signOutEverywhere).not.toHaveBeenCalled();
    expect(userControls.ban).not.toHaveBeenCalled();
    expect(userControls.resetTwoFactor).not.toHaveBeenCalled();
  });

  it("bans for the chosen time, but not platform admins", async () => {
    const banned = await banUserAction({ userId: OTHER_USER, duration: "7d", reason: "Spam portfolio" });
    expect(banned.success).toBe(true);
    expect(userControls.ban).toHaveBeenCalledWith(OTHER_USER, "7d");
    expect(lastAudit()).toMatchObject({ action: "user.ban", changes: { after: { duration: "7d", bannedUntil: "2026-11-20T00:00:00Z" } } });

    readModel.getUser.mockResolvedValue({ id: OTHER_USER, email: "other@test", platformRole: "admin", bannedUntil: null });
    const admin = await banUserAction({ userId: OTHER_USER, duration: "7d", reason: "Spam portfolio" });
    expect(admin.success).toBe(false);
    expect(admin.error).toMatch(/platform admin role/);

    const badDuration = await banUserAction({ userId: OTHER_USER, duration: "forever", reason: "Spam portfolio" });
    expect(badDuration.success).toBe(false);
  });

  it("lifts a ban only when there is one", async () => {
    const notBanned = await unbanUserAction({ userId: OTHER_USER, reason: "Appeal accepted" });
    expect(notBanned.success).toBe(false);
    expect(userControls.unban).not.toHaveBeenCalled();

    readModel.getUser.mockResolvedValue({ id: OTHER_USER, email: "other@test", platformRole: "user", bannedUntil: "2999-01-01T00:00:00Z" });
    const lifted = await unbanUserAction({ userId: OTHER_USER, reason: "Appeal accepted" });
    expect(lifted.success).toBe(true);
    expect(userControls.unban).toHaveBeenCalledWith(OTHER_USER);
  });

  it("resets another user's two-factor sign-in", async () => {
    const result = await resetUserTwoFactorAction({ userId: OTHER_USER, reason: "Lost phone, identity checked" });
    expect(result).toMatchObject({ success: true, removedFactors: 1 });
    expect(lastAudit()).toMatchObject({ action: "user.reset_two_factor", changes: { before: { mfaEnabled: true } } });
  });
});

describe("searchAdminAction", () => {
  it("searches for platform admins, without writing an audit event", async () => {
    const result = await searchAdminAction("  studio  ");
    expect(result.success).toBe(true);
    expect(readModel.search).toHaveBeenCalledWith("studio");
    expect(result.results?.workspaces).toHaveLength(1);
    expect(record).not.toHaveBeenCalled();
  });

  it("doesn't query for fewer than 2 characters or for non-strings", async () => {
    expect(await searchAdminAction("s")).toEqual({ success: true, results: { workspaces: [], users: [], deliveries: [] } });
    expect(await searchAdminAction({ q: "studio" })).toMatchObject({ success: true });
    expect(readModel.search).not.toHaveBeenCalled();
  });

  it("is refused without the platform-admin check", async () => {
    vi.spyOn(adminContext, "getPlatformAdminServices").mockRejectedValue(new Error("Forbidden: Platform admin privileges required."));
    expect(await searchAdminAction("studio")).toEqual({ success: false, error: "Forbidden: Platform admin privileges required." });
  });
});

describe("suspension", () => {
  it("suspends only after the admin types the workspace's slug, and records it", async () => {
    const wrong = await suspendWorkspaceAction({ workspaceId: WS, confirmSlug: "studio-b", reason: "Stolen films reported" });
    expect(wrong.success).toBe(false);
    expect(wrong.error).toMatch(/studio-a/);
    expect(workspaceControls.suspend).not.toHaveBeenCalled();

    const done = await suspendWorkspaceAction({ workspaceId: WS, confirmSlug: "studio-a", reason: "Stolen films reported" });
    expect(done.success).toBe(true);
    expect(workspaceControls.suspend).toHaveBeenCalledWith(WS, "Stolen films reported", ADMIN);
    expect(lastAudit()).toMatchObject({ action: "workspace.suspend", targetLabel: "Studio A", reason: "Stolen films reported" });
  });

  it("lifts a suspension only when there is one", async () => {
    const notSuspended = await unsuspendWorkspaceAction({ workspaceId: WS, reason: "Report was wrong" });
    expect(notSuspended.success).toBe(false);

    readModel.getWorkspace.mockResolvedValue({ id: WS, brandName: "Studio A", slug: "studio-a", suspendedAt: "2026-11-13T12:00:00Z", suspendedReason: "Stolen films reported" });
    const lifted = await unsuspendWorkspaceAction({ workspaceId: WS, reason: "Report was wrong" });
    expect(lifted.success).toBe(true);
    expect(workspaceControls.unsuspend).toHaveBeenCalledWith(WS);
    expect(lastAudit()).toMatchObject({ action: "workspace.unsuspend", changes: { before: { suspendedReason: "Stolen films reported" } } });
  });
});

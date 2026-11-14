"use server";

import { revalidatePath } from "next/cache";
import { createPlatformAdminAction, normalizeActionError } from "./safe-action";
import { getPlatformAdminServices } from "@/core/admin/context";
import type { AdminSearchResults } from "@/core/admin/types";
import {
  banUserSchema,
  createPlanSchema,
  deletePlanSchema,
  updatePlanSchema,
  updateUserRoleSchema,
  updateWorkspaceFeaturesSchema,
  updateWorkspacePlanSchema,
  userTargetSchema,
  suspendWorkspaceSchema,
  workspaceTargetSchema,
} from "@/lib/validations/admin";
import type { AdminActionContext } from "./safe-action";
import { createScopedLogger } from "@/lib/logger";

/*
 * Platform-admin actions. Each goes through createPlatformAdminAction(): platform admin with a
 * two-factor session, validated input with a reason, rate limited, audited.
 */

const log = createScopedLogger({ actionGroup: "admin" });

/** Admin pages are dynamic; this refreshes whichever one the admin goes back to. */
function refreshAdminPages() {
  revalidatePath("/admin", "layout");
}

function pick<T extends object>(source: T, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, (source as Record<string, unknown>)[key]]));
}

export const updateUserRoleAction = createPlatformAdminAction(
  {
    action: "user.change_role",
    schema: updateUserRoleSchema,
    target: (input) => ({ type: "user", id: input.userId }),
  },
  async (input, ctx) => {
    if (input.userId === ctx.user.id && input.role !== "admin") {
      throw new Error("You can't remove your own admin role. Ask another platform admin to do it.");
    }

    const target = await ctx.readModel.getUser(input.userId);
    if (!target) throw new Error("User not found.");
    ctx.setTargetLabel(target.email);

    if (target.platformRole === input.role) {
      return { platformRole: target.platformRole, changed: false };
    }

    // The prevent_role_escalation trigger only accepts this from a platform admin's own session.
    const profile = await ctx.sessionServices.profile.updatePlatformRole(input.userId, input.role);
    ctx.recordChanges({ before: { platformRole: target.platformRole }, after: { platformRole: profile.platformRole } });
    refreshAdminPages();
    return { platformRole: profile.platformRole, changed: true };
  }
);

export const updateWorkspacePlanAction = createPlatformAdminAction(
  {
    action: "workspace.change_plan",
    schema: updateWorkspacePlanSchema,
    target: (input) => ({ type: "workspace", id: input.workspaceId }),
  },
  async (input, ctx) => {
    const workspace = await ctx.services.workspace.getWorkspaceById(input.workspaceId);
    if (!workspace) throw new Error("Workspace not found.");
    ctx.setTargetLabel(workspace.brandName);

    const current = await ctx.services.subscription.getSubscription(input.workspaceId);
    if (current?.paymentProviderSubId) {
      // The Stripe webhook would overwrite a database-only change on the next event.
      throw new Error(
        "This workspace is billed through Stripe, so a change here wouldn't last. Change the subscription in Stripe."
      );
    }

    const plan = await ctx.services.subscription.getPlanById(input.planId);
    if (!plan) throw new Error("Plan not found.");

    const subscription = await ctx.services.subscription.adminChangeWorkspacePlan(
      input.workspaceId,
      input.planId,
      input.status
    );
    ctx.recordChanges({
      before: current ? { planId: current.planId, status: current.status } : null,
      after: { planId: subscription.planId, planName: plan.name, status: subscription.status },
    });
    refreshAdminPages();
    return { subscription: { id: subscription.id, planId: subscription.planId, status: subscription.status } };
  }
);

export const updateWorkspaceFeaturesAction = createPlatformAdminAction(
  {
    action: "workspace.override_features",
    schema: updateWorkspaceFeaturesSchema,
    target: (input) => ({ type: "workspace", id: input.workspaceId }),
  },
  async (input, ctx) => {
    if (Object.keys(input.set).length === 0 && input.remove.length === 0) {
      throw new Error("Change at least one feature.");
    }

    const workspace = await ctx.services.workspace.getWorkspaceById(input.workspaceId);
    if (!workspace) throw new Error("Workspace not found.");
    ctx.setTargetLabel(workspace.brandName);

    // Merge: the old action replaced the whole set, wiping every other override.
    const before = await ctx.services.subscription.getFeatureOverrides(input.workspaceId);
    const next: Record<string, unknown> = { ...before };
    for (const key of input.remove) delete next[key];
    Object.assign(next, input.set);

    const saved = await ctx.services.subscription.updateWorkspaceFeatures(input.workspaceId, next);
    ctx.recordChanges({ before, after: saved.features });
    refreshAdminPages();
    return { overrides: saved.features };
  }
);

export const createPlanAction = createPlatformAdminAction(
  {
    action: "plan.create",
    schema: createPlanSchema,
    target: (input) => ({ type: "plan", label: input.name }),
  },
  async (input, ctx) => {
    const priceCents = Math.round(input.priceUsd * 100);

    // 1. Its Stripe product and price, so checkout can sell it.
    const { stripePriceId } = await ctx.services.stripe.createStripeProductAndPrice({
      name: input.name,
      priceCents,
      currency: "USD",
      billingInterval: "month",
    });

    // 2. The plan itself.
    const plan = await ctx.services.subscription.createPlan({
      name: input.name,
      slug: input.slug,
      priceCents,
      currency: "USD",
      billingInterval: "month",
      sortOrder: 10,
      stripePriceId,
      features: {
        storage_gb: input.storageGb,
        client_links: input.clientLinks,
        whatsapp_delivery: input.whatsappDelivery,
        portfolio_videos: -1,
        team_seats: 1,
        languages: ["ar", "en"],
        password_protected: true,
        watermark: true,
        branding: true,
        download_notifications: true,
        priority_support: true,
      },
    });

    ctx.recordChanges({
      after: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        priceCents: plan.priceCents,
        currency: plan.currency,
        stripePriceId: plan.stripePriceId,
        features: plan.features,
      },
    });
    refreshAdminPages();
    return { plan };
  }
);

export const updatePlanAction = createPlatformAdminAction(
  {
    action: "plan.update",
    schema: updatePlanSchema,
    target: (input) => ({ type: "plan", id: input.planId }),
  },
  async (input, ctx) => {
    const plan = await ctx.services.subscription.getPlanById(input.planId);
    if (!plan) throw new Error("Plan not found.");
    ctx.setTargetLabel(plan.name);

    const { planId: _planId, reason: _reason, ...changes } = input;
    if (changes.priceCents !== undefined && changes.priceCents !== plan.priceCents && plan.stripePriceId) {
      // Stripe prices can't change; editing ours would show one price and charge another.
      throw new Error(
        "Stripe charges this plan's price, so it can't be changed here. Create a plan with the new price, then archive this one."
      );
    }

    const keys = Object.keys(changes).filter((key) => (changes as Record<string, unknown>)[key] !== undefined);
    if (keys.length === 0) throw new Error("Nothing to change.");

    const updated = await ctx.services.subscription.updatePlan(plan.id, changes);
    ctx.recordChanges({ before: pick(plan, keys), after: pick(updated, keys) });
    refreshAdminPages();
    return { plan: updated };
  }
);

export const deletePlanAction = createPlatformAdminAction(
  {
    action: "plan.delete",
    schema: deletePlanSchema,
    target: (input) => ({ type: "plan", id: input.planId }),
  },
  async (input, ctx) => {
    const plan = await ctx.services.subscription.getPlanById(input.planId);
    if (!plan) throw new Error("Plan not found.");
    ctx.setTargetLabel(plan.name);
    if (plan.slug === "starter") {
      // Checked before Stripe is touched: new workspaces fall back to this plan.
      throw new Error('The "starter" plan can\'t be deleted: workspaces without a subscription use it.');
    }

    // 1. Archive its Stripe product and price, if it has them.
    if (plan.stripePriceId) {
      await ctx.services.stripe.archiveStripeProductAndPrice(plan.stripePriceId).catch((err: unknown) =>
        log.warn({ err, stripePriceId: plan.stripePriceId }, "Stripe archive notice")
      );
    }

    // 2. Archived when someone is subscribed to it, deleted otherwise.
    const result = await ctx.services.subscription.deletePlan(plan.id);
    ctx.recordChanges({
      before: { name: plan.name, slug: plan.slug, isActive: plan.isActive, stripePriceId: plan.stripePriceId },
      after: { result: result.action },
    });
    refreshAdminPages();
    return { action: result.action, message: result.message };
  }
);

// ---------------------------------------------------------------------------
// User controls (B3)
// ---------------------------------------------------------------------------

/** The target user, named in the audit event. */
async function targetUser(ctx: AdminActionContext, userId: string) {
  const target = await ctx.readModel.getUser(userId);
  if (!target) throw new Error("User not found.");
  ctx.setTargetLabel(target.email);
  return target;
}

export const signOutUserEverywhereAction = createPlatformAdminAction(
  {
    action: "user.sign_out_everywhere",
    schema: userTargetSchema,
    target: (input) => ({ type: "user", id: input.userId }),
  },
  async (input, ctx) => {
    if (input.userId === ctx.user.id) {
      throw new Error("To sign yourself out of your other devices, use your own security settings.");
    }
    await targetUser(ctx, input.userId);
    const result = await ctx.userControls.signOutEverywhere(input.userId);
    ctx.recordChanges({ after: result });
    refreshAdminPages();
    return result;
  }
);

export const banUserAction = createPlatformAdminAction(
  {
    action: "user.ban",
    schema: banUserSchema,
    target: (input) => ({ type: "user", id: input.userId }),
  },
  async (input, ctx) => {
    if (input.userId === ctx.user.id) throw new Error("You can't ban yourself.");
    const target = await targetUser(ctx, input.userId);
    if (target.platformRole === "admin") {
      throw new Error("Remove their platform admin role before banning them.");
    }
    const result = await ctx.userControls.ban(input.userId, input.duration);
    ctx.recordChanges({
      before: { bannedUntil: target.bannedUntil },
      after: { bannedUntil: result.bannedUntil, duration: input.duration, revokedDevices: result.revokedDevices, endedLogins: result.endedLogins },
    });
    refreshAdminPages();
    return result;
  }
);

export const unbanUserAction = createPlatformAdminAction(
  {
    action: "user.unban",
    schema: userTargetSchema,
    target: (input) => ({ type: "user", id: input.userId }),
  },
  async (input, ctx) => {
    const target = await targetUser(ctx, input.userId);
    if (!target.bannedUntil || new Date(target.bannedUntil) <= new Date()) {
      throw new Error("This user isn't banned.");
    }
    await ctx.userControls.unban(input.userId);
    ctx.recordChanges({ before: { bannedUntil: target.bannedUntil }, after: { bannedUntil: null } });
    refreshAdminPages();
    return { unbanned: true };
  }
);

export const resetUserTwoFactorAction = createPlatformAdminAction(
  {
    action: "user.reset_two_factor",
    schema: userTargetSchema,
    target: (input) => ({ type: "user", id: input.userId }),
  },
  async (input, ctx) => {
    if (input.userId === ctx.user.id) {
      throw new Error("Change your own two-factor sign-in from your security settings.");
    }
    const target = await targetUser(ctx, input.userId);
    const result = await ctx.userControls.resetTwoFactor(input.userId);
    ctx.recordChanges({ before: { mfaEnabled: target.mfaEnabled }, after: { mfaEnabled: false, ...result } });
    refreshAdminPages();
    return result;
  }
);

// ---------------------------------------------------------------------------
// Search (B6)
// ---------------------------------------------------------------------------

/**
 * The admin panel's ⌘K search. Read-only, so no reason or audit event; still platform admins
 * with a two-factor session only.
 */
export async function searchAdminAction(
  term: unknown
): Promise<
  { success: true; results: AdminSearchResults; error?: undefined } | { success: false; error: string; results?: undefined }
> {
  try {
    const admin = await getPlatformAdminServices();
    const q = typeof term === "string" ? term.trim().slice(0, 100) : "";
    if (q.length < 2) return { success: true, results: { workspaces: [], users: [], deliveries: [] } };
    return { success: true, results: await admin.readModel.search(q) };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err) };
  }
}

// ---------------------------------------------------------------------------
// Suspension (roadmap 5.6)
// ---------------------------------------------------------------------------

export const suspendWorkspaceAction = createPlatformAdminAction(
  {
    action: "workspace.suspend",
    schema: suspendWorkspaceSchema,
    target: (input) => ({ type: "workspace", id: input.workspaceId }),
  },
  async (input, ctx) => {
    const workspace = await ctx.readModel.getWorkspace(input.workspaceId);
    if (!workspace) throw new Error("Workspace not found.");
    ctx.setTargetLabel(workspace.brandName);
    if (input.confirmSlug !== workspace.slug) {
      throw new Error(`Type "${workspace.slug}" to confirm which workspace to suspend.`);
    }
    if (workspace.suspendedAt) throw new Error("This workspace is already suspended.");

    const result = await ctx.workspaceControls.suspend(workspace.id, input.reason, ctx.user.id);
    ctx.recordChanges({ before: { suspendedAt: null }, after: { suspendedAt: result.suspendedAt } });
    refreshAdminPages();
    return result;
  }
);

export const unsuspendWorkspaceAction = createPlatformAdminAction(
  {
    action: "workspace.unsuspend",
    schema: workspaceTargetSchema,
    target: (input) => ({ type: "workspace", id: input.workspaceId }),
  },
  async (input, ctx) => {
    const workspace = await ctx.readModel.getWorkspace(input.workspaceId);
    if (!workspace) throw new Error("Workspace not found.");
    ctx.setTargetLabel(workspace.brandName);
    if (!workspace.suspendedAt) throw new Error("This workspace isn't suspended.");

    await ctx.workspaceControls.unsuspend(workspace.id);
    ctx.recordChanges({
      before: { suspendedAt: workspace.suspendedAt, suspendedReason: workspace.suspendedReason },
      after: { suspendedAt: null },
    });
    refreshAdminPages();
    return { unsuspended: true };
  }
);

"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createPlatformAdminAction, normalizeActionError } from "./safe-action";
import { getPlatformAdminServices } from "@/core/admin/context";
import type { AdminCreatedClient, AdminSearchResults, AdminSetupLinkResult } from "@/core/admin/types";
import { SETUP_LINK_DAYS, setupLinkUrl } from "@/core/security/account-setup";
import { configuredAppOrigin } from "@/lib/app-origin";
import {
  banUserSchema,
  createClientAccountSchema,
  createPlanSchema,
  createYearlyPlanSchema,
  deletePlanSchema,
  savePlanTierSchema,
  updatePlanSchema,
  sendSetupLinkSchema,
  updateUserRoleSchema,
  updateWorkspaceFeaturesSchema,
  updateWorkspacePlanSchema,
  userTargetSchema,
  suspendWorkspaceSchema,
  updateDemoRoomSchema,
  workspaceTargetSchema,
} from "@/lib/validations/admin";
import { shareTokenFromReviewLink } from "@/lib/client-room/demo-room";
import type { AdminActionContext } from "./safe-action";
import { createScopedLogger } from "@/lib/logger";
import { planTier, yearlyPlanSlug, type BillingInterval, type Plan } from "@/core/entities/plan";

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

/** Throws unless paying yearly costs less than twelve monthly payments. */
function assertYearlySaves(monthlyCents: number, yearlyCents: number) {
  if (monthlyCents <= 0) throw new Error("Free plans have no yearly price.");
  if (yearlyCents >= monthlyCents * 12) {
    throw new Error("The yearly price must be less than twelve monthly payments, or paying yearly saves nothing.");
  }
}

/**
 * The Stripe price to sell a plan at a new price. A plan with a Stripe price gets a new price on
 * the same product (its subscribers stay on the old one); one without gets a product and price.
 */
async function stripePriceForNewPrice(
  ctx: AdminActionContext,
  plan: { name: string; stripePriceId?: string | null; currency: string },
  priceCents: number,
  billingInterval: BillingInterval
): Promise<string | null> {
  if (plan.stripePriceId) {
    return ctx.services.stripe.replaceStripePrice({
      oldStripePriceId: plan.stripePriceId,
      priceCents,
      currency: plan.currency,
      billingInterval,
    });
  }
  const { stripePriceId } = await ctx.services.stripe.createStripeProductAndPrice({
    name: billingInterval === "year" ? `${plan.name} (yearly)` : plan.name,
    priceCents,
    currency: plan.currency,
    billingInterval,
  });
  return stripePriceId;
}

/** Creates a monthly plan's yearly twin (`<slug>-yearly`) with its own Stripe price. */
async function createYearlyTwin(ctx: AdminActionContext, monthly: Plan, priceCents: number): Promise<Plan> {
  assertYearlySaves(monthly.priceCents, priceCents);
  const slug = yearlyPlanSlug(monthly.slug);
  if (await ctx.services.subscription.getPlanBySlug(slug)) {
    throw new Error(`${monthly.name} has a yearly price already.`);
  }

  // 1. Its Stripe product and yearly price, so checkout can sell it.
  const { stripePriceId } = await ctx.services.stripe.createStripeProductAndPrice({
    name: `${monthly.name} (yearly)`,
    priceCents,
    currency: monthly.currency,
    billingInterval: "year",
  });

  // 2. The yearly plan, with the monthly plan's features so both grant the same.
  return ctx.services.subscription.createPlan({
    name: monthly.name,
    slug,
    priceCents,
    currency: monthly.currency,
    billingInterval: "year",
    sortOrder: monthly.sortOrder,
    stripePriceId,
    features: monthly.features,
  });
}

function planSnapshot(plan: Plan) {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    priceCents: plan.priceCents,
    currency: plan.currency,
    billingInterval: plan.billingInterval,
    sortOrder: plan.sortOrder,
    isActive: plan.isActive,
    stripePriceId: plan.stripePriceId,
  };
}

/** Creates a tier: its monthly plan with every feature, and its yearly twin when given a yearly price. */
export const createPlanAction = createPlatformAdminAction(
  {
    action: "plan.create",
    schema: createPlanSchema,
    target: (input) => ({ type: "plan", label: input.name }),
  },
  async (input, ctx) => {
    const priceCents = Math.round(input.priceUsd * 100);
    const yearlyCents = input.yearlyPriceUsd === null ? null : Math.round(input.yearlyPriceUsd * 100);
    // Checked before Stripe is touched.
    if (yearlyCents !== null) assertYearlySaves(priceCents, yearlyCents);
    if (await ctx.services.subscription.getPlanBySlug(input.slug)) {
      throw new Error(`A plan with slug "${input.slug}" already exists.`);
    }

    // 1. Its Stripe product and price, so checkout can sell it. Free plans need none.
    const stripePriceId =
      priceCents > 0
        ? (
            await ctx.services.stripe.createStripeProductAndPrice({
              name: input.name,
              priceCents,
              currency: "USD",
              billingInterval: "month",
            })
          ).stripePriceId
        : null;

    // 2. The plan itself.
    const plan = await ctx.services.subscription.createPlan({
      name: input.name,
      slug: input.slug,
      priceCents,
      currency: "USD",
      billingInterval: "month",
      sortOrder: input.sortOrder,
      stripePriceId,
      features: input.features,
    });
    const plans = [plan];
    if (!input.isActive) plans[0] = await ctx.services.subscription.updatePlan(plan.id, { isActive: false });

    // 3. Its yearly twin.
    if (yearlyCents !== null) {
      let yearly = await createYearlyTwin(ctx, plans[0], yearlyCents);
      if (!input.isActive) yearly = await ctx.services.subscription.updatePlan(yearly.id, { isActive: false });
      plans.push(yearly);
    }

    ctx.recordChanges({ after: { plans: plans.map(planSnapshot), features: plan.features } });
    refreshAdminPages();
    return { plans };
  }
);

/**
 * Sells a paid monthly plan yearly too: a yearly Stripe price plus the plan's yearly twin
 * (`<slug>-yearly`, same name, order and features). Checkout and the webhooks then handle it
 * like any other plan, and the pricing pages show a monthly/yearly toggle.
 */
export const createYearlyPlanAction = createPlatformAdminAction(
  {
    action: "plan.add_yearly",
    schema: createYearlyPlanSchema,
    target: (input) => ({ type: "plan", id: input.planId }),
  },
  async (input, ctx) => {
    const monthly = await ctx.services.subscription.getPlanById(input.planId);
    if (!monthly) throw new Error("Plan not found.");
    ctx.setTargetLabel(monthly.name);
    if (monthly.billingInterval === "year") throw new Error("This plan is billed yearly already.");

    const plan = await createYearlyTwin(ctx, monthly, Math.round(input.yearlyPriceUsd * 100));
    ctx.recordChanges({ after: planSnapshot(plan) });
    refreshAdminPages();
    return { plan };
  }
);

/**
 * Saves a whole tier from the plan editor: name, order, visibility, features, the monthly price
 * and the yearly price (added, changed, or stopped). Both plans of the tier get the same name,
 * order, visibility and features. A changed price gets a new Stripe price: existing subscribers
 * keep paying what they signed up for, new checkouts pay the new price.
 */
export const savePlanTierAction = createPlatformAdminAction(
  {
    action: "plan.save_tier",
    schema: savePlanTierSchema,
    target: (input) => ({ type: "plan", id: input.planId }),
  },
  async (input, ctx) => {
    const monthly = await ctx.services.subscription.getPlanById(input.planId);
    if (!monthly) throw new Error("Plan not found.");
    ctx.setTargetLabel(monthly.name);
    if (monthly.billingInterval === "year") {
      throw new Error("Open the tier's monthly plan: its yearly price is edited there.");
    }

    const twin = await ctx.services.subscription.getPlanBySlug(yearlyPlanSlug(monthly.slug));
    const yearly = twin && twin.id !== monthly.id && twin.billingInterval === "year" ? twin : null;

    const priceCents = Math.round(input.priceUsd * 100);
    const yearlyCents = input.yearlyPriceUsd === null ? null : Math.round(input.yearlyPriceUsd * 100);

    // Every check before Stripe is touched, so a refused save changes nothing.
    if (monthly.slug === "starter" && priceCents > 0) {
      throw new Error("Starter is the free plan workspaces fall back to, so it stays free.");
    }
    if (monthly.priceCents > 0 && priceCents === 0) {
      throw new Error("A paid plan can't become free: its subscribers are billed in Stripe. Create a free plan instead.");
    }
    if (yearlyCents !== null) assertYearlySaves(priceCents, yearlyCents);

    const shared: Partial<Plan> = {
      name: input.name,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      features: input.features,
    };

    // 1. The monthly plan, with a new Stripe price when its price changed.
    const monthlyChanges: Partial<Plan> = { ...shared };
    if (priceCents !== monthly.priceCents) {
      monthlyChanges.priceCents = priceCents;
      monthlyChanges.stripePriceId = await stripePriceForNewPrice(
        ctx,
        { ...monthly, name: input.name },
        priceCents,
        "month"
      );
    }
    const savedMonthly = await ctx.services.subscription.updatePlan(monthly.id, monthlyChanges);

    // 2. The yearly plan: added, changed, or no longer sold.
    let savedYearly: Plan | null = null;
    let yearlyOutcome: "none" | "added" | "updated" | "archived" | "deleted" = "none";
    if (yearly && yearlyCents === null) {
      if (yearly.isActive) {
        if (yearly.stripePriceId) {
          await ctx.services.stripe.archiveStripeProductAndPrice(yearly.stripePriceId).catch((err: unknown) =>
            log.warn({ err, stripePriceId: yearly.stripePriceId }, "Stripe archive notice")
          );
        }
        // Archived when someone pays yearly, deleted otherwise.
        yearlyOutcome = (await ctx.services.subscription.deletePlan(yearly.id)).action;
      } else {
        // Not sold already: keep it in step for its remaining subscribers.
        savedYearly = await ctx.services.subscription.updatePlan(yearly.id, { ...shared, isActive: false });
        yearlyOutcome = "updated";
      }
    } else if (yearly && yearlyCents !== null) {
      const yearlyChanges: Partial<Plan> = { ...shared };
      if (yearlyCents !== yearly.priceCents) {
        yearlyChanges.priceCents = yearlyCents;
        yearlyChanges.stripePriceId = await stripePriceForNewPrice(
          ctx,
          { ...yearly, name: input.name },
          yearlyCents,
          "year"
        );
      }
      savedYearly = await ctx.services.subscription.updatePlan(yearly.id, yearlyChanges);
      yearlyOutcome = "updated";
    } else if (yearlyCents !== null) {
      savedYearly = await createYearlyTwin(ctx, savedMonthly, yearlyCents);
      if (!input.isActive) savedYearly = await ctx.services.subscription.updatePlan(savedYearly.id, { isActive: false });
      yearlyOutcome = "added";
    }

    ctx.recordChanges({
      before: {
        monthly: planSnapshot(monthly),
        yearly: yearly ? planSnapshot(yearly) : null,
        features: monthly.features,
      },
      after: {
        monthly: planSnapshot(savedMonthly),
        yearly: savedYearly ? planSnapshot(savedYearly) : null,
        yearlyOutcome,
        features: savedMonthly.features,
      },
    });
    refreshAdminPages();
    return { monthly: savedMonthly, yearly: savedYearly, yearlyOutcome };
  }
);

/** What a tier's monthly and yearly plans share, so editing one edits both. */
const SHARED_PLAN_FIELDS = ["name", "sortOrder", "features"];

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

    // Keep the other half of a monthly/yearly pair in step: same name, order and features.
    let syncedPlan: string | null = null;
    const sharedKeys = keys.filter((key) => SHARED_PLAN_FIELDS.includes(key));
    if (sharedKeys.length > 0) {
      const twinSlug = plan.billingInterval === "year" ? planTier(plan.slug) : yearlyPlanSlug(plan.slug);
      const twin = await ctx.services.subscription.getPlanBySlug(twinSlug);
      if (twin && twin.id !== plan.id && twin.billingInterval !== plan.billingInterval) {
        await ctx.services.subscription.updatePlan(twin.id, pick(changes, sharedKeys));
        syncedPlan = twin.slug;
      }
    }

    ctx.recordChanges({
      before: pick(plan, keys),
      after: { ...pick(updated, keys), ...(syncedPlan ? { alsoUpdated: syncedPlan } : {}) },
    });
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
// Client accounts: accounts the team makes for people it's in touch with
// ---------------------------------------------------------------------------

/** The app's public address for links in emails: NEXT_PUBLIC_APP_URL, else this request's host. */
async function appOriginForLinks(): Promise<string> {
  const configured = configuredAppOrigin();
  if (configured) return configured;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const protocol = headerList.get("x-forwarded-proto") || (local ? "http" : "https");
  return `${protocol}://${host}`;
}

/** Emails a setup link. A failure is returned, not thrown: the admin can still copy the link. */
async function emailSetupLink(
  ctx: AdminActionContext,
  params: { workspaceId: string | null; email: string; fullName: string; setupLink: string }
): Promise<{ sent: boolean; error: string | null }> {
  if (!params.workspaceId) {
    return { sent: false, error: "They have no workspace to log the email under. Copy the link and send it yourself." };
  }
  try {
    const result = await ctx.services.notification.sendAccountSetupEmail({
      workspaceId: params.workspaceId,
      recipientEmail: params.email,
      fullName: params.fullName,
      setupLink: params.setupLink,
      linkDays: SETUP_LINK_DAYS,
    });
    return result.success ? { sent: true, error: null } : { sent: false, error: result.error || "The email provider refused it." };
  } catch (err: unknown) {
    log.warn({ err }, "Couldn't send the account setup email");
    return { sent: false, error: normalizeActionError(err, "The email couldn't be sent.") };
  }
}

function setupEmailOutcome(requested: boolean, sent: boolean): "sent" | "failed" | "not requested" {
  if (!requested) return "not requested";
  return sent ? "sent" : "failed";
}

/**
 * "New client" on the users page: an account for someone the team is in touch with. It has no
 * password; the person chooses one with the setup link (core/security/account-setup.ts), which is
 * emailed, or shown so the admin can send it another way. Only the link's expiry is audited.
 */
export const createClientAccountAction = createPlatformAdminAction(
  {
    action: "user.create",
    schema: createClientAccountSchema,
    target: (input) => ({ type: "user", label: input.email }),
  },
  async (input, ctx): Promise<AdminCreatedClient> => {
    // 1. The account. The sign-up trigger gives it a profile, a workspace and a Free trial.
    const account = await ctx.userControls.createClientAccount({ email: input.email, fullName: input.fullName });
    ctx.setTargetId(account.userId);

    // 2. The workspace, under the studio's name. Nothing links to it yet, so its address can change.
    // From here on the account exists: problems are reported, so the admin doesn't make it twice.
    let workspace = await ctx.services.workspace.getWorkspaceByOwnerId(account.userId).catch((err: unknown) => {
      log.warn({ err, userId: account.userId }, "Couldn't find the new client's workspace");
      return null;
    });
    let workspaceWarning: string | null = null;
    if (!workspace) {
      workspaceWarning = "Their workspace couldn't be found. They get one when they first sign in.";
    } else if (input.studioName && input.studioName !== workspace.brandName) {
      try {
        workspace = await ctx.services.workspace.renameNewWorkspace(workspace.id, input.studioName);
      } catch (err: unknown) {
        log.warn({ err, workspaceId: workspace.id }, "Couldn't rename the new client's workspace");
        workspaceWarning = `The studio name couldn't be applied, so the workspace is called "${workspace.brandName}".`;
      }
    }

    // 3. The setup link, emailed unless the admin sends it themselves.
    const setupLink = setupLinkUrl(await appOriginForLinks(), account.token);
    const email = input.sendEmail
      ? await emailSetupLink(ctx, { workspaceId: workspace?.id ?? null, email: input.email, fullName: input.fullName, setupLink })
      : { sent: false, error: null };

    ctx.recordChanges({
      after: {
        email: input.email,
        fullName: input.fullName,
        workspaceId: workspace?.id ?? null,
        workspaceName: workspace?.brandName ?? null,
        workspaceSlug: workspace?.slug ?? null,
        setupLinkExpiresAt: account.expiresAt,
        setupEmail: setupEmailOutcome(input.sendEmail, email.sent),
      },
    });
    refreshAdminPages();
    return {
      userId: account.userId,
      email: input.email,
      workspace: workspace ? { id: workspace.id, name: workspace.brandName, slug: workspace.slug } : null,
      workspaceWarning,
      setupLink,
      setupLinkExpiresAt: account.expiresAt,
      emailSent: email.sent,
      emailError: email.error,
    };
  }
);

/**
 * A new setup link, for an account nobody has signed in to yet (the first link expired, or the
 * email went astray). The old link stops working.
 */
export const sendSetupLinkAction = createPlatformAdminAction(
  {
    action: "user.send_setup_link",
    schema: sendSetupLinkSchema,
    target: (input) => ({ type: "user", id: input.userId }),
  },
  async (input, ctx): Promise<AdminSetupLinkResult> => {
    const target = await targetUser(ctx, input.userId);
    if (target.lastSignInAt) {
      throw new Error(
        "They've signed in before, so a setup link won't work. If they've forgotten their password, they can reset it from the sign-in page."
      );
    }
    if (target.bannedUntil && new Date(target.bannedUntil) > new Date()) {
      throw new Error("Lift their ban before sending a setup link.");
    }
    if (!target.email) throw new Error("This account has no email address.");

    const link = await ctx.userControls.issueSetupLink(target.id);
    const setupLink = setupLinkUrl(await appOriginForLinks(), link.token);
    const email = input.sendEmail
      ? await emailSetupLink(ctx, {
          workspaceId: target.primaryWorkspace?.id ?? null,
          email: target.email,
          fullName: target.fullName ?? "",
          setupLink,
        })
      : { sent: false, error: null };

    ctx.recordChanges({
      after: { setupLinkExpiresAt: link.expiresAt, setupEmail: setupEmailOutcome(input.sendEmail, email.sent) },
    });
    refreshAdminPages();
    return { setupLink, setupLinkExpiresAt: link.expiresAt, emailSent: email.sent, emailError: email.error };
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

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

/**
 * The demo room: which delivery /demo shows (found from its review link), and whether the landing
 * page links to it. Removing the delivery also takes the link off the landing page.
 */
export const updateDemoRoomAction = createPlatformAdminAction(
  {
    action: "site.update_demo_room",
    schema: updateDemoRoomSchema,
    target: () => ({ type: "site_setting", id: "demo_room", label: "Demo room" }),
  },
  async (input, ctx) => {
    if (input.reviewLink === undefined && input.showOnLanding === undefined) {
      throw new Error("Change at least one thing.");
    }
    const before = await ctx.services.siteSettings.get("demo_room");

    let deliveryId = before.deliveryId;
    if (input.reviewLink === "") {
      deliveryId = null;
    } else if (input.reviewLink !== undefined) {
      const shareToken = shareTokenFromReviewLink(input.reviewLink);
      if (!shareToken) throw new Error("Paste the delivery's review link, the one with /deliver/ in it.");
      const delivery = await ctx.services.delivery.getDeliveryByShareToken(shareToken, { allowExpired: true });
      if (!delivery) throw new Error("No delivery has this review link. Copy it again from the delivery's share dialog.");
      deliveryId = delivery.id;
      ctx.setTargetLabel(`Demo room: ${delivery.title}`);
    }

    if (input.showOnLanding && !deliveryId) throw new Error("Choose the demo delivery first.");
    const showOnLanding = deliveryId ? (input.showOnLanding ?? before.showOnLanding) : false;

    const saved = await ctx.services.siteSettings.set("demo_room", { deliveryId, showOnLanding }, ctx.user.id);
    ctx.recordChanges({ before, after: saved.value });
    refreshAdminPages();
    revalidatePath("/");
    revalidatePath("/demo");
    return { demoRoom: saved.value };
  }
);

"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import { hasMinRole, requireDeliveryAccess, requireWorkspaceMember } from "@/core/security/guards";
import type { ShareLink, ShareLinkEvent } from "@/core/entities/share-link";
import { toShareLinkView as toView, type ShareLinkView } from "@/lib/share-links/view";
import { hashDeliveryPasscode } from "@/lib/security/passcode";
import { isGeneratedPassphrase, sealPasscode, unsealPasscode } from "@/lib/security/passcode-seal";
import {
  EXTENDED_LINK_EXPIRY_MESSAGE,
  STANDARD_LINK_DAYS,
  isExtendedLinkExpiry,
  isSameLinkExpiry,
  linkExpiryProblem,
} from "@/lib/security/link-expiry";
import {
  safeValidate,
  shareLinkBulkActionSchema,
  shareLinkSettingsSchema,
  updateShareLinkSchema,
  type ShareLinkSettingsInput,
  type UpdateShareLinkInput,
} from "@/lib/validations";
import { normalizeActionError } from "./safe-action";

/**
 * The studio's share links: a delivery's links (Links panel) and the workspace's (Links page).
 * Members can see them; admins and owners create, change, turn off and delete them, as the
 * database's row-level security also requires. Writes go through the service role after these
 * checks (core/services/share-link.service.ts). Plan rules: plans/share-links-manager-plan-2026-11-16.md §5.
 */

type Failure = { success: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_INSTALLED = "Managing several links isn't switched on yet. Please try again later.";
const DAY_MS = 24 * 60 * 60 * 1000;

function fail(err: unknown, fallback: string): Failure {
  return { success: false, error: normalizeActionError(err, fallback) };
}

function revalidateLinks() {
  revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
  revalidatePath("/[workspaceSlug]/links", "page");
}

type StudioServices = Awaited<ReturnType<typeof getServerServices>>;

/** The link and its delivery, for an admin or owner of the delivery's workspace. */
async function adminLink(linkId: string) {
  if (!UUID.test(String(linkId ?? ""))) throw new Error("Link not found.");
  const services = await getServerServices();
  const link = await services.shareLink.findById(linkId);
  if (!link) throw new Error("Link not found.");
  const access = await requireDeliveryAccess(link.deliveryId, "admin");
  return { ...access, link };
}

/** Refuses another link once the delivery has as many as the plan allows (revoked ones don't count). */
async function checkLinkLimit(services: StudioServices, workspaceId: string, deliveryId: string): Promise<string | null> {
  const limit = await services.subscription.getShareLinksPerDeliveryLimit(workspaceId);
  if (limit === -1) return null;
  const used = await services.shareLink.countUnrevoked(deliveryId);
  if (used < limit) return null;
  return limit === 1
    ? "Your plan includes one link per delivery. Upgrade to give each person their own link."
    : `Your plan includes ${limit} links per delivery. Turn off or delete one, or upgrade for more.`;
}

/** The plan's rules for what's being set (only what changes is checked: links keep what they have). */
async function checkPlanRules(
  services: StudioServices,
  workspaceId: string,
  next: { passcode?: string | null; expiresAt?: string | null; notifyOnDownload?: boolean; notifyOnOpen?: boolean },
  current?: ShareLink
): Promise<string | null> {
  if (next.passcode && !(await services.subscription.isPasswordProtectionAllowed(workspaceId))) {
    return "Passcode protection is available on Pro and Studio plans. Please upgrade your subscription.";
  }
  // A new link's expiry is always checked; an existing link's only when it changes.
  if (next.expiresAt !== undefined && (!current || !isSameLinkExpiry(next.expiresAt, current.expiresAt))) {
    const problem = linkExpiryProblem(next.expiresAt);
    if (problem) return problem;
    if (isExtendedLinkExpiry(next.expiresAt) && !(await services.subscription.isExtendedLinkExpiryAllowed(workspaceId))) {
      return EXTENDED_LINK_EXPIRY_MESSAGE;
    }
  }
  const turnsOnAlerts =
    (next.notifyOnDownload === true && !current?.notifyOnDownload) || (next.notifyOnOpen === true && !current?.notifyOnOpen);
  if (turnsOnAlerts && !(await services.subscription.isDownloadNotificationAllowed(workspaceId))) {
    return "Download and first-open alerts are available on Pro and Studio plans. Please upgrade your subscription.";
  }
  return null;
}

/** The stored form of a passcode: always hashed; a generated one is also sealed so it can be shown again. */
async function passcodeColumns(passcode: string | null | undefined) {
  if (passcode === undefined) return {};
  const clean = (passcode ?? "").trim();
  if (!clean) return { passcodeHash: null, passcodeSealed: null };
  let sealed: string | null = null;
  if (isGeneratedPassphrase(clean)) {
    try {
      sealed = sealPasscode(clean);
    } catch {
      sealed = null;
    }
  }
  return { passcodeHash: await hashDeliveryPasscode(clean), passcodeSealed: sealed };
}

export async function listDeliveryShareLinksAction(deliveryId: string): Promise<
  | {
      success: true;
      installed: boolean;
      links: ShareLinkView[];
      /** Links per delivery on the plan, -1 for unlimited. */
      limit: number;
      canManage: boolean;
    }
  | Failure
> {
  try {
    const { services, delivery, role } = await requireDeliveryAccess(String(deliveryId ?? ""), "viewer");
    const [installed, limit] = await Promise.all([
      services.shareLink.isInstalled(),
      services.subscription.getShareLinksPerDeliveryLimit(delivery.workspaceId),
    ]);
    const canManage = hasMinRole(role, "admin");
    if (!installed) return { success: true, installed, links: [], limit, canManage };
    const links = await services.shareLink.listForDelivery(delivery.id);
    return { success: true, installed, links: links.map(toView), limit, canManage };
  } catch (err) {
    return fail(err, "Couldn't load this delivery's links.");
  }
}

export async function createShareLinkAction(
  deliveryId: string,
  input: ShareLinkSettingsInput
): Promise<{ success: true; link: ShareLinkView; passcode: string | null } | Failure> {
  try {
    const validated = safeValidate(shareLinkSettingsSchema, input);
    if (!validated.success) return { success: false, error: validated.error };
    const settings = validated.data;

    const { services, delivery, user } = await requireDeliveryAccess(String(deliveryId ?? ""), "admin");
    if (!(await services.shareLink.isInstalled())) return { success: false, error: NOT_INSTALLED };

    const problem =
      (await checkLinkLimit(services, delivery.workspaceId, delivery.id)) ??
      (await checkPlanRules(services, delivery.workspaceId, settings));
    if (problem) return { success: false, error: problem };

    const passcode = settings.passcode?.trim() || null;
    const link = await services.shareLink.create({
      workspaceId: delivery.workspaceId,
      deliveryId: delivery.id,
      label: settings.label,
      recipientName: settings.recipientName,
      recipientEmail: settings.recipientEmail,
      expiresAt: settings.expiresAt,
      canComment: settings.canComment,
      canApprove: settings.canApprove,
      canDownload: settings.canDownload,
      notifyOnOpen: settings.notifyOnOpen,
      notifyOnDownload: settings.notifyOnDownload,
      notifyOnComment: settings.notifyOnComment,
      createdBy: user.id,
      ...(await passcodeColumns(passcode)),
    });

    revalidateLinks();
    // The passcode in plain text, this once, so the studio can copy it right away.
    return { success: true, link: toView(link), passcode };
  } catch (err) {
    return fail(err, "Couldn't create the link.");
  }
}

export async function updateShareLinkAction(
  linkId: string,
  input: UpdateShareLinkInput
): Promise<{ success: true; link: ShareLinkView; passcode: string | null } | Failure> {
  try {
    const validated = safeValidate(updateShareLinkSchema, input);
    if (!validated.success) return { success: false, error: validated.error };
    const patch = validated.data;

    const { services, delivery, link } = await adminLink(linkId);
    const problem = await checkPlanRules(services, delivery.workspaceId, patch, link);
    if (problem) return { success: false, error: problem };

    const passcode = patch.passcode === undefined ? undefined : patch.passcode?.trim() || null;
    const updated = await services.shareLink.update(link, {
      label: patch.label,
      recipientName: patch.recipientName,
      recipientEmail: patch.recipientEmail,
      expiresAt: patch.expiresAt,
      canComment: patch.canComment,
      canApprove: patch.canApprove,
      canDownload: patch.canDownload,
      notifyOnOpen: patch.notifyOnOpen,
      notifyOnDownload: patch.notifyOnDownload,
      notifyOnComment: patch.notifyOnComment,
      ...(await passcodeColumns(passcode)),
    });

    revalidateLinks();
    return { success: true, link: toView(updated), passcode: passcode ?? null };
  } catch (err) {
    return fail(err, "Couldn't save the link.");
  }
}

/** Turns a link off: its URL stops working at once. Its history stays. Not the main link. */
export async function revokeShareLinkAction(linkId: string): Promise<{ success: true; link: ShareLinkView } | Failure> {
  try {
    const { services, link } = await adminLink(linkId);
    const updated = await services.shareLink.revoke(link);
    revalidateLinks();
    return { success: true, link: toView(updated) };
  } catch (err) {
    return fail(err, "Couldn't turn the link off.");
  }
}

/** Turns a link back on, if the plan has room for it. */
export async function restoreShareLinkAction(linkId: string): Promise<{ success: true; link: ShareLinkView } | Failure> {
  try {
    const { services, delivery, link } = await adminLink(linkId);
    if (!link.revokedAt) return { success: true, link: toView(link) };
    const problem = await checkLinkLimit(services, delivery.workspaceId, delivery.id);
    if (problem) return { success: false, error: problem };
    const updated = await services.shareLink.restore(link);
    revalidateLinks();
    return { success: true, link: toView(updated) };
  } catch (err) {
    return fail(err, "Couldn't turn the link back on.");
  }
}

export async function deleteShareLinkAction(linkId: string): Promise<{ success: true } | Failure> {
  try {
    const { services, link } = await adminLink(linkId);
    await services.shareLink.remove(link);
    revalidateLinks();
    return { success: true };
  } catch (err) {
    return fail(err, "Couldn't delete the link.");
  }
}

/** A new URL for the link: everyone with the old one loses access. */
export async function regenerateShareLinkTokenAction(
  linkId: string
): Promise<{ success: true; link: ShareLinkView } | Failure> {
  try {
    const { services, link } = await adminLink(linkId);
    const updated = await services.shareLink.regenerateToken(link);
    revalidateLinks();
    return { success: true, link: toView(updated) };
  } catch (err) {
    return fail(err, "Couldn't make a new URL for the link.");
  }
}

/** Makes the link the delivery's main link (emails, WhatsApp and copy buttons use it). */
export async function makePrimaryShareLinkAction(linkId: string): Promise<{ success: true } | Failure> {
  try {
    const { services, link } = await adminLink(linkId);
    await services.shareLink.makePrimary(link);
    revalidateLinks();
    return { success: true };
  } catch (err) {
    return fail(err, "Couldn't make this the main link.");
  }
}

/** A new link with the same settings and passcode, and its own URL. */
export async function duplicateShareLinkAction(
  linkId: string
): Promise<{ success: true; link: ShareLinkView } | Failure> {
  try {
    const { services, delivery, link, user } = await adminLink(linkId);
    const problem = await checkLinkLimit(services, delivery.workspaceId, delivery.id);
    if (problem) return { success: false, error: problem };

    // The copy keeps the original's expiry while it's valid and the plan allows it; otherwise it
    // gets the standard 30 days every plan allows.
    const standard = new Date(Date.now() + STANDARD_LINK_DAYS * DAY_MS).toISOString();
    let expiresAt = link.expiresAt;
    if (expiresAt !== null && linkExpiryProblem(expiresAt)) expiresAt = standard;
    if (isExtendedLinkExpiry(expiresAt) && !(await services.subscription.isExtendedLinkExpiryAllowed(delivery.workspaceId))) {
      expiresAt = standard;
    }

    const copy = await services.shareLink.create({
      workspaceId: delivery.workspaceId,
      deliveryId: delivery.id,
      label: `${link.label} (copy)`.slice(0, 80),
      recipientName: null,
      recipientEmail: null,
      passcodeHash: link.passcodeHash,
      passcodeSealed: link.passcodeSealed,
      expiresAt,
      canComment: link.canComment,
      canApprove: link.canApprove,
      canDownload: link.canDownload,
      notifyOnOpen: link.notifyOnOpen,
      notifyOnDownload: link.notifyOnDownload,
      notifyOnComment: link.notifyOnComment,
      createdBy: user.id,
    });
    revalidateLinks();
    return { success: true, link: toView(copy) };
  } catch (err) {
    return fail(err, "Couldn't copy the link.");
  }
}

/** A generated passcode, shown again. Typed passcodes are only hashed, so they can't be. */
export async function revealShareLinkPasscodeAction(linkId: string): Promise<{ success: true; passcode: string } | Failure> {
  try {
    const { link } = await adminLink(linkId);
    const passcode = link.passcodeHash ? unsealPasscode(link.passcodeSealed) : null;
    if (!passcode) {
      return {
        success: false,
        error: "This passcode can't be shown again: only generated passcodes are kept. Set a new one to share it.",
      };
    }
    return { success: true, passcode };
  } catch (err) {
    return fail(err, "Couldn't show the passcode.");
  }
}

/** What happened through a link lately (opens, unlocks, downloads, comments, approvals). Members. */
export async function listShareLinkActivityAction(
  linkId: string
): Promise<{ success: true; events: ShareLinkEvent[] } | Failure> {
  try {
    if (!UUID.test(String(linkId ?? ""))) return { success: false, error: "Link not found." };
    const services = await getServerServices();
    const link = await services.shareLink.findById(linkId);
    if (!link) return { success: false, error: "Link not found." };
    await requireDeliveryAccess(link.deliveryId, "viewer");
    return { success: true, events: await services.shareLink.listEvents(link.id, 50) };
  } catch (err) {
    return fail(err, "Couldn't load the link's activity.");
  }
}

/**
 * The Links page's bulk actions, on links of one workspace: turn off (not main links), extend by
 * 7 days (within what the plan allows; links that never expire stay that way) or downloads off.
 */
export async function bulkUpdateShareLinksAction(
  workspaceSlug: string,
  input: { linkIds: string[]; action: "revoke" | "extend" | "downloads_off" }
): Promise<{ success: true; changed: number } | Failure> {
  try {
    const validated = safeValidate(shareLinkBulkActionSchema, input);
    if (!validated.success) return { success: false, error: validated.error };
    const { linkIds, action } = validated.data;

    const services = await getServerServices();
    const workspace = await services.workspace.getWorkspaceBySlug(String(workspaceSlug ?? ""));
    if (!workspace) return { success: false, error: "Workspace not found." };
    await requireWorkspaceMember(workspace.id, "admin");

    const wanted = new Set(linkIds);
    const links = (await services.shareLink.listForWorkspace(workspace.id)).filter((link) => wanted.has(link.id));
    let changed = 0;

    if (action === "revoke") {
      changed = await services.shareLink.updateMany(workspace.id, links.filter((link) => !link.revokedAt), {
        revokedAt: new Date().toISOString(),
      });
    } else if (action === "downloads_off") {
      changed = await services.shareLink.updateMany(workspace.id, links.filter((link) => link.canDownload), {
        canDownload: false,
      });
    } else {
      const now = Date.now();
      const extended = await services.subscription.isExtendedLinkExpiryAllowed(workspace.id);
      for (const link of links) {
        if (!link.expiresAt || link.revokedAt) continue;
        const current = new Date(link.expiresAt).getTime();
        let next = Math.max(now, current) + 7 * DAY_MS;
        if (!extended) next = Math.min(next, now + STANDARD_LINK_DAYS * DAY_MS);
        if (next <= current) continue;
        await services.shareLink.update(link, { expiresAt: new Date(next).toISOString() });
        changed += 1;
      }
    }

    revalidateLinks();
    return { success: true, changed };
  } catch (err) {
    return fail(err, "Couldn't update those links.");
  }
}

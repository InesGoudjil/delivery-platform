"use server";

import { revalidatePath } from "next/cache";
import type { Delivery } from "@/core/entities/delivery";
import { checkRateLimit, getClientIp, RATELIMIT_POLICIES } from "@/lib/upstash";
import { resolveRequestOrigin, getApprovalNotificationEmails } from "./helpers";
import { resolveDeliveryActor, type DeliveryActor, type DeliveryRefInput } from "./room-access";
import { normalizeActionError } from "../safe-action";
import { runAfterResponse } from "@/lib/after-response";

/**
 * Approvals, from the client room (`{ shareToken }`, guest or member) or the studio
 * (a delivery id, members with at least editor). Only files of that delivery change.
 */

type DeliveryRef = DeliveryRefInput | string;

/** What the browser needs back. Guests never see the passcode hash, share token or Silo data. */
function approvalState(delivery: Delivery) {
  return {
    id: delivery.id,
    status: delivery.status,
    approvedAt: delivery.approvedAt ?? null,
    approvedByName: delivery.approvedByName ?? null,
  };
}

function cleanName(name: string | undefined, fallback: string): string {
  const trimmed = (name || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 80);
  return trimmed || fallback;
}

async function limitGuest(actor: DeliveryActor): Promise<string | null> {
  if (actor.kind !== "guest") return null;
  const result = await checkRateLimit({
    policy: RATELIMIT_POLICIES.deliveryApproval,
    identifier: [await getClientIp(), actor.delivery.id],
  });
  return result.success ? null : result.error || "Too many requests.";
}

/** A client approval also alerts the studio on WhatsApp (when it has that turned on). */
function alertStudioOnWhatsApp(actor: DeliveryActor, approvedByName: string, origin: string) {
  if (actor.kind !== "guest") return;
  runAfterResponse("whatsapp:cut-approved", () =>
    actor.adminServices.whatsapp.notifyCutApproved({ deliveryId: actor.delivery.id, approvedByName, origin })
  );
}

function revalidate(delivery: Delivery) {
  revalidatePath(`/deliver/${delivery.shareToken}`);
  revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
  revalidatePath("/[workspaceSlug]/deliveries", "page");
}

export async function approveCutAction(ref: DeliveryRef, approvedByName?: string) {
  try {
    const actor = await resolveDeliveryActor(ref, "approve");
    const limited = await limitGuest(actor);
    if (limited) return { error: limited };

    const origin = await resolveRequestOrigin();
    const notifyEmails = await getApprovalNotificationEmails(actor.adminServices, actor.delivery.workspaceId);
    const name = cleanName(approvedByName, "Client");
    const updated = await actor.services.delivery.approveCut(actor.delivery, name, {
      origin,
      notifyEmails,
    });
    alertStudioOnWhatsApp(actor, name, origin);

    revalidate(updated);
    const state = approvalState(updated);
    return { success: true, delivery: state, project: state };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to approve cut.") };
  }
}

export async function toggleAssetApprovalAction(ref: DeliveryRef, assetId: string, isApproved: boolean) {
  try {
    const actor = await resolveDeliveryActor(ref, "approve");
    const limited = await limitGuest(actor);
    if (limited) return { error: limited };

    const asset = await actor.services.delivery.toggleAssetApproval(actor.delivery, assetId, Boolean(isApproved));
    const updated = (await actor.services.delivery.getDeliveryById(actor.delivery.id)) ?? actor.delivery;

    revalidate(updated);
    return {
      success: true,
      asset: { id: asset.id, isApproved: asset.isApproved },
      delivery: approvalState(updated),
    };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to toggle asset approval.") };
  }
}

export async function approveAllAssetsAction(ref: DeliveryRef, approvedByName?: string) {
  try {
    const actor = await resolveDeliveryActor(ref, "approve");
    const limited = await limitGuest(actor);
    if (limited) return { error: limited };

    const origin = await resolveRequestOrigin();
    const notifyEmails = await getApprovalNotificationEmails(actor.adminServices, actor.delivery.workspaceId);
    const name = cleanName(approvedByName, "Client");
    await actor.services.delivery.approveAllAssets(actor.delivery, name, {
      origin,
      notifyEmails,
    });
    alertStudioOnWhatsApp(actor, name, origin);
    const updated = (await actor.services.delivery.getDeliveryById(actor.delivery.id)) ?? actor.delivery;

    revalidate(updated);
    return { success: true, delivery: approvalState(updated) };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to approve all assets.") };
  }
}

export async function unapproveAllAssetsAction(ref: DeliveryRef) {
  try {
    const actor = await resolveDeliveryActor(ref, "approve");
    const limited = await limitGuest(actor);
    if (limited) return { error: limited };

    const updated = await actor.services.delivery.unapproveAllAssets(actor.delivery);

    revalidate(updated);
    return { success: true, delivery: approvalState(updated) };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to unapprove assets.") };
  }
}

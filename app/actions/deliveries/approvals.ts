"use server";

import { revalidatePath } from "next/cache";
import {
  requireDeliveryGuestOrMemberAccess,
  resolveRequestOrigin,
  getApprovalNotificationEmails,
} from "./helpers";
import { normalizeActionError } from "../safe-action";

export async function approveCutAction(deliveryId: string, approvedByName?: string) {
  try {
    const { delivery, services } = await requireDeliveryGuestOrMemberAccess(deliveryId);
    const origin = await resolveRequestOrigin();
    const notifyEmails = await getApprovalNotificationEmails(services, delivery.workspaceId);

    const updatedDelivery = await services.delivery.approveCut(deliveryId, approvedByName, {
      origin,
      notifyEmails,
    });

    revalidatePath(`/deliver/${updatedDelivery.shareToken}`);
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, delivery: updatedDelivery, project: updatedDelivery };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to approve cut.") };
  }
}

export async function toggleAssetApprovalAction(
  deliveryId: string,
  assetId: string,
  isApproved: boolean
) {
  try {
    const { delivery, services } = await requireDeliveryGuestOrMemberAccess(deliveryId);
    const asset = await services.delivery.toggleAssetApproval(deliveryId, assetId, isApproved);

    if (delivery?.shareToken) {
      revalidatePath(`/deliver/${delivery.shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, asset, delivery };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to toggle asset approval.") };
  }
}

export async function approveAllAssetsAction(deliveryId: string, approvedByName?: string) {
  try {
    const { delivery, services } = await requireDeliveryGuestOrMemberAccess(deliveryId);
    const origin = await resolveRequestOrigin();
    const notifyEmails = await getApprovalNotificationEmails(services, delivery.workspaceId);

    await services.delivery.approveAllAssets(deliveryId, approvedByName, {
      origin,
      notifyEmails,
    });
    const updated = await services.delivery.getDeliveryById(deliveryId);

    if (updated?.shareToken) {
      revalidatePath(`/deliver/${updated.shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, delivery: updated };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to approve all assets.") };
  }
}

export async function unapproveAllAssetsAction(deliveryId: string) {
  try {
    const { delivery, services } = await requireDeliveryGuestOrMemberAccess(deliveryId);
    const updated = await services.delivery.unapproveAllAssets(deliveryId);

    if (updated?.shareToken) {
      revalidatePath(`/deliver/${updated.shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, delivery: updated };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to unapprove assets.") };
  }
}

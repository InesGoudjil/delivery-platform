"use server";

import { revalidatePath } from "next/cache";
import { requireDeliveryAccess } from "@/core/security/guards";
import { getServerAdminServices } from "@/core/server";
import { SILO_UNAVAILABLE_MESSAGE, type GlacierTier } from "@/core/providers/storage/silo-glacier.provider";
import { env } from "@/lib/env";
import { restoreDeliveryFromSiloSchema, safeValidate } from "@/lib/validations";
import { createScopedLogger } from "@/lib/logger";
import { normalizeActionError } from "./safe-action";

const log = createScopedLogger({ actionGroup: "silo" });

function revalidateSiloPages(workspaceSlug: string | undefined, deliveryId: string) {
  if (workspaceSlug) {
    revalidatePath(`/${workspaceSlug}/deliveries/${deliveryId}`);
    revalidatePath(`/${workspaceSlug}/deliveries`);
    revalidatePath(`/${workspaceSlug}/storage`);
  }
  revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
  revalidatePath("/[workspaceSlug]/storage", "page");
}

/**
 * Starts thawing an archived delivery. Workspace admins only, on a plan that includes The
 * Silo. (Archiving is archiveDeliveryAction in deliveries/manage-delivery.ts.)
 */
export async function restoreDeliveryFromSiloAction(
  deliveryId: string,
  tier: GlacierTier = "Bulk"
) {
  if (!env.isSiloEnabled) {
    return { success: false, error: SILO_UNAVAILABLE_MESSAGE };
  }

  try {
    const validated = safeValidate(restoreDeliveryFromSiloSchema, { deliveryId, tier });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }
    // Deep Archive has no Expedited tier.
    const restoreTier = validated.data.tier;
    if (restoreTier !== "Bulk" && restoreTier !== "Standard") {
      return { success: false, error: "Choose the Bulk or Standard restore tier." };
    }

    const { services, delivery, workspace } = await requireDeliveryAccess(
      validated.data.deliveryId,
      "admin"
    );

    const canUseSilo = await services.subscription.isSiloArchiveAllowed(delivery.workspaceId);
    if (!canUseSilo) {
      return {
        success: false,
        error:
          "The Silo Glacier Cold Storage archive requires a Studio or Enterprise plan. Please upgrade your subscription.",
      };
    }

    const result = await services.silo.requestRestoreDelivery(delivery.id, restoreTier, 7);
    revalidateSiloPages(workspace.slug, delivery.id);

    return {
      success: true,
      status: result.status,
      tier: result.tier,
      estimatedHours: result.estimatedHours,
      deliveryId: delivery.id,
    };
  } catch (err: unknown) {
    log.error({ err, deliveryId }, "restoreDeliveryFromSiloAction error");
    return { success: false, error: normalizeActionError(err, "Failed to request Silo restore.") };
  }
}

/**
 * Checks a restoring delivery and, once every file has thawed, copies the files back into
 * active storage. Any workspace member may check; the copy-back writes files and rows a
 * viewer cannot, so it runs with the service role after the access check.
 */
export async function checkDeliverySiloStatusAction(deliveryId: string) {
  if (!env.isSiloEnabled) {
    return { success: false, error: SILO_UNAVAILABLE_MESSAGE };
  }

  try {
    if (!deliveryId?.trim()) {
      return { success: false, error: "Delivery ID is required." };
    }

    const { delivery, workspace } = await requireDeliveryAccess(deliveryId, "viewer");

    const adminServices = await getServerAdminServices();
    const result = await adminServices.silo.checkAndFinalizeRestore(delivery.id);

    if (result.isReady) {
      revalidateSiloPages(workspace.slug, delivery.id);
    }

    return {
      success: true,
      isReady: result.isReady,
      status: result.status,
      expiryDate: result.expiryDate?.toISOString(),
      thawedVersionsCount: result.thawedVersionsCount,
      totalVersionsCount: result.totalVersionsCount,
      deliveryId: delivery.id,
    };
  } catch (err: unknown) {
    log.error({ err, deliveryId }, "checkDeliverySiloStatusAction error");
    return { success: false, error: normalizeActionError(err, "Failed to check Silo status.") };
  }
}

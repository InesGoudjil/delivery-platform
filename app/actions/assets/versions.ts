"use server";

import { getServerServices } from "@/core/server";
import { requireWorkspaceMember } from "@/core/security/guards";
import { log, revalidateAssetPaths } from "./helpers";

/**
 * Sets a specific asset version as the active version for an asset.
 */
export async function setActiveVersionAction(
  assetId: string,
  versionId: string,
  options?: { deliveryId?: string; workspaceSlug?: string }
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const asset = await services.asset.getAssetById(assetId);
    if (!asset) {
      return { success: false, error: "Asset not found." };
    }

    await requireWorkspaceMember(asset.workspaceId, "editor");

    await services.asset.setActiveVersion(assetId, versionId);

    const deliveryIdToRevalidate = asset.deliveryId || options?.deliveryId;
    let shareToken: string | undefined;
    if (deliveryIdToRevalidate) {
      try {
        const delivery = await services.delivery.getDeliveryById(deliveryIdToRevalidate);
        shareToken = delivery?.shareToken;
      } catch {
        // Non-critical
      }
    }

    revalidateAssetPaths({
      workspaceSlug: options?.workspaceSlug,
      deliveryId: deliveryIdToRevalidate,
      shareToken,
    });

    return { success: true };
  } catch (error: any) {
    log.error({ err: error, assetId, versionId }, "setActiveVersionAction error");
    return {
      success: false,
      error: error.message || "Failed to set active version.",
    };
  }
}

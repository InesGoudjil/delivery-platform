"use server";

import { getServerServices } from "@/core/server";
import { requireWorkspaceMember } from "@/core/security/guards";
import { log, revalidateAssetPaths } from "./helpers";
import type { DeleteAssetOptions } from "./types";

/**
 * Restores an archived asset back to active delivery/portfolio.
 */
export async function restoreAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  try {
    const services = await getServerServices();
    const asset = await services.asset.getAssetById(assetId);
    if (!asset) {
      return { success: false, error: "Asset not found." };
    }

    // Verify workspace membership/role hierarchy (minimum: editor)
    await requireWorkspaceMember(asset.workspaceId, "editor");

    await services.asset.restoreAsset(assetId);

    const deliveryIdToRevalidate = asset.deliveryId || options?.deliveryId;
    revalidateAssetPaths({
      workspaceSlug: options?.workspaceSlug,
      deliveryId: deliveryIdToRevalidate,
    });

    return { success: true };
  } catch (error: any) {
    log.error({ err: error, assetId }, "restoreAssetAction error");
    return {
      success: false,
      error: error.message || "Failed to restore asset.",
    };
  }
}

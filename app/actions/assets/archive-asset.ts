"use server";

import { getServerServices } from "@/core/server";
import { requireWorkspaceMember } from "@/core/security/guards";
import { deleteAssetOptionsSchema, safeValidate } from "@/lib/validations";
import { log, revalidateAssetPaths, cleanupPortfolioFeaturedItem } from "./helpers";
import type { DeleteAssetOptions } from "./types";

/**
 * Soft deletes (moves to trash) an asset. The asset is hidden from active
 * deliveries and portfolio showcases, preserved in Cloudflare storage, and retained for 30 days.
 */
export async function deleteAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  try {
    if (!assetId?.trim()) {
      return { success: false, error: "Asset ID is required." };
    }

    const validatedOptions = options ? safeValidate(deleteAssetOptionsSchema, options) : null;
    if (validatedOptions && !validatedOptions.success) {
      return { success: false, error: validatedOptions.error };
    }

    const services = await getServerServices();
    const asset = await services.asset.getAssetById(assetId.trim());
    if (!asset) {
      return { success: false, error: "Asset not found." };
    }

    // Verify workspace membership/role hierarchy (minimum: editor)
    await requireWorkspaceMember(asset.workspaceId, "editor");

    // Check if asset is pinned in the portfolio appearance and unpin it
    await cleanupPortfolioFeaturedItem(services, asset.workspaceId, assetId, options?.portfolioId);

    // Soft delete (archive) the asset
    await services.asset.archiveAsset(assetId);

    // Revalidate relevant cache paths
    const deliveryIdToRevalidate = asset.deliveryId || options?.deliveryId;
    revalidateAssetPaths({
      workspaceSlug: options?.workspaceSlug,
      deliveryId: deliveryIdToRevalidate,
    });

    return { success: true };
  } catch (error: any) {
    log.error({ err: error, assetId }, "deleteAssetAction error");
    return {
      success: false,
      error: error.message || "Failed to move asset to trash.",
    };
  }
}

"use server";

import { getServerServices } from "@/core/server";
import { requireWorkspaceMember } from "@/core/security/guards";
import { log, revalidateAssetPaths, cleanupPortfolioFeaturedItem } from "./helpers";
import type { DeleteAssetOptions } from "./types";

/**
 * Permanently deletes a file: its database rows first, then its stored files. Irreversible.
 *
 * Storage is cleaned up only after the database confirms the file is gone, so a refused
 * delete never wipes files. Only objects under the file's own workspace and Stream videos
 * created for that workspace are deleted. The storage counter follows by database trigger.
 */
export async function permanentDeleteAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  try {
    const services = await getServerServices();
    const asset = await services.asset.getAssetById(assetId);
    if (!asset) {
      return { success: false, error: "Asset not found." };
    }

    // Verify workspace membership/role hierarchy (strictly admin or owner for permanent purge)
    await requireWorkspaceMember(asset.workspaceId, "admin");

    // If projectId was provided and we want to detach from junction, detach it
    if (options?.projectId) {
      try {
        await services.project.detachAssetFromProject(options.projectId, assetId);
      } catch (e) {
        log.warn({ err: e, projectId: options.projectId, assetId }, "Detach from project warning");
      }
    }

    // What to clean up afterwards: the versions go with the file (ON DELETE CASCADE).
    const versions = await services.asset.listVersions(asset.id);

    // Delete the asset from database (cascades to asset_versions and feedback). The repository
    // throws when no row was deleted (row-level security refused it), so nothing below runs
    // and no stored file is touched unless the file is really gone.
    await services.asset.deleteAsset(asset.id);

    // Unpin it from the portfolio appearance, if it was featured
    await cleanupPortfolioFeaturedItem(services, asset.workspaceId, asset.id, options?.portfolioId);

    try {
      await services.upload.deleteStoredFiles(asset, versions);
    } catch (storageErr) {
      log.warn({ err: storageErr, assetId: asset.id }, "Storage cleanup notice");
    }

    // Revalidate relevant cache paths
    const deliveryIdToRevalidate = asset.deliveryId || options?.deliveryId;
    revalidateAssetPaths({
      workspaceSlug: options?.workspaceSlug,
      deliveryId: deliveryIdToRevalidate,
    });

    return { success: true };
  } catch (error: any) {
    log.error({ err: error, assetId }, "permanentDeleteAssetAction error");
    return {
      success: false,
      error: error.message || "Failed to permanently delete asset.",
    };
  }
}

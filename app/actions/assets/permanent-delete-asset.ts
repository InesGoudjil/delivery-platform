"use server";

import { getServerServices } from "@/core/server";
import { requireWorkspaceMember } from "@/core/security/guards";
import { log, revalidateAssetPaths, cleanupPortfolioFeaturedItem } from "./helpers";
import type { DeleteAssetOptions } from "./types";

/**
 * Permanently purges an asset and its versions from the workspace and remote Cloudflare storage,
 * recovering workspace storage quota. This action is irreversible.
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

    // Clean up storage versions and recover storage quota
    try {
      const versions = await services.asset.listVersions(assetId);
      let totalBytesToFree = 0;

      for (const version of versions) {
        if (version.fileSizeBytes) {
          totalBytesToFree += version.fileSizeBytes;
        }

        const targets = [
          version.rawFileUrl,
          version.hlsManifestUrl,
          version.thumbnailUrl,
        ].filter(Boolean) as string[];

        for (const target of targets) {
          if (
            target &&
            !target.includes("files.vidstack.io") &&
            !target.includes("/api/mock-upload/") &&
            !target.includes("unsplash.com") &&
            services.storage &&
            typeof services.storage.deleteAsset === "function"
          ) {
            try {
              await services.storage.deleteAsset(target);
            } catch (storageErr) {
              log.warn({ err: storageErr, target }, "Storage deletion notice");
            }
          }
        }
      }

      // Recover workspace storage quota
      if (totalBytesToFree > 0) {
        try {
          const currentWorkspace = await services.workspace.getWorkspaceById(asset.workspaceId);
          if (currentWorkspace) {
            const updatedStorage = Math.max(0, (currentWorkspace.storageUsedBytes || 0) - totalBytesToFree);
            await services.workspace.updateWorkspace(currentWorkspace.id, {
              storageUsedBytes: updatedStorage,
            });
          }
        } catch (wsErr) {
          log.warn({ err: wsErr, workspaceId: asset.workspaceId }, "Workspace storage quota update notice");
        }
      }
    } catch (verErr) {
      log.warn({ err: verErr, assetId }, "Version listing for cleanup notice");
    }

    // Check if asset is pinned in the portfolio appearance
    await cleanupPortfolioFeaturedItem(services, asset.workspaceId, assetId, options?.portfolioId);

    // Delete the asset from database (cascades to asset_versions and feedback)
    await services.asset.deleteAsset(assetId);

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

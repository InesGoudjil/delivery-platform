"use server";

import { requireUser, requireWorkspaceMember } from "@/core/security/guards";
import { parseStoredMedia } from "@/lib/storage/keys";
import { log, revalidateAssetPaths } from "./helpers";
import type { DeleteAssetOptions } from "./types";

/**
 * Restores a file from Trash (editors and up).
 *
 * - Still in its delivery, or a standalone portfolio piece: it simply comes back there.
 * - A former delivery file whose delivery was deleted: it goes into the workspace's
 *   "Recovered files" draft delivery. It never lands on the public portfolio.
 */
export async function restoreAssetAction(assetId: string, options?: DeleteAssetOptions) {
  try {
    const { services } = await requireUser();
    const asset = await services.asset.getAssetById(assetId);
    if (!asset) {
      return { success: false, error: "Asset not found." };
    }
    await requireWorkspaceMember(asset.workspaceId, "editor");

    let deliveryId = asset.deliveryId ?? null;
    if (!deliveryId && !asset.isPortfolio) {
      const versions = await services.asset.listVersions(asset.id);
      const wasDeliveryFile = versions.some(
        (v) => parseStoredMedia(v.rawFileUrl)?.kind === "r2" && (parseStoredMedia(v.rawFileUrl) as { deliveryId: string | null }).deliveryId
      );
      if (wasDeliveryFile) {
        const recovered = await services.delivery.findOrCreateRecoveryDelivery(asset.workspaceId);
        await services.asset.assignAssetToDelivery(asset.id, recovered.id);
        deliveryId = recovered.id;
      }
    }

    await services.asset.restoreAsset(asset.id);

    revalidateAssetPaths({
      workspaceSlug: options?.workspaceSlug,
      deliveryId: deliveryId || options?.deliveryId,
    });

    return { success: true, deliveryId };
  } catch (error: any) {
    log.error({ err: error, assetId }, "restoreAssetAction error");
    return {
      success: false,
      error: error.message || "Failed to restore asset.",
    };
  }
}

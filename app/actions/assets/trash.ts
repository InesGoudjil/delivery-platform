"use server";

import { getServerServices } from "@/core/server";
import { requireWorkspaceMember } from "@/core/security/guards";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import { permanentDeleteAssetAction } from "./permanent-delete-asset";
import { log, revalidateAssetPaths } from "./helpers";
import type { TrashedAssetDTO } from "./types";

/**
 * Fetches all assets currently in trash for a given workspace.
 */
export async function listTrashAssetsAction(
  workspaceId: string
): Promise<{ success: boolean; error?: string; assets: TrashedAssetDTO[] }> {
  try {
    const services = await getServerServices();
    await requireWorkspaceMember(workspaceId, "viewer");

    const trashed = await services.asset.listTrashAssets(workspaceId);

    const enriched: TrashedAssetDTO[] = await Promise.all(
      trashed.map(async (a) => {
        const activeVersion = await services.asset.getActiveVersion(a.id);
        const isStill = a.type === "photo_gallery";
        const rawMedia =
          activeVersion?.rawFileUrl ||
          activeVersion?.hlsManifestUrl ||
          activeVersion?.thumbnailUrl ||
          "";
        const resolvedThumb = resolveThumbnailUrl(
          activeVersion?.thumbnailUrl,
          rawMedia,
          isStill
        );

        const deletedTime = new Date(a.updatedAt).getTime();
        const elapsedDays = Math.floor((Date.now() - deletedTime) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, 30 - elapsedDays);

        return {
          id: a.id,
          title: a.title,
          type: a.type,
          deliveryId: a.deliveryId || null,
          workspaceId: a.workspaceId,
          thumbnailUrl: resolvedThumb ? resolveMediaUrl(resolvedThumb) : null,
          fileSizeBytes: activeVersion?.fileSizeBytes || 0,
          deletedAt: a.updatedAt,
          daysRemaining,
        };
      })
    );

    return { success: true, assets: enriched };
  } catch (error: any) {
    log.error({ err: error, workspaceId }, "listTrashAssetsAction error");
    return {
      success: false,
      error: error.message || "Failed to load trash assets.",
      assets: [],
    };
  }
}

/**
 * Permanently deletes all assets in trash for a given workspace.
 */
export async function emptyTrashAction(
  workspaceId: string,
  workspaceSlug?: string
) {
  try {
    const services = await getServerServices();
    // Verify workspace membership/role hierarchy (strictly admin or owner to empty trash)
    await requireWorkspaceMember(workspaceId, "admin");

    const trashed = await services.asset.listTrashAssets(workspaceId);
    let count = 0;
    let failed = 0;

    for (const a of trashed) {
      // Only this workspace's files (listTrashAssets returns only files in Trash).
      if (a.workspaceId !== workspaceId) continue;
      // Each delete re-checks the role on the file's workspace and only removes its own stored files.
      const result = await permanentDeleteAssetAction(a.id, {
        workspaceSlug,
        deliveryId: a.deliveryId || undefined,
      });
      if (result.success) count++;
      else failed++;
    }

    revalidateAssetPaths({ workspaceSlug });

    if (failed > 0) {
      return {
        success: false,
        count,
        error: `${failed} file${failed === 1 ? "" : "s"} couldn't be deleted.`,
      };
    }
    return { success: true, count };
  } catch (error: any) {
    log.error({ err: error, workspaceId }, "emptyTrashAction error");
    return {
      success: false,
      error: error.message || "Failed to empty trash.",
    };
  }
}

"use server";

import { getServerAdminServices, getServerServices } from "@/core/server";
import { requireWorkspaceMember } from "@/core/security/guards";
import {
  updateAssetDataSchema,
  updateAssetOptionsSchema,
  safeValidate,
} from "@/lib/validations";
import { log, revalidateAssetPaths } from "./helpers";
import type { UpdateAssetInput, UpdateAssetOptions } from "./types";

/**
 * Updates an asset or project's metadata: title, description, category,
 * thumbnail URL, or aspect ratio.
 */
export async function updateAssetAction(
  itemId: string,
  data: UpdateAssetInput,
  options?: UpdateAssetOptions
) {
  try {
    if (!itemId?.trim()) {
      return { success: false, error: "Item ID is required." };
    }

    const validatedData = safeValidate(updateAssetDataSchema, data);
    if (!validatedData.success) {
      return { success: false, error: validatedData.error };
    }

    const validatedOptions = options ? safeValidate(updateAssetOptionsSchema, options) : null;
    if (validatedOptions && !validatedOptions.success) {
      return { success: false, error: validatedOptions.error };
    }

    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const cleanOptions = validatedOptions?.data;

    if (cleanOptions?.isProject) {
      let project = await services.project.getProjectById(itemId.trim());
      if (!project) {
        const delivery = await services.delivery.getDeliveryById(itemId.trim()).catch(() => null);
        if (delivery) {
          await requireWorkspaceMember(delivery.workspaceId, "editor");
          const updatedDelivery = await services.delivery.updateDelivery(delivery.id, {
            ...(data.title !== undefined && { title: data.title.trim() }),
            ...(data.description !== undefined && { description: data.description.trim() }),
          });
          revalidateAssetPaths({ workspaceSlug: options?.workspaceSlug });
          return { success: true, item: updatedDelivery };
        }
        return { success: false, error: "Project not found." };
      }

      await requireWorkspaceMember(project.workspaceId, "editor");

      const updatedProject = await services.project.updateProject(itemId, {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description.trim() }),
        ...(data.category !== undefined && { category: data.category.trim() }),
        ...(data.thumbnailUrl !== undefined && { coverAssetUrl: data.thumbnailUrl.trim() }),
      });

      revalidateAssetPaths({ workspaceSlug: options?.workspaceSlug });

      return { success: true, item: updatedProject };
    }

    // Try finding as asset
    let asset = await services.asset.getAssetById(itemId);

    // If not found and isProject wasn't specified, check if it's a project container
    if (!asset) {
      const project = await services.project.getProjectById(itemId);
      if (project) {
        await requireWorkspaceMember(project.workspaceId, "editor");

        const updatedProject = await services.project.updateProject(itemId, {
          ...(data.title !== undefined && { title: data.title.trim() }),
          ...(data.description !== undefined && { description: data.description.trim() }),
          ...(data.category !== undefined && { category: data.category.trim() }),
          ...(data.thumbnailUrl !== undefined && { coverAssetUrl: data.thumbnailUrl.trim() }),
        });

        revalidateAssetPaths({ workspaceSlug: options?.workspaceSlug });

        return { success: true, item: updatedProject };
      }

      return { success: false, error: "Asset not found." };
    }

    // Verify asset ownership and role hierarchy (minimum: editor)
    await requireWorkspaceMember(asset.workspaceId, "editor");

    // Thumbnail first, so a refused one changes nothing. It must be an image in this workspace's
    // storage or a frame of this file's own video (a cropped data URL is stored for the file);
    // the server writes it, because API users can't write file-location columns.
    const activeVersion = await services.asset.getActiveVersion(asset.id);
    let updatedThumb = activeVersion?.thumbnailUrl;
    if (activeVersion && data.thumbnailUrl !== undefined && data.thumbnailUrl.trim()) {
      const versions = await services.asset.listVersions(asset.id);
      const admin = await getServerAdminServices();
      const thumbnail = await admin.upload.setVersionThumbnail(asset, activeVersion, data.thumbnailUrl, versions);
      updatedThumb = thumbnail.thumbnailUrl ?? updatedThumb;
    }

    // Update asset table
    const assetUpdates: any = {};
    if (data.title !== undefined) assetUpdates.title = data.title.trim();
    if (data.category !== undefined) assetUpdates.category = data.category.trim();
    if (data.aspectRatio !== undefined) assetUpdates.aspectRatio = data.aspectRatio;

    let updatedAsset = asset;
    if (Object.keys(assetUpdates).length > 0) {
      updatedAsset = await services.asset.updateAsset(itemId, assetUpdates);
    }

    // Version label
    if (activeVersion && data.description !== undefined) {
      await services.asset.renameVersion(activeVersion.id, data.description.trim());
    }

    const deliveryIdToRevalidate = asset.deliveryId || options?.deliveryId;
    revalidateAssetPaths({
      workspaceSlug: options?.workspaceSlug,
      deliveryId: deliveryIdToRevalidate,
    });

    return {
      success: true,
      item: {
        ...updatedAsset,
        thumbnailUrl: updatedThumb,
        description: data.description,
      },
    };
  } catch (error: any) {
    log.error({ err: error, itemId }, "updateAssetAction error");
    return {
      success: false,
      error: error.message || "Failed to update asset.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { getServerAdminServices } from "@/core/server";
import { requireUser, requireWorkspaceMember } from "@/core/security/guards";
import {
  requestUploadSchema,
  confirmUploadSchema,
  safeValidate,
  type RequestUploadInput,
  type ConfirmUploadInput,
} from "@/lib/validations";

/*
 * Uploads. The caller's role is checked here, with their own session. The upload service then
 * runs with the service role: only the server writes where a file is stored (the media columns
 * of asset_versions), after checking that the delivery and file belong to the workspace, and
 * after checking the uploaded object itself at confirm time.
 */

export async function requestAssetUploadAction(input: RequestUploadInput) {
  try {
    const validated = safeValidate(requestUploadSchema, input);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    // Enforce workspace membership with editor role
    const { workspace } = await requireWorkspaceMember(validated.data.workspaceId, "editor");

    const admin = await getServerAdminServices();
    const result = await admin.upload.requestAssetUpload({
      workspaceId: workspace.id,
      projectId: validated.data.projectId,
      assetId: validated.data.assetId,
      title: validated.data.title,
      filename: validated.data.filename,
      fileSizeBytes: validated.data.fileSizeBytes,
      contentType: validated.data.contentType,
      assetType: validated.data.assetType,
      aspectRatio: validated.data.aspectRatio,
      maxDurationSeconds: validated.data.maxDurationSeconds,
      placement: validated.data.placement,
    });

    return {
      success: true,
      asset: result.asset,
      assetVersion: result.assetVersion,
      directUpload: result.directUpload,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to initiate direct upload.",
    };
  }
}

export async function requestVideoUploadAction(input: RequestUploadInput) {
  return requestAssetUploadAction({ ...input, assetType: "video" });
}

/**
 * Called by the browser after its upload finished. Takes only the version id: where the file
 * is stored was decided when the upload was requested, and the server checks that object.
 */
export async function confirmUploadCompletedAction(input: ConfirmUploadInput) {
  try {
    const validated = safeValidate(confirmUploadSchema, input);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { services } = await requireUser();

    // Find the version and its file with the caller's own access, then check the role.
    const version = await services.asset.getVersionById(validated.data.assetVersionId);
    if (!version) {
      return { success: false, error: "Asset version not found." };
    }

    const asset = await services.asset.getAssetById(version.assetId);
    if (!asset) {
      return { success: false, error: "Asset not found." };
    }

    // Caller must be an editor of the asset's workspace
    await requireWorkspaceMember(asset.workspaceId, "editor");

    const admin = await getServerAdminServices();
    const updatedVersion = await admin.upload.confirmUploadCompleted({
      assetVersionId: version.id,
    });

    try {
      if (asset.deliveryId) {
        const delivery = await services.delivery.getDeliveryById(asset.deliveryId);
        if (delivery?.shareToken) {
          revalidatePath(`/deliver/${delivery.shareToken}`);
        }
      }
    } catch {
      // Non-critical if lookup fails
    }

    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    revalidatePath("/deliver/[shareToken]", "page");
    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/p/[handle]", "page");

    return {
      success: true,
      assetVersion: updatedVersion,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to confirm upload completion.",
    };
  }
}

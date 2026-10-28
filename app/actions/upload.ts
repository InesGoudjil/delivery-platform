"use server";

import { revalidatePath } from "next/cache";
import { getServerCore } from "@/core/server";
import { requireUser, requireWorkspaceMember } from "@/core/security/guards";
import {
  requestUploadSchema,
  confirmUploadSchema,
  checkAssetStatusSchema,
  safeValidate,
  type RequestUploadInput,
  type ConfirmUploadInput,
} from "@/lib/validations";

export async function requestAssetUploadAction(input: RequestUploadInput) {
  try {
    const validated = safeValidate(requestUploadSchema, input);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    // Enforce workspace membership with editor role
    const { services } = await requireWorkspaceMember(validated.data.workspaceId, "editor");

    // Initiate upload under authenticated user context
    const result = await services.upload.requestAssetUpload({
      workspaceId: validated.data.workspaceId,
      projectId: validated.data.projectId,
      assetId: validated.data.assetId,
      title: validated.data.title,
      filename: validated.data.filename,
      fileSizeBytes: validated.data.fileSizeBytes,
      assetType: validated.data.assetType,
      aspectRatio: validated.data.aspectRatio,
      maxDurationSeconds: validated.data.maxDurationSeconds,
      category: validated.data.category,
      metadata: validated.data.metadata,
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

export async function confirmUploadCompletedAction(input: ConfirmUploadInput) {
  try {
    const validated = safeValidate(confirmUploadSchema, input);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { services } = await requireUser();

    // Verify target asset and workspace ownership
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

    const updatedVersion = await services.upload.confirmUploadCompleted({
      assetVersionId: validated.data.assetVersionId,
      providerUid: validated.data.providerUid,
      durationSeconds: validated.data.durationSeconds,
      fileSizeBytes: validated.data.fileSizeBytes,
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

export async function checkAssetStatusAction(providerUid: string) {
  try {
    const validated = safeValidate(checkAssetStatusSchema, { providerUid });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    await requireUser();

    const core = await getServerCore();
    const status = await core.storageProvider.getAssetStatus(validated.data.providerUid);
    return { success: true, status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

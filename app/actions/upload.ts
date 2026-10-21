"use server";

import { revalidatePath } from "next/cache";
import { getServerServices, getServerAdminServices, getServerCore } from "@/core/server";
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

    const userServices = await getServerServices();
    const user = await userServices.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const adminServices = await getServerAdminServices();
    const result = await adminServices.upload.requestAssetUpload({
      workspaceId: validated.data.workspaceId,
      projectId: validated.data.projectId,
      assetId: validated.data.assetId,
      title: validated.data.title,
      filename: validated.data.filename,
      fileSizeBytes: validated.data.fileSizeBytes,
      assetType: validated.data.assetType,
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

    const userServices = await getServerServices();
    const user = await userServices.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const adminServices = await getServerAdminServices();
    const updatedVersion = await adminServices.upload.confirmUploadCompleted({
      assetVersionId: validated.data.assetVersionId,
      providerUid: validated.data.providerUid,
      durationSeconds: validated.data.durationSeconds,
      fileSizeBytes: validated.data.fileSizeBytes,
    });

    try {
      const asset = await userServices.asset.getAssetById(updatedVersion.assetId);
      if (asset?.deliveryId) {
        const delivery = await userServices.delivery.getDeliveryById(asset.deliveryId);
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

    const core = await getServerCore();
    const status = await core.storageProvider.getAssetStatus(validated.data.providerUid);
    return { success: true, status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

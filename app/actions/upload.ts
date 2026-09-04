"use server";

import { getServerServices, getServerAdminServices, getServerCore } from "@/core/server";
import { AssetType } from "@/core/entities/asset";

export interface RequestUploadInput {
  workspaceId: string;
  projectId: string;
  title: string;
  filename: string;
  fileSizeBytes: number;
  assetType?: AssetType;
  maxDurationSeconds?: number;
}

export async function requestAssetUploadAction(input: RequestUploadInput) {
  try {
    const userServices = await getServerServices();
    const user = await userServices.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const adminServices = await getServerAdminServices();
    const result = await adminServices.upload.requestAssetUpload({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      title: input.title,
      filename: input.filename,
      fileSizeBytes: input.fileSizeBytes,
      assetType: input.assetType || "video",
      maxDurationSeconds: input.maxDurationSeconds,
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

export interface ConfirmUploadInput {
  assetVersionId: string;
  providerUid: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
}

export async function confirmUploadCompletedAction(input: ConfirmUploadInput) {
  try {
    const userServices = await getServerServices();
    const user = await userServices.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const adminServices = await getServerAdminServices();
    const updatedVersion = await adminServices.upload.confirmUploadCompleted({
      assetVersionId: input.assetVersionId,
      providerUid: input.providerUid,
      durationSeconds: input.durationSeconds,
      fileSizeBytes: input.fileSizeBytes,
    });

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
    const core = await getServerCore();
    const status = await core.storageProvider.getAssetStatus(providerUid);
    return { success: true, status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

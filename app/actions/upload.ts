"use server";

import { getServerServices } from "@/core/server";

export interface RequestUploadInput {
  workspaceId: string;
  projectId: string;
  title: string;
  filename: string;
  fileSizeBytes: number;
  maxDurationSeconds?: number;
}

export async function requestVideoUploadAction(input: RequestUploadInput) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const result = await services.upload.requestVideoUpload({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      title: input.title,
      filename: input.filename,
      fileSizeBytes: input.fileSizeBytes,
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
      error: error.message || "Failed to initiate direct video upload.",
    };
  }
}

export interface ConfirmUploadInput {
  assetVersionId: string;
  providerUid: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
}

export async function confirmUploadCompletedAction(input: ConfirmUploadInput) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const updatedVersion = await services.upload.confirmUploadCompleted({
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

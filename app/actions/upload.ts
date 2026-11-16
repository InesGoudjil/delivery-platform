"use server";

import { revalidatePath } from "next/cache";
import { runAfterResponse } from "@/lib/after-response";
import { resolveRequestOrigin } from "@/app/actions/deliveries/helpers";
import { getServerAdminServices } from "@/core/server";
import { requireDeliveryAccess, requireUser, requireWorkspaceMember } from "@/core/security/guards";
import { presignPrivateMediaUrl } from "@/lib/media-server";
import type { DeliveryAppearanceSettings } from "@/core/entities/delivery";
import {
  requestUploadSchema,
  confirmUploadSchema,
  requestDeliveryCoverUploadSchema,
  confirmDeliveryCoverUploadSchema,
  safeValidate,
  type RequestUploadInput,
  type ConfirmUploadInput,
  type RequestDeliveryCoverUploadInput,
  type ConfirmDeliveryCoverUploadInput,
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
      width: validated.data.width,
      height: validated.data.height,
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

    const { services, user } = await requireUser();

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

    // A new version of a file in a delivery: a client who already has the link is told (library 31).
    if (version.transcodingStatus === "pending" && updatedVersion.versionNumber > 1 && asset.deliveryId) {
      const deliveryId = asset.deliveryId;
      const replyTo = user.email ?? null;
      runAfterResponse("email:client-new-version", async () =>
        admin.notification.notifyClientOfNewVersion({
          deliveryId,
          versionNumber: updatedVersion.versionNumber,
          origin: await resolveRequestOrigin(),
          replyTo,
        })
      );
    }

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

/*
 * A delivery's cover image (the banner at the top of the delivery room). It takes the same
 * direct upload as the delivery's files: the server hands out a presigned PUT for one private
 * object under the delivery's cover prefix, the browser uploads to it, and confirming checks
 * the object before the delivery points at it. Editors of the delivery's workspace only.
 * Nothing here writes a protected column, so these run with the caller's own session.
 */

export async function requestDeliveryCoverUploadAction(input: RequestDeliveryCoverUploadInput) {
  try {
    const validated = safeValidate(requestDeliveryCoverUploadSchema, input);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { services, delivery } = await requireDeliveryAccess(validated.data.deliveryId, "editor");

    const ticket = await services.upload.requestDeliveryCoverUpload({
      workspaceId: delivery.workspaceId,
      deliveryId: delivery.id,
      filename: validated.data.filename,
      fileSizeBytes: validated.data.fileSizeBytes,
      contentType: validated.data.contentType,
    });

    return { success: true, directUpload: ticket.directUpload, location: ticket.location };
  } catch (error: unknown) {
    return {
      success: false,
      error: (error instanceof Error && error.message) || "Couldn't start the cover upload.",
    };
  }
}

/**
 * Called by the browser after its cover upload finished: checks the uploaded image, makes it
 * the delivery's cover, deletes the cover it replaces, and returns a URL to show it with.
 */
export async function confirmDeliveryCoverUploadAction(input: ConfirmDeliveryCoverUploadInput) {
  try {
    const validated = safeValidate(confirmDeliveryCoverUploadSchema, input);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { services, delivery } = await requireDeliveryAccess(validated.data.deliveryId, "editor");

    const cover = await services.upload.confirmDeliveryCoverUpload({
      workspaceId: delivery.workspaceId,
      deliveryId: delivery.id,
      location: validated.data.location,
    });

    // Only the cover changes. Settings the delivery never had stay unset, so their fallbacks
    // (the watermark falls back to the delivery's own flag) work as before.
    const previousCover = delivery.appearance?.coverThumbnailUrl ?? null;
    await services.delivery.updateDelivery(delivery.id, {
      appearance: { ...(delivery.appearance ?? {}), coverThumbnailUrl: cover } as DeliveryAppearanceSettings,
    });

    // The cover it replaces isn't used anymore (only the delivery's own cover objects are deleted).
    if (previousCover && previousCover !== cover) {
      await services.upload.deleteDeliveryCover(delivery.workspaceId, delivery.id, previousCover);
    }

    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/deliver/[shareToken]", "page");

    // Private image: signed for the editor's page, like the delivery's files.
    const coverUrl = await presignPrivateMediaUrl(cover, services.storage, { workspaceId: delivery.workspaceId });

    return { success: true, coverUrl: coverUrl || null };
  } catch (error: unknown) {
    return {
      success: false,
      error: (error instanceof Error && error.message) || "Couldn't save the cover.",
    };
  }
}

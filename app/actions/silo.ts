"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import { GlacierTier } from "@/core/providers/storage/silo-glacier.provider";

export async function archiveDeliveryToSiloAction(deliveryId: string) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to archive to The Silo." };
    }

    const delivery = await services.delivery.getDeliveryById(deliveryId);
    if (!delivery) {
      return { success: false, error: "Delivery project not found." };
    }

    const isMember = await services.member.isMember(delivery.workspaceId, user.id);
    if (!isMember) {
      return { success: false, error: "You do not have permission to manage this workspace." };
    }

    const result = await services.silo.archiveDelivery(deliveryId, {
      userId: user.id,
    });

    const workspace = await services.workspace.getWorkspaceById(delivery.workspaceId);
    if (workspace?.slug) {
      revalidatePath(`/${workspace.slug}/deliveries`);
      revalidatePath(`/${workspace.slug}/deliveries/${deliveryId}`);
      revalidatePath(`/${workspace.slug}/storage`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/storage", "page");

    return {
      success: true,
      bytesArchived: result.bytesArchived,
      assetsArchived: result.assetsArchived,
      deliveryId,
    };
  } catch (err: any) {
    console.error("[archiveDeliveryToSiloAction] Error:", err);
    return { success: false, error: err.message || "Failed to archive to The Silo." };
  }
}

export async function restoreDeliveryFromSiloAction(
  deliveryId: string,
  tier: GlacierTier = "Bulk"
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to request Silo restore." };
    }

    const delivery = await services.delivery.getDeliveryById(deliveryId);
    if (!delivery) {
      return { success: false, error: "Delivery project not found." };
    }

    const isMember = await services.member.isMember(delivery.workspaceId, user.id);
    if (!isMember) {
      return { success: false, error: "You do not have permission to manage this workspace." };
    }

    const result = await services.silo.requestRestoreDelivery(deliveryId, tier, 7);

    const workspace = await services.workspace.getWorkspaceById(delivery.workspaceId);
    if (workspace?.slug) {
      revalidatePath(`/${workspace.slug}/deliveries/${deliveryId}`);
      revalidatePath(`/${workspace.slug}/deliveries`);
      revalidatePath(`/${workspace.slug}/storage`);
    }

    return {
      success: true,
      status: result.status,
      tier: result.tier,
      estimatedHours: result.estimatedHours,
      deliveryId,
    };
  } catch (err: any) {
    console.error("[restoreDeliveryFromSiloAction] Error:", err);
    return { success: false, error: err.message || "Failed to request Silo restore." };
  }
}

export async function checkDeliverySiloStatusAction(deliveryId: string) {
  try {
    const services = await getServerServices();
    const delivery = await services.delivery.getDeliveryById(deliveryId);
    if (!delivery) {
      return { success: false, error: "Delivery project not found." };
    }

    let origin = "https://cut.app";
    try {
      const { headers } = await import("next/headers");
      const headerList = await headers();
      const host = headerList.get("host");
      const proto =
        headerList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
      if (host) origin = `${proto}://${host}`;
    } catch {
      // fallback
    }

    const result = await services.silo.checkAndFinalizeRestore(deliveryId, {
      origin,
    });

    const workspace = await services.workspace.getWorkspaceById(delivery.workspaceId);
    if (result.isReady && workspace?.slug) {
      revalidatePath(`/${workspace.slug}/deliveries/${deliveryId}`);
      revalidatePath(`/${workspace.slug}/deliveries`);
      revalidatePath(`/${workspace.slug}/storage`);
    }

    return {
      success: true,
      isReady: result.isReady,
      status: result.status,
      expiryDate: result.expiryDate?.toISOString(),
      thawedVersionsCount: result.thawedVersionsCount,
      totalVersionsCount: result.totalVersionsCount,
      deliveryId,
    };
  } catch (err: any) {
    console.error("[checkDeliverySiloStatusAction] Error:", err);
    return { success: false, error: err.message || "Failed to check Silo status." };
  }
}

export async function getDeliverySiloDownloadUrlsAction(deliveryId: string) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to generate download links." };
    }

    const delivery = await services.delivery.getDeliveryById(deliveryId);
    if (!delivery) {
      return { success: false, error: "Delivery project not found." };
    }

    const downloads = await services.silo.getDeliverySiloDownloadUrls(deliveryId);
    return {
      success: true,
      downloads,
    };
  } catch (err: any) {
    console.error("[getDeliverySiloDownloadUrlsAction] Error:", err);
    return { success: false, error: err.message || "Failed to generate Silo download links." };
  }
}

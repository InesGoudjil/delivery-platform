"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "crypto";
import { requireDeliveryAccess, requireWorkspaceMember } from "@/core/security/guards";
import { getServerServices } from "@/core/server";
import { createScopedLogger } from "@/lib/logger";
import type { DeliveryAppearanceSettings } from "@/core/entities/delivery";
import {
  updateDeliveryDetailsSchema,
  deliveryAppearanceSchema,
  updateDeliverySecuritySchema,
  safeValidate,
  type UpdateDeliveryDetailsInput,
  type UpdateDeliverySecurityInput,
} from "@/lib/validations";
import { normalizeActionError } from "../safe-action";
import { deleteAssetAction } from "../assets/archive-asset";

const log = createScopedLogger({ actionGroup: "deliveries" });

export async function publishDeliveryToPortfolioAction(
  deliveryId: string,
  portfolioId?: string,
  options?: { title?: string; description?: string; category?: string; coverAssetUrl?: string }
) {
  try {
    const { services, delivery } = await requireDeliveryAccess(deliveryId, "editor");
    let targetPortfolioId = portfolioId;

    if (!targetPortfolioId?.trim()) {
      const portfolio = await services.portfolio.getOrCreatePortfolio(
        delivery.workspaceId,
        `${delivery.title} Portfolio`,
        delivery.workspaceId
      );
      targetPortfolioId = portfolio.id;
    }

    if (!targetPortfolioId?.trim()) {
      return { error: "Portfolio ID is required to publish delivery." };
    }

    const showcaseProject = await services.delivery.publishToPortfolio(
      deliveryId,
      targetPortfolioId,
      options
    );

    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/p/[handle]", "page");
    return { success: true, showcaseProject, project: showcaseProject };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to publish delivery to portfolio.") };
  }
}

export async function updateDeliveryDetailsAction(
  deliveryId: string,
  data: UpdateDeliveryDetailsInput
) {
  try {
    if (!deliveryId?.trim()) return { error: "Delivery ID is required." };

    const validated = safeValidate(updateDeliveryDetailsSchema, data);
    if (!validated.success) return { error: validated.error };

    const { services, delivery, user } = await requireDeliveryAccess(deliveryId, "editor");

    let clientId: string | undefined = delivery.clientId || undefined;
    const clientName =
      validated.data.clientName !== undefined ? validated.data.clientName.trim() : undefined;
    const hasEmail = validated.data.clientEmail !== undefined;
    const hasPhone = validated.data.clientPhone !== undefined;
    const clientEmail = hasEmail ? validated.data.clientEmail?.trim() || null : undefined;
    const clientPhone = hasPhone ? validated.data.clientPhone?.trim() || null : undefined;

    if (clientId) {
      await services.client.updateClient(clientId, {
        ...(clientName !== undefined ? { name: clientName } : {}),
        ...(hasEmail ? { email: clientEmail } : {}),
        ...(hasPhone ? { phoneNumber: clientPhone } : {}),
      });
    } else if (clientName || clientEmail || clientPhone) {
      const workspace =
        (await services.workspace.getWorkspaceById(delivery.workspaceId)) ||
        (await services.workspace.getOrCreateWorkspace(user.id));
      const existingClients = await services.client.listClients(workspace.id);
      const existingClient = clientName
        ? existingClients.find((c) => c.name.toLowerCase() === clientName.toLowerCase())
        : null;

      if (existingClient) {
        clientId = existingClient.id;
        if (hasEmail || hasPhone) {
          await services.client.updateClient(existingClient.id, {
            ...(hasEmail ? { email: clientEmail } : {}),
            ...(hasPhone ? { phoneNumber: clientPhone } : {}),
          });
        }
      } else {
        const newClient = await services.client.createClient({
          workspaceId: workspace.id,
          name: clientName || "Private Client",
          email: clientEmail || null,
          phoneNumber: clientPhone || null,
        });
        clientId = newClient.id;
      }
    }

    // Prevent unarchiving beyond active client link quota
    if (
      delivery.status === "archived" &&
      validated.data.status !== undefined &&
      validated.data.status !== "archived"
    ) {
      const eligibility = await services.subscription.canCreateProject(delivery.workspaceId);
      if (!eligibility.allowed) {
        return {
          error:
            eligibility.reason ||
            "Cannot restore delivery: your current plan's active client link limit has been reached. Please upgrade your plan.",
        };
      }
    }

    const updated = await services.delivery.updateDelivery(deliveryId.trim(), {
      ...(validated.data.title !== undefined ? { title: validated.data.title } : {}),
      ...(validated.data.description !== undefined ? { description: validated.data.description } : {}),
      ...(clientId !== undefined ? { clientId } : {}),
      ...(validated.data.status !== undefined ? { status: validated.data.status } : {}),
      ...(validated.data.location !== undefined ? { location: validated.data.location } : {}),
      ...(validated.data.deliveryDate !== undefined ? { deliveryDate: validated.data.deliveryDate } : {}),
    });

    revalidatePath(`/deliver/${updated.shareToken}`);
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, delivery: updated, project: updated };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to update delivery details.") };
  }
}

export async function updateDeliveryAppearanceAction(
  deliveryId: string,
  appearance: Partial<DeliveryAppearanceSettings>,
  workspaceSlug?: string
) {
  try {
    if (!deliveryId?.trim()) return { error: "Delivery ID is required." };

    const validated = safeValidate(deliveryAppearanceSchema, appearance);
    if (!validated.success) return { error: validated.error };

    const { services, delivery: existing } = await requireDeliveryAccess(deliveryId, "editor");

    const canWatermark = await services.subscription.isWatermarkAllowed(existing.workspaceId);
    if (validated.data.watermarkMedia === true && !canWatermark) {
      return {
        error: "Video watermarking is available on Pro and Studio plans. Please upgrade your subscription.",
      };
    }

    const mergedAppearance: DeliveryAppearanceSettings = {
      cardSize: (existing.appearance as any)?.cardSize || "M",
      aspectRatioSetting: (existing.appearance as any)?.aspectRatioSetting || "masonry",
      thumbnailScale: (existing.appearance as any)?.thumbnailScale || "Fill",
      showCardInfo: (existing.appearance as any)?.showCardInfo ?? true,
      watermarkMedia: canWatermark
        ? ((existing.appearance as any)?.watermarkMedia ?? true)
        : false,
      coverThumbnailUrl: (existing.appearance as any)?.coverThumbnailUrl ?? null,
      ...validated.data,
    };

    if (!canWatermark) {
      mergedAppearance.watermarkMedia = false;
    }

    const updated = await services.delivery.updateDelivery(deliveryId.trim(), {
      appearance: mergedAppearance,
    });

    if (workspaceSlug) {
      revalidatePath(`/${workspaceSlug}/deliveries/${deliveryId.trim()}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath(`/deliver/${updated.shareToken}`);

    return { success: true, delivery: updated, appearance: mergedAppearance };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to update delivery appearance.") };
  }
}

export async function archiveDeliveryAction(deliveryId: string) {
  try {
    const { services, delivery, user } = await requireDeliveryAccess(deliveryId, "admin");

    const canArchive = await services.subscription.isSiloArchiveAllowed(delivery.workspaceId);
    if (!canArchive) {
      return {
        error:
          "The Silo Glacier Cold Storage archive requires a Studio or Enterprise plan. Please upgrade your subscription.",
      };
    }

    // Move master cut assets into AWS S3 Glacier Deep Archive and free active workspace quota
    await services.silo.archiveDelivery(deliveryId, {
      userId: user?.id,
    });

    const updated = await services.delivery.getDeliveryById(deliveryId);

    revalidatePath("/[workspaceSlug]/deliveries", "page");
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/storage", "page");
    return { success: true, delivery: updated, project: updated };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to archive delivery to The Silo.") };
  }
}

export async function updateDeliverySecurityAction(
  deliveryId: string,
  data: UpdateDeliverySecurityInput
) {
  try {
    if (!deliveryId?.trim()) return { error: "Delivery ID is required." };

    const validated = safeValidate(updateDeliverySecuritySchema, data);
    if (!validated.success) return { error: validated.error };

    const { services, delivery } = await requireDeliveryAccess(deliveryId, "admin");

    if (validated.data.passphrase && validated.data.passphrase.trim().length > 0) {
      const canPasswordProtect = await services.subscription.isPasswordProtectionAllowed(
        delivery.workspaceId
      );
      if (!canPasswordProtect) {
        return {
          error:
            "Passcode protection is available on Pro and Studio plans. Please upgrade your subscription.",
        };
      }
    }

    if (validated.data.notifyOnDownload === true) {
      const canNotify = await services.subscription.isDownloadNotificationAllowed(
        delivery.workspaceId
      );
      if (!canNotify) {
        return {
          error:
            "Download notifications are available on Pro and Studio plans. Please upgrade your subscription.",
        };
      }
    }

    let passcodeHash: string | null | undefined = undefined;
    if (validated.data.passphrase !== undefined) {
      if (validated.data.passphrase && validated.data.passphrase.trim().length > 0) {
        const clean = validated.data.passphrase.trim();
        passcodeHash = createHash("sha256").update(clean).digest("hex");
      } else {
        passcodeHash = null;
      }
    }

    const updated = await services.delivery.updateDelivery(deliveryId.trim(), {
      ...(passcodeHash !== undefined ? { passcodeHash } : {}),
      ...(validated.data.isDownloadAllowed !== undefined
        ? { isDownloadAllowed: validated.data.isDownloadAllowed }
        : {}),
      ...(validated.data.isCommentAllowed !== undefined
        ? { isCommentAllowed: validated.data.isCommentAllowed }
        : {}),
      ...(validated.data.notifyOnDownload !== undefined
        ? { notifyOnDownload: validated.data.notifyOnDownload }
        : {}),
      ...(validated.data.expiresAt !== undefined ? { expiresAt: validated.data.expiresAt } : {}),
    });

    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath(`/deliver/${updated.shareToken}`);

    return {
      success: true,
      delivery: updated,
      passcodeProtected: Boolean(updated.passcodeHash),
      isDownloadAllowed: updated.isDownloadAllowed,
      isCommentAllowed: updated.isCommentAllowed,
      expiresAt: updated.expiresAt,
    };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to update delivery security.") };
  }
}

export async function regenerateDeliveryShareTokenAction(deliveryId: string) {
  try {
    if (!deliveryId?.trim()) return { success: false, error: "Delivery ID is required." };

    const { services, delivery } = await requireDeliveryAccess(deliveryId, "admin");

    const oldToken = delivery.shareToken;
    const updated = await services.delivery.regenerateShareToken(deliveryId.trim());

    const workspace = await services.workspace.getWorkspaceById(delivery.workspaceId);
    if (workspace?.slug) {
      revalidatePath(`/${workspace.slug}/deliveries/${deliveryId.trim()}`);
      revalidatePath(`/${workspace.slug}/deliveries`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath(`/deliver/${oldToken}`);
    revalidatePath(`/deliver/${updated.shareToken}`);

    return {
      success: true,
      shareToken: updated.shareToken,
      delivery: updated,
    };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Failed to regenerate share token.") };
  }
}

/**
 * Permanently deletes a delivery room and all associated assets.
 */
export async function deleteDeliveryAction(
  deliveryId: string,
  workspaceSlug?: string
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const delivery = await services.delivery.getDeliveryById(deliveryId);
    if (!delivery) {
      return { success: false, error: "Delivery not found." };
    }

    // Verify workspace membership/role hierarchy (minimum: editor)
    await requireWorkspaceMember(delivery.workspaceId, "editor");

    // Delete associated assets and storage files (moves to workspace Trash)
    try {
      const assets = await services.asset.listDeliveryAssets(deliveryId);
      for (const asset of assets) {
        await deleteAssetAction(asset.id, {
          deliveryId,
          workspaceSlug,
        });
      }
    } catch (e) {
      log.warn({ err: e, deliveryId }, "Delivery asset cleanup notice");
    }

    // Detach all assets from this delivery so they remain preserved in workspace Trash
    // and cannot violate foreign key constraints when deleting the delivery room
    try {
      await services.asset.detachAllFromDelivery(deliveryId);
    } catch (detachErr) {
      log.warn({ err: detachErr, deliveryId }, "Delivery asset detachment notice");
    }

    // Delete delivery entity
    await services.delivery.deleteDelivery(deliveryId);

    if (workspaceSlug) {
      revalidatePath(`/${workspaceSlug}/deliveries`);
    }
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");

    return { success: true };
  } catch (error: any) {
    log.error({ err: error, deliveryId }, "deleteDeliveryAction error");
    return {
      success: false,
      error: error.message || "Failed to delete delivery.",
    };
  }
}


"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { getServerServices, getServerAdminServices } from "@/core/server";
import { requireUser, requireWorkspaceMember, requireDeliveryAccess } from "@/core/security/guards";
import { presignDeliveryAssets } from "@/lib/media-server";
import { resolveThumbnailUrl, resolveMediaUrl } from "@/lib/media";
import type { DeliveryAppearanceSettings } from "@/core/entities/delivery";
import {
  verifyDeliveryPasscodeSchema,
  createDeliverySchema,
  updateDeliveryDetailsSchema,
  deliveryAppearanceSchema,
  updateDeliverySecuritySchema,
  sendDeliveryEmailSchema,
  loadMoreDeliveryAssetsSchema,
  getDeliveryDownloadManifestSchema,
  recordClientDownloadSchema,
  safeValidate,
  type UpdateDeliveryDetailsInput,
  type DeliveryAppearanceInput,
  type UpdateDeliverySecurityInput,
} from "@/lib/validations";

async function requireDeliveryGuestOrMemberAccess(deliveryId: string) {
  const adminServices = await getServerAdminServices();
  const delivery = await adminServices.delivery.getDeliveryById(deliveryId.trim());
  if (!delivery) {
    throw new Error("Delivery cut not found.");
  }

  // Check if caller is authenticated workspace member
  const userServices = await getServerServices();
  const user = await userServices.auth.getCurrentUser();
  if (user) {
    const isMember = await adminServices.member.isMember(delivery.workspaceId, user.id).catch(() => false);
    if (isMember) {
      return { delivery, services: adminServices, isMember: true, user };
    }
  }

  // If guest, verify delivery is active and passcode (if required) is verified
  if (delivery.status === "archived") {
    throw new Error("This delivery has been archived.");
  }

  if (delivery.passcodeHash) {
    const cookieStore = await cookies();
    const verified = cookieStore.get(`delivery_access_${delivery.shareToken}`)?.value === "verified";
    if (!verified) {
      throw new Error("Passcode verification required to perform this action.");
    }
  }

  return { delivery, services: adminServices, isMember: false, user: null };
}

export async function verifyDeliveryPasscodeAction(
  shareToken: string,
  passcode: string,
  isCreatorBypass: boolean = false
) {
  try {
    const validated = safeValidate(verifyDeliveryPasscodeSchema, {
      shareToken,
      passcode,
      isCreatorBypass,
    });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const {
      shareToken: cleanShareToken,
      passcode: cleanPasscode,
      isCreatorBypass: bypass,
    } = validated.data;

    const services = await getServerAdminServices();
    const delivery = await services.delivery.getDeliveryByShareToken(cleanShareToken, { allowExpired: bypass });
    if (!delivery) {
      return { success: false, error: "Delivery not found or link has expired." };
    }

    let isAuthorized = !delivery.passcodeHash;

    if (!isAuthorized && bypass) {
      const user = await services.auth.getCurrentUser();
      if (user) {
        const isMember = await services.member.isMember(delivery.workspaceId, user.id).catch(() => false);
        if (isMember) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      if (!cleanPasscode) {
        return { success: false, error: "Please enter the client passcode." };
      }
      const hashed = createHash("sha256").update(cleanPasscode).digest("hex");
      const isMatch = delivery.passcodeHash === cleanPasscode || delivery.passcodeHash === hashed;
      if (!isMatch) {
        return { success: false, error: "Incorrect passcode. Please try again." };
      }
      isAuthorized = true;
    }

    // Set HTTP-only cookie valid for 7 days across site
    const cookieStore = await cookies();
    cookieStore.set(`delivery_access_${shareToken}`, "verified", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    // Retrieve and map full assets & versions to return immediately upon unlock
    const fullDetails = await services.delivery.getDeliveryWithFullDetails(shareToken);
    const mappedAssets = (fullDetails?.assets || []).map((asset) => {
      const mappedVersions = (asset.versions || []).map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        rawFileUrl: v.rawFileUrl,
        downloadUrl: v.rawFileUrl,
        hlsManifestUrl: v.hlsManifestUrl || null,
        thumbnailUrl: v.thumbnailUrl || null,
        fileSizeBytes: v.fileSizeBytes || null,
        durationSeconds: v.durationSeconds ? Number(v.durationSeconds) : null,
        transcodingStatus: v.transcodingStatus || null,
        isActiveVersion: v.isActiveVersion,
      }));

      const activeVersion =
        mappedVersions.find((v) => v.isActiveVersion) ||
        mappedVersions[0] ||
        null;

      const mappedFeedback = (asset.feedback || []).map((f) => ({
        id: f.id,
        assetVersionId: f.assetVersionId,
        authorName: f.authorName,
        commentText: f.commentText,
        timestampSeconds: f.timestampSeconds ? Number(f.timestampSeconds) : null,
        isResolved: f.isResolved,
        createdAt: f.createdAt,
        replies: (f.replies || []).map((r) => ({
          id: r.id,
          feedbackId: r.feedbackId,
          authorName: r.authorName,
          commentText: r.commentText,
          createdAt: r.createdAt,
        })),
      }));

      return {
        id: asset.id,
        title: asset.title,
        type: asset.type,
        aspectRatio: "16:9",
        isApproved: asset.isApproved,
        sortOrder: asset.sortOrder,
        versions: mappedVersions,
        activeVersion,
        feedback: mappedFeedback,
      };
    });

    const presignedAssets = await presignDeliveryAssets(mappedAssets, services.storage, 7200);
    revalidatePath(`/deliver/${shareToken}`);
    return { success: true, assets: presignedAssets };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to verify passcode." };
  }
}

export async function verifyPassphraseWithTokenAction(shareToken: string, candidatePassphrase: string) {
  try {
    const services = await getServerAdminServices();
    const delivery = await services.delivery.getDeliveryByShareToken(shareToken);
    if (!delivery) {
      return { success: false, error: "Delivery not found." };
    }

    if (!delivery.passcodeHash) {
      return { success: true, isProtected: false, message: "Link is public (no passphrase required)." };
    }

    const clean = candidatePassphrase.trim();
    if (!clean) {
      return { success: false, isProtected: true, error: "Please enter a passphrase to verify." };
    }

    const hashed = createHash("sha256").update(clean).digest("hex");
    const isMatch = delivery.passcodeHash === clean || delivery.passcodeHash === hashed;

    if (!isMatch) {
      return { success: false, isProtected: true, error: "Passphrase does not match the token security key." };
    }

    return {
      success: true,
      isProtected: true,
      message: "Passphrase verified successfully with delivery token.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to verify passphrase." };
  }
}

export async function checkDeliveryAccessAction(shareToken: string) {
  try {
    const cookieStore = await cookies();
    const hasAccess = cookieStore.get(`delivery_access_${shareToken}`)?.value === "verified";
    return { hasAccess };
  } catch {
    return { hasAccess: false };
  }
}

export async function createDeliveryAction(
  workspaceId: string,
  title: string,
  description?: string,
  clientNameOrId?: string,
  clientEmail?: string | null,
  clientPhone?: string | null
) {
  try {
    const validated = safeValidate(createDeliverySchema, {
      workspaceId,
      title,
      description,
      clientNameOrId,
      clientEmail,
      clientPhone,
    });
    if (!validated.success) return { error: validated.error };

    const {
      workspaceId: cleanWorkspaceId,
      title: cleanTitle,
      description: cleanDescription,
      clientNameOrId: cleanClientNameOrId,
      clientEmail: cleanClientEmail,
      clientPhone: cleanClientPhone,
    } = validated.data;

    const { services, user } = await requireWorkspaceMember(cleanWorkspaceId, "editor");

    let clientId: string | undefined = undefined;
    if (cleanClientNameOrId || cleanClientEmail || cleanClientPhone) {
      const isUuid = cleanClientNameOrId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanClientNameOrId);
      if (isUuid) {
        clientId = cleanClientNameOrId;
      } else {
        const existingClients = await services.client.listClients(cleanWorkspaceId);
        const existingClient = cleanClientNameOrId
          ? existingClients.find((c) => c.name.toLowerCase() === cleanClientNameOrId.toLowerCase())
          : null;
        if (existingClient) {
          clientId = existingClient.id;
          if (cleanClientEmail || cleanClientPhone) {
            await services.client.updateClient(existingClient.id, {
              ...(cleanClientEmail ? { email: cleanClientEmail } : {}),
              ...(cleanClientPhone ? { phoneNumber: cleanClientPhone } : {}),
            });
          }
        } else {
          const newClient = await services.client.createClient({
            workspaceId: cleanWorkspaceId,
            name: cleanClientNameOrId || "Private Client",
            email: cleanClientEmail || null,
            phoneNumber: cleanClientPhone || null,
          });
          clientId = newClient.id;
        }
      }
    }

    // Auto-calculate default expiration date based on workspace security policy if not explicitly set
    let calculatedExpiresAt: string | undefined = undefined;
    try {
      const settings = await services.settings.findByWorkspaceId(cleanWorkspaceId);
      const days = settings?.defaultLinkExpirationDays ?? 30;
      if (days && days > 0) {
        calculatedExpiresAt = new Date(Date.now() + days * 86400000).toISOString();
      }
    } catch {
      // Fallback: no auto-expiration
    }

    const delivery = await services.delivery.createDelivery({
      workspaceId: cleanWorkspaceId,
      title: cleanTitle,
      description: cleanDescription,
      clientId,
      expiresAt: calculatedExpiresAt,
    });

    const workspace = await services.workspace.getWorkspaceById(cleanWorkspaceId);
    if (workspace?.slug) {
      revalidatePath(`/${workspace.slug}/deliveries`);
    }
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, delivery, project: delivery };
  } catch (err: any) {
    return { error: err.message || "Failed to create delivery." };
  }
}

export async function approveCutAction(deliveryId: string, approvedByName?: string) {
  try {
    const { delivery, services } = await requireDeliveryGuestOrMemberAccess(deliveryId);

    let origin = "https://cut.app";
    try {
      const { headers } = await import("next/headers");
      const headerList = await headers();
      const host = headerList.get("host");
      const proto = headerList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
      if (host) origin = `${proto}://${host}`;
    } catch {
      // fallback to default
    }

    let notifyEmails: string[] = [];
    try {
      const settings = await services.settings.findByWorkspaceId(delivery.workspaceId);
      const shouldNotify = settings ? settings.notifyApprovals : true;
      if (shouldNotify) {
        const members = await services.member.listMembers(delivery.workspaceId);
        notifyEmails = members
          .filter((m) => (m.role === "owner" || m.role === "admin") && Boolean(m.email))
          .map((m) => m.email as string);
      }
    } catch {
      // fallback
    }

    const updatedDelivery = await services.delivery.approveCut(deliveryId, approvedByName, {
      origin,
      notifyEmails,
    });

    revalidatePath(`/deliver/${updatedDelivery.shareToken}`);
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, delivery: updatedDelivery, project: updatedDelivery };
  } catch (err: any) {
    return { error: err.message || "Failed to approve cut." };
  }
}

export async function toggleAssetApprovalAction(
  deliveryId: string,
  assetId: string,
  isApproved: boolean
) {
  try {
    const { delivery, services } = await requireDeliveryGuestOrMemberAccess(deliveryId);
    const asset = await services.delivery.toggleAssetApproval(deliveryId, assetId, isApproved);

    if (delivery?.shareToken) {
      revalidatePath(`/deliver/${delivery.shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, asset, delivery };
  } catch (err: any) {
    return { error: err.message || "Failed to toggle asset approval." };
  }
}

export async function approveAllAssetsAction(deliveryId: string, approvedByName?: string) {
  try {
    const { delivery, services } = await requireDeliveryGuestOrMemberAccess(deliveryId);

    let origin = "https://cut.app";
    try {
      const { headers } = await import("next/headers");
      const headerList = await headers();
      const host = headerList.get("host");
      const proto = headerList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
      if (host) origin = `${proto}://${host}`;
    } catch {
      // fallback to default
    }

    let notifyEmails: string[] = [];
    try {
      const settings = await services.settings.findByWorkspaceId(delivery.workspaceId);
      const shouldNotify = settings ? settings.notifyApprovals : true;
      if (shouldNotify) {
        const members = await services.member.listMembers(delivery.workspaceId);
        notifyEmails = members
          .filter((m) => (m.role === "owner" || m.role === "admin") && Boolean(m.email))
          .map((m) => m.email as string);
      }
    } catch {
      // fallback
    }

    await services.delivery.approveAllAssets(deliveryId, approvedByName, {
      origin,
      notifyEmails,
    });
    const updated = await services.delivery.getDeliveryById(deliveryId);

    if (updated?.shareToken) {
      revalidatePath(`/deliver/${updated.shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, delivery: updated };
  } catch (err: any) {
    return { error: err.message || "Failed to approve all assets." };
  }
}

export async function unapproveAllAssetsAction(deliveryId: string) {
  try {
    const { delivery, services } = await requireDeliveryGuestOrMemberAccess(deliveryId);
    const updated = await services.delivery.unapproveAllAssets(deliveryId);

    if (updated?.shareToken) {
      revalidatePath(`/deliver/${updated.shareToken}`);
    }
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, delivery: updated };
  } catch (err: any) {
    return { error: err.message || "Failed to unapprove assets." };
  }
}

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

    const showcaseProject = await services.delivery.publishToPortfolio(deliveryId, targetPortfolioId, options);

    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/p/[handle]", "page");
    return { success: true, showcaseProject, project: showcaseProject };
  } catch (err: any) {
    return { error: err.message || "Failed to publish delivery to portfolio." };
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
    const clientName = validated.data.clientName !== undefined ? validated.data.clientName.trim() : undefined;
    const hasEmail = validated.data.clientEmail !== undefined;
    const hasPhone = validated.data.clientPhone !== undefined;
    const clientEmail = hasEmail ? (validated.data.clientEmail?.trim() || null) : undefined;
    const clientPhone = hasPhone ? (validated.data.clientPhone?.trim() || null) : undefined;

    if (clientId) {
      await services.client.updateClient(clientId, {
        ...(clientName !== undefined ? { name: clientName } : {}),
        ...(hasEmail ? { email: clientEmail } : {}),
        ...(hasPhone ? { phoneNumber: clientPhone } : {}),
      });
    } else if (clientName || clientEmail || clientPhone) {
      const workspace = (await services.workspace.getWorkspaceById(delivery.workspaceId)) ||
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
  } catch (err: any) {
    return { error: err.message || "Failed to update delivery details." };
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
  } catch (err: any) {
    return { error: err.message || "Failed to update delivery appearance." };
  }
}

export async function archiveDeliveryAction(deliveryId: string) {
  try {
    const { services, delivery, user } = await requireDeliveryAccess(deliveryId, "admin");

    // Move master cut assets into AWS S3 Glacier Deep Archive and free active workspace quota
    await services.silo.archiveDelivery(deliveryId, {
      userId: user?.id,
    });

    const updated = await services.delivery.getDeliveryById(deliveryId);

    revalidatePath("/[workspaceSlug]/deliveries", "page");
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/storage", "page");
    return { success: true, delivery: updated, project: updated };
  } catch (err: any) {
    return { error: err.message || "Failed to archive delivery to The Silo." };
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
      const canPasswordProtect = await services.subscription.isPasswordProtectionAllowed(delivery.workspaceId);
      if (!canPasswordProtect) {
        return {
          error: "Passcode protection is available on Pro and Studio plans. Please upgrade your subscription.",
        };
      }
    }

    if (validated.data.notifyOnDownload === true) {
      const canNotify = await services.subscription.isDownloadNotificationAllowed(delivery.workspaceId);
      if (!canNotify) {
        return {
          error: "Download notifications are available on Pro and Studio plans. Please upgrade your subscription.",
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
      ...(validated.data.isDownloadAllowed !== undefined ? { isDownloadAllowed: validated.data.isDownloadAllowed } : {}),
      ...(validated.data.notifyOnDownload !== undefined ? { notifyOnDownload: validated.data.notifyOnDownload } : {}),
      ...(validated.data.expiresAt !== undefined ? { expiresAt: validated.data.expiresAt } : {}),
    });

    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath(`/deliver/${updated.shareToken}`);

    return {
      success: true,
      delivery: updated,
      passcodeProtected: Boolean(updated.passcodeHash),
      expiresAt: updated.expiresAt,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to update delivery security." };
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
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to regenerate share token." };
  }
}

export async function sendDeliveryEmailAction(
  deliveryId: string,
  recipientEmail: string,
  customMessage?: string
) {
  try {
    const validated = safeValidate(sendDeliveryEmailSchema, {
      deliveryId,
      recipientEmail,
      customMessage,
    });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { services, delivery } = await requireDeliveryAccess(validated.data.deliveryId, "editor");

    let origin = "https://cut.app";
    try {
      const { headers } = await import("next/headers");
      const headerList = await headers();
      const host = headerList.get("host");
      const proto = headerList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
      if (host) origin = `${proto}://${host}`;
    } catch {
      // fallback
    }

    const res = await services.delivery.sendDeliveryEmail({
      deliveryId: validated.data.deliveryId,
      recipientEmail: validated.data.recipientEmail.toLowerCase(),
      customMessage: validated.data.customMessage,
      origin,
    });

    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    return { success: res.success, log: res.log, error: res.error };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send delivery email." };
  }
}

export async function deleteAssetAction(
  assetId: string,
  options?: { deliveryId?: string; workspaceSlug?: string; portfolioId?: string }
) {
  const { deleteAssetAction: del } = await import("./assets");
  return del(assetId, options);
}

export async function deleteDeliveryAction(deliveryId: string, workspaceSlug?: string) {
  const { deleteDeliveryAction: del } = await import("./assets");
  return del(deliveryId, workspaceSlug);
}

export async function restoreAssetAction(
  assetId: string,
  options?: { deliveryId?: string; workspaceSlug?: string; portfolioId?: string; projectId?: string }
) {
  const { restoreAssetAction: res } = await import("./assets");
  return res(assetId, options);
}

export async function permanentDeleteAssetAction(
  assetId: string,
  options?: { deliveryId?: string; workspaceSlug?: string; portfolioId?: string; projectId?: string }
) {
  const { permanentDeleteAssetAction: pdel } = await import("./assets");
  return pdel(assetId, options);
}

export async function listTrashAssetsAction(workspaceId: string) {
  const { listTrashAssetsAction: list } = await import("./assets");
  return list(workspaceId);
}

export async function emptyTrashAction(workspaceId: string, workspaceSlug?: string) {
  const { emptyTrashAction: empty } = await import("./assets");
  return empty(workspaceId, workspaceSlug);
}

export async function updateAssetAction(
  itemId: string,
  data: {
    title?: string;
    description?: string;
    category?: string;
    thumbnailUrl?: string;
    aspectRatio?: string;
  },
  options?: { deliveryId?: string; workspaceSlug?: string; portfolioId?: string; isProject?: boolean }
) {
  const { updateAssetAction: upd } = await import("./assets");
  return upd(itemId, data, options);
}

export async function setActiveVersionAction(
  assetId: string,
  versionId: string,
  options?: { deliveryId?: string; workspaceSlug?: string }
) {
  const { setActiveVersionAction: setAct } = await import("./assets");
  return setAct(assetId, versionId, options);
}

export async function loadMoreDeliveryAssetsAction(params: {
  deliveryId?: string;
  shareToken?: string;
  page: number;
  pageSize?: number;
  filter?: "ALL" | "VIDEOS" | "PHOTOS";
}) {
  try {
    const validated = safeValidate(loadMoreDeliveryAssetsSchema, params);
    if (!validated.success) {
      return { success: false, error: validated.error, items: [], hasMore: false, totalCount: 0 };
    }

    const { deliveryId, shareToken, page, pageSize, filter } = validated.data;

    const services = await getServerAdminServices();
    let delivery = null;

    if (deliveryId) {
      delivery = await services.delivery.getDeliveryById(deliveryId);
    } else if (shareToken) {
      delivery = await services.delivery.getDeliveryByShareToken(shareToken);
    }

    if (!delivery) {
      return { success: false, error: "Delivery not found or link has expired." };
    }

    // Verify access
    const user = await services.auth.getCurrentUser();
    let isAuthorized = false;

    if (user) {
      const isMember = await services.member
        .isMember(delivery.workspaceId, user.id)
        .catch(() => false);
      if (isMember) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      if (!delivery.passcodeHash) {
        isAuthorized = true;
      } else {
        const cookieStore = await cookies();
        const accessCookie = cookieStore.get(`delivery_access_${delivery.shareToken}`)?.value;
        if (accessCookie === "verified") {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return { success: false, error: "Unauthorized access to delivery assets." };
    }

    const filterType =
      filter === "VIDEOS"
        ? ("video" as const)
        : filter === "PHOTOS"
        ? ("photo" as const)
        : ("all" as const);

    const limit = pageSize || 12;
    const pageData = await services.delivery.getDeliveryAssetsPage(delivery.id, {
      page,
      limit,
      type: filterType,
    });

    const mappedAssets = pageData.assets.map((a) => {
      const mappedVersions = a.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        rawFileUrl: v.rawFileUrl,
        downloadUrl: v.rawFileUrl,
        hlsManifestUrl: v.hlsManifestUrl,
        thumbnailUrl:
          v.thumbnailUrl ||
          (a.type === "photo_gallery" || (a.type as string) === "photo" || (a.type as string) === "still"
            ? v.rawFileUrl
            : null) ||
          "/images/hero.jpg",
        durationSeconds: v.durationSeconds,
        fileSizeBytes: v.fileSizeBytes,
        transcodingStatus: v.transcodingStatus,
        isActiveVersion: v.isActiveVersion,
        createdAt: v.createdAt,
      }));

      const activeVersion =
        mappedVersions.find((v) => v.isActiveVersion) || mappedVersions[0] || null;

      const mappedFeedback = (a.feedback || []).map((f) => ({
        id: f.id,
        assetVersionId: f.assetVersionId,
        authorName: f.authorName,
        commentText: f.commentText,
        timestampSeconds: f.timestampSeconds ? Number(f.timestampSeconds) : null,
        createdAt: f.createdAt,
        isResolved: f.isResolved,
        replies: (f.replies || []).map((r) => ({
          id: r.id,
          feedbackId: r.feedbackId,
          authorName: r.authorName,
          commentText: r.commentText,
          createdAt: r.createdAt,
        })),
      }));

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        aspectRatio: a.aspectRatio,
        isApproved: a.isApproved,
        versions: mappedVersions,
        activeVersion,
        feedback: mappedFeedback,
      };
    });

    // Presign only the requested batch
    const presigned = await presignDeliveryAssets(mappedAssets, services.storage, 7200);

    const items = presigned.map((a) => {
      const activeVer = a.activeVersion || a.versions[0];
      const isPhoto =
        (a.type as string) === "still" ||
        (a.type as string) === "photo" ||
        a.type === "photo_gallery";
      let durationStr = "STILL";
      if (!isPhoto) {
        if (activeVer?.durationSeconds) {
          const mins = Math.floor(activeVer.durationSeconds / 60);
          const secs = Math.round(activeVer.durationSeconds % 60);
          durationStr = `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
        } else {
          durationStr = "00:45";
        }
      }

      return {
        id: a.id,
        versionId: activeVer?.id,
        versionNumber: activeVer?.versionNumber || 1,
        totalVersions: a.versions?.length || 1,
        versions: a.versions || [],
        title: a.title,
        type: isPhoto ? ("photo" as const) : ("video" as const),
        aspectRatio: a.aspectRatio || "16:9",
        duration: durationStr,
        src:
          resolveThumbnailUrl(activeVer?.thumbnailUrl, activeVer?.rawFileUrl, isPhoto) || "",
        status: a.isApproved ? ("approved" as const) : ("review" as const),
        rawUrl: resolveMediaUrl(activeVer?.rawFileUrl),
        downloadUrl: resolveMediaUrl(activeVer?.downloadUrl || activeVer?.rawFileUrl),
        fileSizeBytes: activeVer?.fileSizeBytes || 0,
        hlsUrl: resolveMediaUrl(activeVer?.hlsManifestUrl),
        videoUrl:
          resolveMediaUrl(activeVer?.hlsManifestUrl) ||
          resolveMediaUrl(activeVer?.rawFileUrl) ||
          (isPhoto ? undefined : "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"),
        feedback: a.feedback || [],
      };
    });

    return {
      success: true,
      items,
      hasMore: pageData.hasMore,
      totalCount: pageData.totalCount,
      approvedCount: pageData.approvedCount,
    };
  } catch (err: any) {
    console.error("[loadMoreDeliveryAssetsAction] Error:", err);
    return {
      success: false,
      error: err?.message || "Failed to load more assets",
    };
  }
}

export async function getDeliveryDownloadManifestAction(params: {
  deliveryId?: string;
  shareToken?: string;
}) {
  try {
    const validated = safeValidate(getDeliveryDownloadManifestSchema, params);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { deliveryId, shareToken } = validated.data;

    const services = await getServerAdminServices();
    let delivery = null;

    if (deliveryId) {
      delivery = await services.delivery.getDeliveryById(deliveryId);
    } else if (shareToken) {
      delivery = await services.delivery.getDeliveryByShareToken(shareToken);
    }

    if (!delivery) {
      return { success: false, error: "Delivery not found." };
    }

    const user = await services.auth.getCurrentUser();
    let isAuthorized = false;

    if (user) {
      const isMember = await services.member
        .isMember(delivery.workspaceId, user.id)
        .catch(() => false);
      if (isMember) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      if (!delivery.passcodeHash) {
        isAuthorized = true;
      } else {
        const cookieStore = await cookies();
        const accessCookie = cookieStore.get(`delivery_access_${delivery.shareToken}`)?.value;
        if (accessCookie === "verified") {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return { success: false, error: "Unauthorized access to delivery package." };
    }

    // Fetch all assets in the delivery (up to 500 deliverables)
    const fullDetails = await services.delivery.getDeliveryWithFullDetails(delivery.id, {
      page: 1,
      limit: 500,
    });

    const rawAssets = fullDetails?.assets || [];
    const mappedAssets = rawAssets.map((a) => {
      const mappedVersions = (a.versions || []).map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        rawFileUrl: v.rawFileUrl,
        downloadUrl: v.rawFileUrl,
        hlsManifestUrl: v.hlsManifestUrl,
        thumbnailUrl:
          v.thumbnailUrl ||
          (a.type === "photo_gallery" || (a.type as string) === "photo" || (a.type as string) === "still"
            ? v.rawFileUrl
            : null) ||
          "/images/hero.jpg",
        durationSeconds: v.durationSeconds,
        fileSizeBytes: v.fileSizeBytes,
        isActiveVersion: v.isActiveVersion,
      }));

      const activeVersion =
        mappedVersions.find((v) => v.isActiveVersion) || mappedVersions[0] || null;

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        aspectRatio: a.aspectRatio || "16:9",
        isApproved: a.isApproved,
        versions: mappedVersions,
        activeVersion,
      };
    });

    const presigned = await presignDeliveryAssets(mappedAssets, services.storage, 7200);

    const downloadItems = presigned.map((a) => {
      const activeVer = a.activeVersion || a.versions[0];
      const isPhoto =
        (a.type as string) === "still" ||
        (a.type as string) === "photo" ||
        a.type === "photo_gallery";
      let durationStr: string | null = null;
      if (!isPhoto && activeVer?.durationSeconds) {
        const mins = Math.floor(activeVer.durationSeconds / 60);
        const secs = Math.round(activeVer.durationSeconds % 60);
        durationStr = `${mins.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`;
      }

      return {
        id: a.id,
        title: a.title,
        type: isPhoto ? "photo" : "video",
        versionNumber: activeVer?.versionNumber || 1,
        fileSizeBytes: activeVer?.fileSizeBytes || 0,
        duration: durationStr,
        aspectRatio: a.aspectRatio || "16:9",
        thumbnailUrl:
          resolveThumbnailUrl(activeVer?.thumbnailUrl, activeVer?.rawFileUrl, isPhoto) || "",
        downloadUrl: resolveMediaUrl(activeVer?.downloadUrl || activeVer?.rawFileUrl),
        proxyDownloadUrl: (activeVer as any)?.proxyDownloadUrl || null,
        isApproved: Boolean(a.isApproved),
      };
    });

    return {
      success: true,
      items: downloadItems,
      totalCount: downloadItems.length,
    };
  } catch (err: any) {
    console.error("[getDeliveryDownloadManifestAction] Error:", err);
    return {
      success: false,
      error: err?.message || "Failed to load complete delivery package",
    };
  }
}

export async function recordClientDownloadAction(params: {
  deliveryId: string;
  assetTitle?: string;
  downloadedCount?: number;
}) {
  try {
    const validated = safeValidate(recordClientDownloadSchema, params);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const core = await import("@/core/server").then((m) => m.getServerCore());
    const delivery = await core.services.delivery.getDeliveryById(validated.data.deliveryId);
    if (!delivery || !delivery.notifyOnDownload) {
      return { success: true, notified: false };
    }

    // Check workspace-level notification preference
    try {
      const settings = await core.services.settings.findByWorkspaceId(delivery.workspaceId);
      if (settings && !settings.notifyDownloads) {
        return { success: true, notified: false };
      }
    } catch {
      // Proceed if settings lookup fails
    }

    const workspace = await core.services.workspace.getWorkspaceById(delivery.workspaceId);
    const members = await core.services.member.listMembers(delivery.workspaceId);
    const notifyEmails = members
      .filter((m) => (m.role === "owner" || m.role === "admin") && Boolean(m.email))
      .map((m) => m.email as string);

    if (notifyEmails.length === 0) {
      return { success: true, notified: false };
    }

    const brandName = workspace?.brandName || "Studio";
    const accentColor = workspace?.accentColor || "#f5551d";
    const itemDesc =
      params.downloadedCount && params.downloadedCount > 1
        ? `${params.downloadedCount} master deliverables`
        : params.assetTitle
        ? `"${params.assetTitle}"`
        : "master deliverables";

    const subject = `📥 Client downloaded ${itemDesc} — ${delivery.title}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0e0e11; color:#f6f3ec; padding:32px; border-radius:16px; max-width:560px; margin:0 auto;">
        <p style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${accentColor}; font-weight:700; margin:0 0 8px;">${brandName} · Download Alert</p>
        <h2 style="font-size:20px; margin:0 0 12px; color:#ffffff;">Deliverables Downloaded</h2>
        <p style="font-size:14px; line-height:1.6; color:#aeaeb4; margin:0 0 20px;">
          Your client just initiated a download of <strong style="color:#ffffff;">${itemDesc}</strong> from the delivery room <strong style="color:#ffffff;">${delivery.title}</strong>.
        </p>
        <p style="font-size:11px; color:#71717a; margin:24px 0 0;">Sent automatically because "Notify on Download" is enabled for this delivery.</p>
      </div>
    `;

    for (const email of notifyEmails) {
      const sendRes = await core.services.email.sendEmail({
        to: email,
        subject,
        html,
      });
      await core.repositories.notification
        .create({
          workspaceId: delivery.workspaceId,
          projectId: delivery.id,
          clientId: delivery.clientId,
          channel: "email",
          recipientEmail: email,
          subject,
          status: sendRes.success ? "sent" : "failed",
          providerMessageId: sendRes.messageId,
          errorMessage: sendRes.error,
        })
        .catch(() => null);
    }

    return { success: true, notified: true };
  } catch (err: any) {
    console.warn("[recordClientDownloadAction] Warning:", err?.message || err);
    return { success: false };
  }
}




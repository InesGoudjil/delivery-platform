"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { getServerServices } from "@/core/server";

export async function verifyDeliveryPasscodeAction(
  shareToken: string,
  passcode: string,
  isCreatorBypass: boolean = false
) {
  try {
    const services = await getServerServices();
    const delivery = await services.delivery.getDeliveryByShareToken(shareToken);
    if (!delivery) {
      return { success: false, error: "Delivery not found or link has expired." };
    }

    let isAuthorized = !delivery.passcodeHash;

    if (!isAuthorized && isCreatorBypass) {
      const user = await services.auth.getCurrentUser();
      if (user) {
        const isMember = await services.member.isMember(delivery.workspaceId, user.id).catch(() => false);
        if (isMember) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      const cleanPasscode = passcode.trim();
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

    revalidatePath(`/deliver/${shareToken}`);
    return { success: true, assets: mappedAssets };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to verify passcode." };
  }
}

export async function verifyPassphraseWithTokenAction(shareToken: string, candidatePassphrase: string) {
  try {
    const services = await getServerServices();
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
  clientNameOrId?: string
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) return { error: "User is not authenticated." };

    let clientId: string | undefined = undefined;
    if (clientNameOrId && clientNameOrId.trim()) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientNameOrId);
      if (isUuid) {
        clientId = clientNameOrId;
      } else {
        const existingClients = await services.client.listClients(workspaceId);
        const existingClient = existingClients.find(
          (c) => c.name.toLowerCase() === clientNameOrId.trim().toLowerCase()
        );
        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const newClient = await services.client.createClient({
            workspaceId,
            name: clientNameOrId.trim(),
          });
          clientId = newClient.id;
        }
      }
    }

    const delivery = await services.delivery.createDelivery({
      workspaceId,
      title: title || "Untitled Delivery",
      description: description || undefined,
      clientId,
    });

    revalidatePath("/deliveries");
    return { success: true, delivery, project: delivery };
  } catch (err: any) {
    return { error: err.message || "Failed to create delivery." };
  }
}

export async function approveCutAction(deliveryId: string, approvedByName?: string) {
  try {
    const services = await getServerServices();

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
      const existing = await services.delivery.getDeliveryById(deliveryId);
      if (existing) {
        const members = await services.member.listMembers(existing.workspaceId);
        notifyEmails = members
          .filter((m) => (m.role === "owner" || m.role === "admin") && Boolean(m.email))
          .map((m) => m.email as string);
      }
    } catch {
      // fallback
    }

    const delivery = await services.delivery.approveCut(deliveryId, approvedByName, {
      origin,
      notifyEmails,
    });

    revalidatePath(`/deliver/${delivery.shareToken}`);
    revalidatePath(`/deliveries/${delivery.id}`);
    return { success: true, delivery, project: delivery };
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
    const services = await getServerServices();
    const asset = await services.delivery.toggleAssetApproval(deliveryId, assetId, isApproved);
    const delivery = await services.delivery.getDeliveryById(deliveryId);

    if (delivery?.shareToken) {
      revalidatePath(`/deliver/${delivery.shareToken}`);
    }
    revalidatePath(`/deliveries/${deliveryId}`);
    return { success: true, asset, delivery };
  } catch (err: any) {
    return { error: err.message || "Failed to toggle asset approval." };
  }
}

export async function approveAllAssetsAction(deliveryId: string, approvedByName?: string) {
  try {
    const services = await getServerServices();
    await services.delivery.approveAllAssets(deliveryId, approvedByName);
    const delivery = await services.delivery.getDeliveryById(deliveryId);

    if (delivery?.shareToken) {
      revalidatePath(`/deliver/${delivery.shareToken}`);
    }
    revalidatePath(`/deliveries/${deliveryId}`);
    return { success: true, delivery };
  } catch (err: any) {
    return { error: err.message || "Failed to approve all assets." };
  }
}

export async function publishDeliveryToPortfolioAction(
  deliveryId: string,
  portfolioId: string,
  options?: { title?: string; description?: string; category?: string }
) {
  try {
    const services = await getServerServices();
    const showcaseProject = await services.delivery.publishToPortfolio(deliveryId, portfolioId, options);

    revalidatePath("/portfolio");
    revalidatePath(`/deliveries/${deliveryId}`);
    return { success: true, showcaseProject };
  } catch (err: any) {
    return { error: err.message || "Failed to publish delivery to portfolio." };
  }
}

export async function updateDeliveryDetailsAction(
  deliveryId: string,
  data: { title?: string; description?: string; clientName?: string; status?: any; location?: string; deliveryDate?: string }
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) return { error: "User is not authenticated." };

    let clientId: string | undefined = undefined;
    if (data.clientName) {
      const workspace = await services.workspace.getOrCreateWorkspace(user.id);
      const existingClients = await services.client.listClients(workspace.id);
      const existingClient = existingClients.find(
        (c) => c.name.toLowerCase() === data.clientName?.toLowerCase()
      );

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const newClient = await services.client.createClient({
          workspaceId: workspace.id,
          name: data.clientName,
        });
        clientId = newClient.id;
      }
    }

    const updated = await services.delivery.updateDelivery(deliveryId, {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(clientId !== undefined ? { clientId } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.deliveryDate !== undefined ? { deliveryDate: data.deliveryDate } : {}),
    });

    revalidatePath(`/deliveries/${deliveryId}`);
    revalidatePath(`/deliver/${updated.shareToken}`);
    return { success: true, delivery: updated, project: updated };
  } catch (err: any) {
    return { error: err.message || "Failed to update delivery details." };
  }
}

export async function archiveDeliveryAction(deliveryId: string) {
  try {
    const services = await getServerServices();
    const updated = await services.delivery.updateStatus(deliveryId, "archived");

    revalidatePath("/deliveries");
    revalidatePath(`/deliveries/${deliveryId}`);
    return { success: true, delivery: updated, project: updated };
  } catch (err: any) {
    return { error: err.message || "Failed to archive delivery." };
  }
}

export async function updateDeliverySecurityAction(
  deliveryId: string,
  data: {
    passphrase?: string | null;
    isDownloadAllowed?: boolean;
    notifyOnDownload?: boolean;
    expiresAt?: string | null;
  }
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) return { error: "User is not authenticated." };

    let passcodeHash: string | null | undefined = undefined;
    if (data.passphrase !== undefined) {
      if (data.passphrase && data.passphrase.trim().length > 0) {
        const clean = data.passphrase.trim();
        passcodeHash = createHash("sha256").update(clean).digest("hex");
      } else {
        passcodeHash = null;
      }
    }

    const updated = await services.delivery.updateDelivery(deliveryId, {
      ...(passcodeHash !== undefined ? { passcodeHash } : {}),
      ...(data.isDownloadAllowed !== undefined ? { isDownloadAllowed: data.isDownloadAllowed } : {}),
      ...(data.notifyOnDownload !== undefined ? { notifyOnDownload: data.notifyOnDownload } : {}),
      ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
    });

    revalidatePath(`/deliveries/${deliveryId}`);
    revalidatePath(`/deliver/${updated.shareToken}`);

    return {
      success: true,
      delivery: updated,
      passcodeProtected: Boolean(updated.passcodeHash),
    };
  } catch (err: any) {
    return { error: err.message || "Failed to update delivery security." };
  }
}

export async function sendDeliveryEmailAction(
  deliveryId: string,
  recipientEmail: string,
  customMessage?: string
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) return { success: false, error: "User is not authenticated." };

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
      deliveryId,
      recipientEmail: recipientEmail.trim().toLowerCase(),
      customMessage,
      origin,
    });

    revalidatePath(`/deliveries/${deliveryId}`);
    return { success: res.success, log: res.log, error: res.error };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send delivery email." };
  }
}



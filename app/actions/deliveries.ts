"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { getServerServices } from "@/core/server";

export async function verifyDeliveryPasscodeAction(shareToken: string, passcode: string) {
  try {
    const services = await getServerServices();
    const delivery = await services.delivery.getDeliveryByShareToken(shareToken);
    if (!delivery) {
      return { success: false, error: "Delivery not found or link has expired." };
    }

    if (!delivery.passcodeHash) {
      return { success: true };
    }

    const cleanPasscode = passcode.trim();
    const hashed = createHash("sha256").update(cleanPasscode).digest("hex");

    const isMatch = delivery.passcodeHash === cleanPasscode || delivery.passcodeHash === hashed;
    if (!isMatch) {
      return { success: false, error: "Incorrect passcode. Please try again." };
    }

    // Set HTTP-only cookie valid for 7 days
    const cookieStore = await cookies();
    cookieStore.set(`delivery_access_${shareToken}`, "verified", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: `/deliver/${shareToken}`,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to verify passcode." };
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
    const delivery = await services.delivery.approveCut(deliveryId, approvedByName);

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


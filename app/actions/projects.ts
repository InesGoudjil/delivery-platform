"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";

export async function createWorkspaceProjectAction(
  workspaceId: string,
  title: string,
  description?: string
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) return { error: "User is not authenticated." };

    const delivery = await services.delivery.createDelivery({
      workspaceId,
      title: title || "Untitled Delivery",
      description: description || undefined,
    });

    revalidatePath("/deliveries");
    return { success: true, project: delivery, delivery };
  } catch (err: any) {
    return { error: err.message || "Failed to create delivery." };
  }
}

export async function createProjectAction(formData: FormData) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) return { error: "User is not authenticated." };

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const workspace = await services.workspace.getOrCreateWorkspace(user.id);

    const delivery = await services.delivery.createDelivery({
      workspaceId: workspace.id,
      title: title || "Untitled Delivery",
      description: description || undefined,
    });

    revalidatePath("/deliveries");
    return { success: true, project: delivery, delivery };
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
    return { success: true, project: delivery, delivery };
  } catch (err: any) {
    return { error: err.message || "Failed to approve cut." };
  }
}

export async function updateProjectDetailsAction(
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
    return { success: true, project: updated, delivery: updated };
  } catch (err: any) {
    return { error: err.message || "Failed to update project details." };
  }
}

export async function archiveProjectAction(deliveryId: string) {
  try {
    const services = await getServerServices();
    const delivery = await services.delivery.updateStatus(deliveryId, "archived");

    revalidatePath(`/deliveries/${deliveryId}`);
    revalidatePath("/deliveries");
    return { success: true, project: delivery, delivery };
  } catch (err: any) {
    return { error: err.message || "Failed to archive delivery." };
  }
}

export async function createShowcaseProjectAction(
  workspaceId: string,
  portfolioId: string,
  data: {
    title: string;
    clientName?: string;
    description?: string;
    category?: string;
    coverAssetUrl?: string;
  }
) {
  try {
    const services = await getServerServices();
    const project = await services.project.createProject({
      workspaceId,
      portfolioId,
      title: data.title,
      clientName: data.clientName,
      description: data.description,
      category: data.category || "Commercial",
      coverAssetUrl: data.coverAssetUrl,
    });

    revalidatePath("/portfolio");
    return { success: true, project };
  } catch (err: any) {
    return { error: err.message || "Failed to create showcase project." };
  }
}

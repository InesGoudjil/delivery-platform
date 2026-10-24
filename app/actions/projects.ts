"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import { requireWorkspaceMember } from "@/core/security/guards";
import {
  createWorkspaceProjectSchema,
  createShowcaseProjectSchema,
  updateDeliveryDetailsSchema,
  safeValidate,
  type CreateShowcaseProjectInput,
} from "@/lib/validations";

export async function createWorkspaceProjectAction(
  workspaceId: string,
  title: string,
  description?: string
) {
  try {
    const validated = safeValidate(createWorkspaceProjectSchema, {
      workspaceId,
      title,
      description,
    });
    if (!validated.success) return { error: validated.error };

    const { services, user } = await requireWorkspaceMember(validated.data.workspaceId, "editor");

    const delivery = await services.delivery.createDelivery({
      workspaceId: validated.data.workspaceId,
      title: validated.data.title,
      description: validated.data.description,
    });

    revalidatePath("/[workspaceSlug]/deliveries", "page");
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

    const workspace = await services.workspace.getOrCreateWorkspace(user.id);

    const validated = safeValidate(createWorkspaceProjectSchema, {
      workspaceId: workspace.id,
      title: formData.get("title") || undefined,
      description: formData.get("description") || undefined,
    });
    if (!validated.success) return { error: validated.error };

    const delivery = await services.delivery.createDelivery({
      workspaceId: workspace.id,
      title: validated.data.title,
      description: validated.data.description,
    });

    if (workspace?.slug) {
      revalidatePath(`/${workspace.slug}/deliveries`);
    }
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, project: delivery, delivery };
  } catch (err: any) {
    return { error: err.message || "Failed to create delivery." };
  }
}

export async function approveCutAction(deliveryId: string, approvedByName?: string) {
  try {
    if (!deliveryId?.trim()) return { error: "Delivery ID is required." };

    const services = await getServerServices();
    const delivery = await services.delivery.approveCut(deliveryId.trim(), approvedByName?.trim());

    revalidatePath(`/deliver/${delivery.shareToken}`);
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
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
    if (!deliveryId?.trim()) return { error: "Delivery ID is required." };

    const validated = safeValidate(updateDeliveryDetailsSchema, data);
    if (!validated.success) return { error: validated.error };

    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) return { error: "User is not authenticated." };

    let clientId: string | undefined = undefined;
    if (validated.data.clientName) {
      const workspace = await services.workspace.getOrCreateWorkspace(user.id);
      const existingClients = await services.client.listClients(workspace.id);
      const existingClient = existingClients.find(
        (c) => c.name.toLowerCase() === validated.data.clientName?.toLowerCase()
      );

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const newClient = await services.client.createClient({
          workspaceId: workspace.id,
          name: validated.data.clientName,
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
    return { success: true, project: updated, delivery: updated };
  } catch (err: any) {
    return { error: err.message || "Failed to update project details." };
  }
}

export async function archiveProjectAction(deliveryId: string) {
  try {
    if (!deliveryId?.trim()) return { error: "Delivery ID is required." };

    const services = await getServerServices();
    const delivery = await services.delivery.updateStatus(deliveryId.trim(), "archived");

    revalidatePath("/[workspaceSlug]/deliveries", "page");
    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
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
    assetIds?: string[];
  }
) {
  try {
    const validated = safeValidate(createShowcaseProjectSchema, {
      workspaceId,
      portfolioId,
      ...data,
    });
    if (!validated.success) return { success: false, error: validated.error };

    const services = await getServerServices();
    const project = await services.project.createProject({
      workspaceId: validated.data.workspaceId,
      portfolioId: validated.data.portfolioId,
      title: validated.data.title,
      clientName: validated.data.clientName,
      description: validated.data.description,
      category: validated.data.category,
      coverAssetUrl: validated.data.coverAssetUrl,
    });

    if (data.assetIds && data.assetIds.length > 0) {
      for (let i = 0; i < data.assetIds.length; i++) {
        await services.project.attachAssetToProject(project.id, data.assetIds[i], i);
      }
    }

    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/p/[handle]", "page");
    return { success: true, project };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create showcase project." };
  }
}

export async function attachAssetsToShowcaseProjectAction(
  projectId: string,
  assetIds: string[]
) {
  try {
    if (!projectId || !assetIds || assetIds.length === 0) {
      return { success: true };
    }
    const services = await getServerServices();
    for (let i = 0; i < assetIds.length; i++) {
      await services.project.attachAssetToProject(projectId, assetIds[i], i);
    }
    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/p/[handle]", "page");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to attach assets to project." };
  }
}

export async function updateShowcaseProjectCoverAction(
  projectId: string,
  coverAssetUrl: string
) {
  try {
    const services = await getServerServices();
    const updated = await services.project.updateProject(projectId, { coverAssetUrl });
    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/p/[handle]", "page");
    return { success: true, project: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update project cover." };
  }
}


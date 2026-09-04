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

    if (!user) {
      return { error: "User is not authenticated." };
    }

    const project = await services.project.createProject({
      workspaceId,
      title: title || "Untitled Project",
      description: description || undefined,
    });

    revalidatePath("/portfolio");
    return { success: true, project };
  } catch (err: any) {
    return { error: err.message || "Failed to create project." };
  }
}

export async function createProjectAction(formData: FormData) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { error: "User is not authenticated." };
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    const workspace = await services.workspace.getOrCreateWorkspace(user.id);

    const project = await services.project.createProject({
      workspaceId: workspace.id,
      title: title || "Untitled Project",
      description: description || undefined,
    });

    revalidatePath("/dashboard");
    return { success: true, project };
  } catch (err: any) {
    return { error: err.message || "Failed to create project." };
  }
}

export async function approveCutAction(projectId: string, approvedByName?: string) {
  try {
    const services = await getServerServices();
    const project = await services.project.approveCut(projectId, approvedByName);

    revalidatePath(`/deliver/${project.shareToken}`);
    revalidatePath(`/deliver/${project.id}`);
    return { success: true, project };
  } catch (err: any) {
    return { error: err.message || "Failed to approve cut." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SupabaseWorkspaceRepository } from "@/infrastructure/repositories/supabase-workspace.repository";
import { SupabaseProjectRepository } from "@/infrastructure/repositories/supabase-project.repository";
import { GetOrCreateWorkspaceUseCase } from "@/core/use-cases/workspace/get-or-create-workspace.use-case";
import { CreateProjectUseCase } from "@/core/use-cases/projects/create-project.use-case";
import { ApproveProjectUseCase } from "@/core/use-cases/projects/approve-project.use-case";

export async function createProjectAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User is not authenticated." };
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    const workspaceRepo = new SupabaseWorkspaceRepository(supabase);
    const getWorkspaceUseCase = new GetOrCreateWorkspaceUseCase(workspaceRepo);
    const workspace = await getWorkspaceUseCase.execute(user.id);

    const projectRepo = new SupabaseProjectRepository(supabase);
    const createProjectUseCase = new CreateProjectUseCase(projectRepo);

    const project = await createProjectUseCase.execute({
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
    const supabase = await createClient();
    const projectRepo = new SupabaseProjectRepository(supabase);
    const approveUseCase = new ApproveProjectUseCase(projectRepo);

    const project = await approveUseCase.execute(projectId, approvedByName);

    revalidatePath(`/deliver/${project.shareToken}`);
    revalidatePath(`/deliver/${project.id}`);
    return { success: true, project };
  } catch (err: any) {
    return { error: err.message || "Failed to approve cut." };
  }
}

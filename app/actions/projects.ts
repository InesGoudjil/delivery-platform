"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import { requireUser, requireWorkspaceMember } from "@/core/security/guards";
import {
  createWorkspaceProjectSchema,
  createShowcaseProjectSchema,
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

    const { workspaceId: cleanWorkspaceId, portfolioId: cleanPortfolioId } = validated.data;
    const { services } = await requireWorkspaceMember(cleanWorkspaceId, "editor");

    // The portfolio must belong to the caller's workspace.
    const portfolio = await services.portfolio.getPortfolioById(cleanPortfolioId);
    if (!portfolio || portfolio.workspaceId !== cleanWorkspaceId) {
      return { success: false, error: "Portfolio not found in this workspace." };
    }

    const assetIds = await assertAssetsBelongToWorkspace(
      services,
      cleanWorkspaceId,
      validated.data.assetIds || []
    );

    const project = await services.project.createProject({
      workspaceId: cleanWorkspaceId,
      portfolioId: cleanPortfolioId,
      title: validated.data.title,
      clientName: validated.data.clientName,
      description: validated.data.description,
      category: validated.data.category,
      coverAssetUrl: validated.data.coverAssetUrl,
    });

    for (let i = 0; i < assetIds.length; i++) {
      await services.project.attachAssetToProject(project.id, assetIds[i], i);
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
    const { project, services } = await requireShowcaseProjectEditor(projectId);
    const cleanAssetIds = await assertAssetsBelongToWorkspace(services, project.workspaceId, assetIds);

    for (let i = 0; i < cleanAssetIds.length; i++) {
      await services.project.attachAssetToProject(project.id, cleanAssetIds[i], i);
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
    const cleanCoverUrl = typeof coverAssetUrl === "string" ? coverAssetUrl.trim() : "";
    if (!cleanCoverUrl || cleanCoverUrl.length > 2048) {
      return { success: false, error: "A valid cover image URL is required." };
    }

    const { project, services } = await requireShowcaseProjectEditor(projectId);
    const updated = await services.project.updateProject(project.id, { coverAssetUrl: cleanCoverUrl });
    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/p/[handle]", "page");
    return { success: true, project: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update project cover." };
  }
}


type ServerServices = Awaited<ReturnType<typeof getServerServices>>;

const MAX_SHOWCASE_ASSETS = 500;

/**
 * Loads a showcase project and requires the caller to be an editor (or above)
 * of the workspace that owns it.
 */
async function requireShowcaseProjectEditor(projectId: string) {
  const cleanId = typeof projectId === "string" ? projectId.trim() : "";
  if (!cleanId) throw new Error("Project ID is required.");

  const { services: userServices } = await requireUser();
  const project = await userServices.project.getProjectById(cleanId);
  if (!project) throw new Error("Showcase project not found.");

  const { services } = await requireWorkspaceMember(project.workspaceId, "editor");
  return { project, services };
}

/**
 * Throws unless every asset exists and belongs to the given workspace, so a
 * showcase can never surface another studio's files. Returns the trimmed IDs.
 */
async function assertAssetsBelongToWorkspace(
  services: ServerServices,
  workspaceId: string,
  assetIds: unknown[]
): Promise<string[]> {
  if (!Array.isArray(assetIds)) {
    throw new Error("Asset IDs must be a list.");
  }
  if (assetIds.length > MAX_SHOWCASE_ASSETS) {
    throw new Error(`A showcase project can include at most ${MAX_SHOWCASE_ASSETS} assets.`);
  }

  const cleanIds = assetIds.map((assetId) => (typeof assetId === "string" ? assetId.trim() : ""));
  const assets = await Promise.all(
    cleanIds.map((id) => (id ? services.asset.getAssetById(id) : Promise.resolve(null)))
  );
  if (assets.some((asset) => !asset || asset.workspaceId !== workspaceId)) {
    throw new Error("One or more assets do not belong to this workspace.");
  }
  return cleanIds;
}

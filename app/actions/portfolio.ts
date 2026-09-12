"use server";

import { getServerServices } from "@/core/server";
import { revalidatePath } from "next/cache";
import { resolveMediaUrl } from "@/lib/media";

export async function updatePortfolioAction(
  portfolioId: string,
  data: {
    title?: string;
    bio?: string | null;
    coverAssetUrl?: string | null;
    socialLinks?: Record<string, string | undefined>;
    isPublished?: boolean;
    appearance?: any;
    experience?: any[];
    whatsappNumber?: string | null;
    stats?: any;
    layoutTemplate?: string;
  }
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const updated = await services.portfolio.updatePortfolio(portfolioId, data);
    return { success: true, portfolio: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update portfolio." };
  }
}

export async function toggleFeaturedItemAction(
  portfolioId: string,
  itemId: string,
  itemType: "project" | "asset",
  isFeatured: boolean
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    if (itemType === "project") {
      await services.project.updateProject(itemId, { isPublished: isFeatured });
    }

    revalidatePath("/portfolio");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update featured item." };
  }
}

export async function toggleFeaturedProjectAction(
  portfolioId: string,
  projectId: string,
  isFeatured: boolean
) {
  return toggleFeaturedItemAction(portfolioId, projectId, "project", isFeatured);
}

export async function updateBrandingAction(
  workspaceId: string,
  portfolioId: string,
  data: {
    brandName?: string;
    accentColor?: string;
    bio?: string | null;
    coverAssetUrl?: string | null;
    whatsappNumber?: string | null;
    slug?: string;
  }
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    if (data.brandName !== undefined || data.accentColor !== undefined) {
      await services.workspace.updateWorkspaceBranding(workspaceId, {
        brandName: data.brandName,
        accentColor: data.accentColor,
      });
    }

    const portfolioUpdate: any = {};
    if (data.bio !== undefined) portfolioUpdate.bio = data.bio;
    if (data.coverAssetUrl !== undefined) portfolioUpdate.coverAssetUrl = data.coverAssetUrl;
    if (data.whatsappNumber !== undefined) portfolioUpdate.whatsappNumber = data.whatsappNumber;
    if (data.brandName !== undefined) portfolioUpdate.title = `${data.brandName} Portfolio`;

    let updatedPortfolio = null;
    if (Object.keys(portfolioUpdate).length > 0) {
      updatedPortfolio = await services.portfolio.updatePortfolio(portfolioId, portfolioUpdate);
    }

    if (data.slug) {
      revalidatePath(`/${data.slug}/settings`);
      revalidatePath(`/${data.slug}/portfolio`);
      revalidatePath(`/p/${data.slug}`);
    }

    return { success: true, portfolio: updatedPortfolio };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update branding." };
  }
}

export async function getProjectAssetsAction(projectId: string) {
  try {
    const services = await getServerServices();
    const project = await services.project.getProjectById(projectId);
    const deliveryId = project?.sourceDeliveryId || projectId;

    let assets = await services.asset.listAssets(deliveryId);
    if (assets.length === 0 && project && project.id !== deliveryId) {
      assets = await services.asset.listAssets(project.id);
    }

    const enriched = await Promise.all(
      assets.map(async (a) => {
        const activeVersion = await services.asset.getActiveVersion(a.id);
        const isStill = a.type === "photo_gallery";
        const rawMedia =
          activeVersion?.rawFileUrl ||
          activeVersion?.hlsManifestUrl ||
          activeVersion?.thumbnailUrl ||
          "";
        const rawThumb =
          activeVersion?.thumbnailUrl || activeVersion?.rawFileUrl || "";
        return {
          id: a.id,
          title: a.title,
          type: isStill ? ("still" as const) : ("film" as const),
          url: resolveMediaUrl(rawMedia),
          thumbnailUrl: resolveMediaUrl(rawThumb),
          aspectRatio: a.aspectRatio || "16:9",
          duration: activeVersion?.durationSeconds
            ? `${Math.floor(activeVersion.durationSeconds / 60)}:${String(
                Math.floor(activeVersion.durationSeconds % 60)
              ).padStart(2, "0")}`
            : null,
          category: isStill ? "Photo Still" : "Film Cut",
        };
      })
    );

    return { success: true, assets: enriched };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to load project assets.",
      assets: [],
    };
  }
}


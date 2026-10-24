"use server";

import { getServerServices } from "@/core/server";
import { requireUser, requireWorkspaceMember } from "@/core/security/guards";
import { revalidatePath } from "next/cache";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import {
  updatePortfolioSchema,
  updateBrandingSchema,
  toggleFeaturedItemSchema,
  reorderFeaturedItemsSchema,
  safeValidate,
  type UpdatePortfolioInput,
  type UpdateBrandingInput,
} from "@/lib/validations";

export async function updatePortfolioAction(
  portfolioId: string,
  data: UpdatePortfolioInput
) {
  try {
    if (!portfolioId?.trim()) {
      return { success: false, error: "Portfolio ID is required." };
    }

    const validated = safeValidate(updatePortfolioSchema, data);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { services, user } = await requireUser();

    const current = await services.portfolio.getPortfolioById(portfolioId.trim());
    if (!current) {
      return { success: false, error: "Portfolio not found." };
    }

    await requireWorkspaceMember(current.workspaceId, "editor");

    const updatePayload = { ...validated.data };
    if (updatePayload.appearance) {
      const existingAppearance: any = current.appearance || {};
      updatePayload.appearance = {
        ...existingAppearance,
        ...updatePayload.appearance,
        featuredItemIds:
          updatePayload.appearance.featuredItemIds !== undefined
            ? updatePayload.appearance.featuredItemIds
            : (existingAppearance.featuredItemIds || []),
      };
    }

    const updated = await services.portfolio.updatePortfolio(portfolioId.trim(), updatePayload);

    if (current.slug) {
      revalidatePath(`/${current.slug}/portfolio`);
      revalidatePath(`/p/${current.slug}`);
      revalidatePath(`/${current.slug}`, "layout");
    }
    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/p/[handle]", "page");

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
    const validated = safeValidate(toggleFeaturedItemSchema, {
      portfolioId,
      itemId,
      itemType,
      isFeatured,
    });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { services, user } = await requireUser();

    const portfolio = await services.portfolio.getPortfolioById(validated.data.portfolioId);
    if (!portfolio) {
      return { success: false, error: "Portfolio not found." };
    }

    await requireWorkspaceMember(portfolio.workspaceId, "editor");

    const currentAppearance = portfolio.appearance || {
      cardSize: "M",
      aspectRatio: "16:9",
      thumbnailScale: "fill",
      showClientInfo: true,
      featuredItemIds: [],
    };

    const currentFeaturedIds = Array.isArray(currentAppearance.featuredItemIds)
      ? [...currentAppearance.featuredItemIds]
      : [];

    let updatedFeaturedIds: string[];
    if (validated.data.isFeatured) {
      if (!currentFeaturedIds.includes(validated.data.itemId)) {
        updatedFeaturedIds = [...currentFeaturedIds, validated.data.itemId];
      } else {
        updatedFeaturedIds = currentFeaturedIds;
      }
    } else {
      updatedFeaturedIds = currentFeaturedIds.filter((id) => id !== validated.data.itemId);
    }

    await services.portfolio.updatePortfolio(validated.data.portfolioId, {
      appearance: {
        ...currentAppearance,
        featuredItemIds: updatedFeaturedIds,
      },
    });

    if (portfolio.slug) {
      revalidatePath(`/${portfolio.slug}/portfolio`);
      revalidatePath(`/p/${portfolio.slug}`);
    }
    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/p/[handle]", "page");

    return { success: true, featuredItemIds: updatedFeaturedIds };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update featured item." };
  }
}

export async function reorderFeaturedItemsAction(
  portfolioId: string,
  itemIds: string[]
) {
  try {
    const validated = safeValidate(reorderFeaturedItemsSchema, { portfolioId, itemIds });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { services, user } = await requireUser();

    const portfolio = await services.portfolio.getPortfolioById(validated.data.portfolioId);
    if (!portfolio) {
      return { success: false, error: "Portfolio not found." };
    }

    await requireWorkspaceMember(portfolio.workspaceId, "editor");

    const currentAppearance = portfolio.appearance || {
      cardSize: "M",
      aspectRatio: "16:9",
      thumbnailScale: "fill",
      showClientInfo: true,
      featuredItemIds: [],
    };

    await services.portfolio.updatePortfolio(validated.data.portfolioId, {
      appearance: {
        ...currentAppearance,
        featuredItemIds: validated.data.itemIds,
      },
    });

    if (portfolio.slug) {
      revalidatePath(`/${portfolio.slug}/portfolio`);
      revalidatePath(`/p/${portfolio.slug}`);
    }
    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/p/[handle]", "page");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to reorder featured items." };
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
  data: UpdateBrandingInput
) {
  try {
    if (!workspaceId?.trim()) return { success: false, error: "Workspace ID is required." };
    if (!portfolioId?.trim()) return { success: false, error: "Portfolio ID is required." };

    const validated = safeValidate(updateBrandingSchema, data);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { services, user } = await requireWorkspaceMember(workspaceId.trim(), "admin");

    const cleanData = validated.data;

    if (cleanData.accentColor !== undefined || cleanData.logoUrl !== undefined) {
      const canBranding = await services.subscription.isBrandingAllowed(workspaceId.trim());
      if (!canBranding) {
        return {
          success: false,
          error: "Custom studio logo and accent color branding are available on Pro and Studio plans. Please upgrade your subscription.",
        };
      }
    }

    if (cleanData.whatsappNumber && cleanData.whatsappNumber.trim()) {
      const canWhatsApp = await services.subscription.canDeliverWhatsApp(workspaceId.trim());
      if (!canWhatsApp) {
        return {
          success: false,
          error: "WhatsApp integration is available on Basic, Pro, and Studio plans. Please upgrade your subscription.",
        };
      }
    }

    const wsUpdate: any = {};
    if (cleanData.brandName !== undefined) wsUpdate.brandName = cleanData.brandName;
    if (cleanData.accentColor !== undefined) wsUpdate.accentColor = cleanData.accentColor;
    if (cleanData.logoUrl !== undefined) wsUpdate.logoUrl = cleanData.logoUrl;

    if (Object.keys(wsUpdate).length > 0) {
      await services.workspace.updateWorkspaceBranding(workspaceId.trim(), wsUpdate);
    }

    if (cleanData.avatarUrl !== undefined) {
      await services.profile.updateProfile(user.id, {
        avatarUrl: cleanData.avatarUrl,
      });
    }

    const portfolioUpdate: any = {};
    if (cleanData.bio !== undefined) portfolioUpdate.bio = cleanData.bio;
    if (cleanData.coverAssetUrl !== undefined) portfolioUpdate.coverAssetUrl = cleanData.coverAssetUrl;
    if (cleanData.whatsappNumber !== undefined) portfolioUpdate.whatsappNumber = cleanData.whatsappNumber;
    if (cleanData.brandName !== undefined) portfolioUpdate.title = `${cleanData.brandName} Portfolio`;
    if (cleanData.experience !== undefined) portfolioUpdate.experience = cleanData.experience;
    if (cleanData.stats !== undefined) portfolioUpdate.stats = cleanData.stats;

    if (cleanData.heroCover !== undefined) {
      const currentPortfolio = await services.portfolio.getPortfolioById(portfolioId.trim());
      const existingAppearance: any = currentPortfolio?.appearance || {};
      portfolioUpdate.appearance = {
        ...existingAppearance,
        heroCover: cleanData.heroCover,
      };
      if (cleanData.heroCover?.thumbnailUrl && !cleanData.coverAssetUrl) {
        portfolioUpdate.coverAssetUrl = cleanData.heroCover.thumbnailUrl;
      }
    }

    let updatedPortfolio = null;
    if (Object.keys(portfolioUpdate).length > 0) {
      updatedPortfolio = await services.portfolio.updatePortfolio(portfolioId.trim(), portfolioUpdate);
    }

    if (cleanData.slug) {
      revalidatePath(`/${cleanData.slug}`, "layout");
      revalidatePath(`/${cleanData.slug}/settings`);
      revalidatePath(`/${cleanData.slug}/portfolio`);
      revalidatePath(`/p/${cleanData.slug}`);
    } else {
      revalidatePath("/[workspaceSlug]", "layout");
      revalidatePath("/[workspaceSlug]/settings", "page");
      revalidatePath("/[workspaceSlug]/portfolio", "page");
      revalidatePath("/p/[handle]", "page");
    }

    return { success: true, portfolio: updatedPortfolio };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update branding." };
  }
}

export async function getProjectAssetsAction(projectId: string) {
  try {
    if (!projectId?.trim()) return { success: true, assets: [] };

    const services = await getServerServices();
    const project = await services.project.getProjectById(projectId.trim());
    const deliveryId = project?.sourceDeliveryId || projectId.trim();

    let assets = await services.asset.listAssets(deliveryId);
    if (assets.length === 0 && project && project.id !== deliveryId) {
      assets = await services.asset.listAssets(project.id);
    }

    if (assets.length === 0 && project) {
      const projectWithAssets = await services.project.getProjectWithAssets(project.id);
      if (projectWithAssets?.assets && projectWithAssets.assets.length > 0) {
        assets = projectWithAssets.assets;
      }
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
        const resolvedThumb = resolveThumbnailUrl(
          activeVersion?.thumbnailUrl,
          rawMedia,
          isStill
        );
        return {
          id: a.id,
          title: a.title,
          type: isStill ? ("still" as const) : ("film" as const),
          url: resolveMediaUrl(rawMedia),
          thumbnailUrl: resolveMediaUrl(resolvedThumb),
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

export async function deleteAssetAction(
  assetId: string,
  options?: { deliveryId?: string; workspaceSlug?: string; portfolioId?: string; projectId?: string }
) {
  const { deleteAssetAction: del } = await import("./assets");
  return del(assetId, options);
}

export async function deletePortfolioItemAction(
  itemId: string,
  itemType: "film" | "still" | "project",
  portfolioId: string,
  workspaceSlug?: string
) {
  const { deletePortfolioItemAction: del } = await import("./assets");
  return del(itemId, itemType, portfolioId, workspaceSlug);
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

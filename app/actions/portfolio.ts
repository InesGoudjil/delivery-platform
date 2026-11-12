"use server";

import { getServerServices } from "@/core/server";
import { requireUser, requireWorkspaceMember } from "@/core/security/guards";
import { revalidatePath } from "next/cache";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import { PortfolioItem } from "@/core/entities/portfolio";
import {
  updatePortfolioSchema,
  updateBrandingSchema,
  toggleFeaturedItemSchema,
  reorderFeaturedItemsSchema,
  safeValidate,
  type UpdatePortfolioInput,
  type UpdateBrandingInput,
} from "@/lib/validations";

export interface WorkspacePortfolioData {
  items: PortfolioItem[];
  featuredIds: string[];
}

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

    // The id is a showcase project's, or a delivery's. Either way, members of its workspace only.
    const { services } = await requireUser();
    const project = await services.project.getProjectById(projectId.trim());
    const delivery = project ? null : await services.delivery.getDeliveryById(projectId.trim());
    const workspaceId = project?.workspaceId ?? delivery?.workspaceId;
    if (!workspaceId) return { success: true, assets: [] };
    await requireWorkspaceMember(workspaceId, "viewer");
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

import {
  deleteAssetAction as rawDeleteAsset,
  restoreAssetAction as rawRestoreAsset,
  permanentDeleteAssetAction as rawPermanentDeleteAsset,
  listTrashAssetsAction as rawListTrashAssets,
  emptyTrashAction as rawEmptyTrash,
  updateAssetAction as rawUpdateAsset,
  type DeleteAssetOptions,
  type UpdateAssetInput,
  type UpdateAssetOptions,
} from "./assets";

export async function deleteAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  return rawDeleteAsset(assetId, options);
}

export async function restoreAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  return rawRestoreAsset(assetId, options);
}

export async function permanentDeleteAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  return rawPermanentDeleteAsset(assetId, options);
}

export async function listTrashAssetsAction(workspaceId: string) {
  return rawListTrashAssets(workspaceId);
}

export async function emptyTrashAction(workspaceId: string, workspaceSlug?: string) {
  return rawEmptyTrash(workspaceId, workspaceSlug);
}

export async function updateAssetAction(
  itemId: string,
  data: UpdateAssetInput,
  options?: UpdateAssetOptions
) {
  return rawUpdateAsset(itemId, data, options);
}

/**
 * Deletes a portfolio item which can be a standalone film/still (asset)
 * or a showcase project container.
 */
export async function deletePortfolioItemAction(
  itemId: string,
  itemType: "film" | "still" | "project",
  portfolioId: string,
  workspaceSlug?: string
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    if (itemType === "project") {
      // Only showcase projects are removed here. Deliveries are deleted from the delivery
      // page (admins only); this path used to delete one at editor level.
      const project = await services.project.getProjectById(itemId);
      if (!project) {
        return { success: false, error: "Project not found." };
      }

      // Verify membership/role hierarchy (minimum: editor)
      await requireWorkspaceMember(project.workspaceId, "editor");

      // Clean up featured pinned item if needed
      try {
        const portfolio = await services.portfolio.getPortfolioById(portfolioId);
        if (portfolio && Array.isArray(portfolio.appearance?.featuredItemIds)) {
          if (portfolio.appearance.featuredItemIds.includes(itemId)) {
            const updatedFeatured = portfolio.appearance.featuredItemIds.filter(
              (id: string) => id !== itemId
            );
            await services.portfolio.updatePortfolio(portfolio.id, {
              appearance: {
                ...portfolio.appearance,
                featuredItemIds: updatedFeatured,
              },
            });
          }
        }
      } catch (portErr) {
        // Non-critical
      }

      // Delete the project
      await services.project.deleteProject(itemId);

      if (workspaceSlug) {
        revalidatePath(`/${workspaceSlug}/portfolio`);
        revalidatePath(`/p/${workspaceSlug}`);
      }
      revalidatePath("/[workspaceSlug]/portfolio", "page");
      revalidatePath("/p/[handle]", "page");

      return { success: true };
    } else {
      // Standalone film or still
      return await rawDeleteAsset(itemId, {
        portfolioId,
        workspaceSlug,
      });
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete portfolio item.",
    };
  }
}

/**
 * Retrieves the complete portfolio showcase items and featured reel IDs
 * for a workspace, suitable for SWR hydration and client-side mutations.
 */
export async function getWorkspacePortfolioDataAction(
  workspaceSlug: string
): Promise<{ success: boolean; data?: WorkspacePortfolioData; error?: string }> {
  try {
    if (!workspaceSlug?.trim()) {
      return { success: false, error: "Workspace slug is required." };
    }

    const { services } = await requireUser();
    const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }
    await requireWorkspaceMember(workspace.id, "viewer");

    const portfolio = await services.portfolio.getOrCreatePortfolio(
      workspace.id,
      `${workspace.brandName} Portfolio`,
      workspaceSlug
    );

    const [dbProjects, standaloneAssets] = await Promise.all([
      services.project.listPortfolioProjects(portfolio.id),
      services.asset.listPortfolioAssets(workspace.id),
    ]);

    const featuredItemIds: string[] = Array.isArray(portfolio.appearance?.featuredItemIds)
      ? portfolio.appearance.featuredItemIds
      : [];

    const mappedDbProjects: PortfolioItem[] = await Promise.all(
      dbProjects.map(async (p) => {
        const deliveryIdToQuery = p.sourceDeliveryId || p.id;
        let assets = await services.asset.listAssets(deliveryIdToQuery);
        if (assets.length === 0 && p.id !== deliveryIdToQuery) {
          assets = await services.asset.listAssets(p.id);
        }
        if (assets.length === 0) {
          const projectWithAssets = await services.project.getProjectWithAssets(p.id);
          if (projectWithAssets?.assets && projectWithAssets.assets.length > 0) {
            assets = projectWithAssets.assets;
          }
        }

        const projectAssets = await Promise.all(
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
              thumbnailUrl: resolvedThumb,
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

        let thumbnailUrl = "";
        if (projectAssets.length > 0) {
          thumbnailUrl = projectAssets[0].thumbnailUrl;
        }

        const projectThumb = resolveThumbnailUrl(p.coverAssetUrl, thumbnailUrl, false);
        const isFeatured = featuredItemIds.includes(p.id);

        return {
          id: p.id,
          title: p.title,
          category: p.clientName || p.category || "Commercial Project",
          type: "project" as const,
          assetCount: projectAssets.length,
          thumbnailUrl: projectThumb || thumbnailUrl,
          description: p.description,
          isFeatured,
          projectAssets,
        };
      })
    );

    const mappedStandaloneAssets: PortfolioItem[] = await Promise.all(
      standaloneAssets.map(async (asset) => {
        const activeVersion = await services.asset.getActiveVersion(asset.id);
        const itemType = asset.type === "photo_gallery" ? ("still" as const) : ("film" as const);
        const isStill = itemType === "still";
        const rawMedia =
          activeVersion?.rawFileUrl ||
          activeVersion?.hlsManifestUrl ||
          "";
        const resolvedThumb = resolveThumbnailUrl(
          activeVersion?.thumbnailUrl,
          rawMedia,
          isStill
        );
        const isFeatured = featuredItemIds.includes(asset.id);

        return {
          id: asset.id,
          title: asset.title,
          category: isStill ? "Photo Gallery" : "Film Cut",
          type: itemType,
          assetCount: 1,
          thumbnailUrl: resolvedThumb,
          mediaUrl: resolveMediaUrl(rawMedia || resolvedThumb),
          aspectRatio: asset.aspectRatio || undefined,
          isFeatured,
        };
      })
    );

    const allPortfolioItems = [...mappedDbProjects, ...mappedStandaloneAssets];
    const initialFeaturedIds = featuredItemIds.filter((id) =>
      allPortfolioItems.some((item) => item.id === id)
    );

    return {
      success: true,
      data: {
        items: allPortfolioItems,
        featuredIds: initialFeaturedIds,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to load portfolio items.",
    };
  }
}


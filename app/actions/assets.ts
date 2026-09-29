"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";

export interface DeleteAssetOptions {
  deliveryId?: string;
  workspaceSlug?: string;
  portfolioId?: string;
  projectId?: string;
}

export interface TrashedAssetDTO {
  id: string;
  title: string;
  type: string;
  deliveryId: string | null;
  workspaceId: string;
  thumbnailUrl: string | null;
  fileSizeBytes: number;
  deletedAt: string;
  daysRemaining: number;
}

/**
 * Soft deletes (moves to trash) an asset. The asset is hidden from active
 * deliveries and portfolio showcases, preserved in Cloudflare storage, and retained for 30 days.
 */
export async function deleteAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const asset = await services.asset.getAssetById(assetId);
    if (!asset) {
      return { success: false, error: "Asset not found." };
    }

    // Verify workspace membership/ownership
    const isMember = await services.member
      .isMember(asset.workspaceId, user.id)
      .catch(() => false);
    if (!isMember) {
      return {
        success: false,
        error: "You do not have permission to delete this asset.",
      };
    }

    // Check if asset is pinned in the portfolio appearance and unpin it
    try {
      const portfolio = options?.portfolioId
        ? await services.portfolio.getPortfolioById(options.portfolioId)
        : await services.portfolio.getPortfolioByWorkspace(asset.workspaceId);

      if (portfolio && Array.isArray(portfolio.appearance?.featuredItemIds)) {
        if (portfolio.appearance.featuredItemIds.includes(assetId)) {
          const updatedFeaturedIds = portfolio.appearance.featuredItemIds.filter(
            (id: string) => id !== assetId
          );
          await services.portfolio.updatePortfolio(portfolio.id, {
            appearance: {
              ...portfolio.appearance,
              featuredItemIds: updatedFeaturedIds,
            },
          });
        }
      }
    } catch (portErr) {
      console.warn("Portfolio featuredItem cleanup notice:", portErr);
    }

    // Soft delete (archive) the asset
    await services.asset.archiveAsset(assetId);

    // Revalidate relevant cache paths
    revalidatePath("/portfolio");
    revalidatePath("/deliveries");

    const deliveryIdToRevalidate = asset.deliveryId || options?.deliveryId;
    if (deliveryIdToRevalidate) {
      revalidatePath(`/deliveries/${deliveryIdToRevalidate}`);
    }

    if (options?.workspaceSlug) {
      revalidatePath(`/${options.workspaceSlug}/portfolio`);
      revalidatePath(`/${options.workspaceSlug}/deliveries`);
      if (deliveryIdToRevalidate) {
        revalidatePath(`/${options.workspaceSlug}/deliveries/${deliveryIdToRevalidate}`);
      }
      revalidatePath(`/p/${options.workspaceSlug}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("deleteAssetAction error:", error);
    return {
      success: false,
      error: error.message || "Failed to move asset to trash.",
    };
  }
}

/**
 * Restores an archived asset back to active delivery/portfolio.
 */
export async function restoreAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const asset = await services.asset.getAssetById(assetId);
    if (!asset) {
      return { success: false, error: "Asset not found." };
    }

    const isMember = await services.member
      .isMember(asset.workspaceId, user.id)
      .catch(() => false);
    if (!isMember) {
      return {
        success: false,
        error: "You do not have permission to restore this asset.",
      };
    }

    await services.asset.restoreAsset(assetId);

    revalidatePath("/portfolio");
    revalidatePath("/deliveries");

    const deliveryIdToRevalidate = asset.deliveryId || options?.deliveryId;
    if (deliveryIdToRevalidate) {
      revalidatePath(`/deliveries/${deliveryIdToRevalidate}`);
    }

    if (options?.workspaceSlug) {
      revalidatePath(`/${options.workspaceSlug}/portfolio`);
      revalidatePath(`/${options.workspaceSlug}/deliveries`);
      if (deliveryIdToRevalidate) {
        revalidatePath(`/${options.workspaceSlug}/deliveries/${deliveryIdToRevalidate}`);
      }
      revalidatePath(`/p/${options.workspaceSlug}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("restoreAssetAction error:", error);
    return {
      success: false,
      error: error.message || "Failed to restore asset.",
    };
  }
}

/**
 * Permanently purges an asset and its versions from the workspace and remote Cloudflare storage,
 * recovering workspace storage quota. This action is irreversible.
 */
export async function permanentDeleteAssetAction(
  assetId: string,
  options?: DeleteAssetOptions
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const asset = await services.asset.getAssetById(assetId);
    if (!asset) {
      return { success: false, error: "Asset not found." };
    }

    // Verify workspace membership/ownership
    const isMember = await services.member
      .isMember(asset.workspaceId, user.id)
      .catch(() => false);
    if (!isMember) {
      return {
        success: false,
        error: "You do not have permission to delete this asset.",
      };
    }

    // If projectId was provided and we want to detach from junction, detach it
    if (options?.projectId) {
      try {
        await services.project.detachAssetFromProject(options.projectId, assetId);
      } catch (e) {
        console.warn("Detach from project warning:", e);
      }
    }

    // Clean up storage versions and recover storage quota
    try {
      const versions = await services.asset.listVersions(assetId);
      let totalBytesToFree = 0;

      for (const version of versions) {
        if (version.fileSizeBytes) {
          totalBytesToFree += version.fileSizeBytes;
        }

        const targets = [
          version.rawFileUrl,
          version.hlsManifestUrl,
          version.thumbnailUrl,
        ].filter(Boolean) as string[];

        for (const target of targets) {
          if (
            target &&
            !target.includes("files.vidstack.io") &&
            !target.includes("/api/mock-upload/") &&
            !target.includes("unsplash.com") &&
            services.storage &&
            typeof services.storage.deleteAsset === "function"
          ) {
            try {
              await services.storage.deleteAsset(target);
            } catch (storageErr) {
              console.warn("Storage deletion notice:", storageErr);
            }
          }
        }
      }

      // Recover workspace storage quota
      if (totalBytesToFree > 0) {
        try {
          const currentWorkspace = await services.workspace.getWorkspaceById(asset.workspaceId);
          if (currentWorkspace) {
            const updatedStorage = Math.max(0, (currentWorkspace.storageUsedBytes || 0) - totalBytesToFree);
            await services.workspace.updateWorkspace(currentWorkspace.id, {
              storageUsedBytes: updatedStorage,
            });
          }
        } catch (wsErr) {
          console.warn("Workspace storage quota update notice:", wsErr);
        }
      }
    } catch (verErr) {
      console.warn("Version listing for cleanup notice:", verErr);
    }

    // Check if asset is pinned in the portfolio appearance
    try {
      const portfolio = options?.portfolioId
        ? await services.portfolio.getPortfolioById(options.portfolioId)
        : await services.portfolio.getPortfolioByWorkspace(asset.workspaceId);

      if (portfolio && Array.isArray(portfolio.appearance?.featuredItemIds)) {
        if (portfolio.appearance.featuredItemIds.includes(assetId)) {
          const updatedFeaturedIds = portfolio.appearance.featuredItemIds.filter(
            (id: string) => id !== assetId
          );
          await services.portfolio.updatePortfolio(portfolio.id, {
            appearance: {
              ...portfolio.appearance,
              featuredItemIds: updatedFeaturedIds,
            },
          });
        }
      }
    } catch (portErr) {
      console.warn("Portfolio featuredItem cleanup notice:", portErr);
    }

    // Delete the asset from database (cascades to asset_versions and feedback)
    await services.asset.deleteAsset(assetId);

    // Revalidate relevant cache paths
    revalidatePath("/portfolio");
    revalidatePath("/deliveries");

    const deliveryIdToRevalidate = asset.deliveryId || options?.deliveryId;
    if (deliveryIdToRevalidate) {
      revalidatePath(`/deliveries/${deliveryIdToRevalidate}`);
    }

    if (options?.workspaceSlug) {
      revalidatePath(`/${options.workspaceSlug}/portfolio`);
      revalidatePath(`/${options.workspaceSlug}/deliveries`);
      if (deliveryIdToRevalidate) {
        revalidatePath(`/${options.workspaceSlug}/deliveries/${deliveryIdToRevalidate}`);
      }
      revalidatePath(`/p/${options.workspaceSlug}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("permanentDeleteAssetAction error:", error);
    return {
      success: false,
      error: error.message || "Failed to permanently delete asset.",
    };
  }
}

/**
 * Fetches all assets currently in trash for a given workspace.
 */
export async function listTrashAssetsAction(
  workspaceId: string
): Promise<{ success: boolean; error?: string; assets: TrashedAssetDTO[] }> {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in.", assets: [] };
    }

    const isMember = await services.member
      .isMember(workspaceId, user.id)
      .catch(() => false);
    if (!isMember) {
      return {
        success: false,
        error: "You do not have permission to view trash.",
        assets: [],
      };
    }

    const trashed = await services.asset.listTrashAssets(workspaceId);

    const enriched: TrashedAssetDTO[] = await Promise.all(
      trashed.map(async (a) => {
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

        const deletedTime = new Date(a.updatedAt).getTime();
        const elapsedDays = Math.floor((Date.now() - deletedTime) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, 30 - elapsedDays);

        return {
          id: a.id,
          title: a.title,
          type: a.type,
          deliveryId: a.deliveryId || null,
          workspaceId: a.workspaceId,
          thumbnailUrl: resolvedThumb ? resolveMediaUrl(resolvedThumb) : null,
          fileSizeBytes: activeVersion?.fileSizeBytes || 0,
          deletedAt: a.updatedAt,
          daysRemaining,
        };
      })
    );

    return { success: true, assets: enriched };
  } catch (error: any) {
    console.error("listTrashAssetsAction error:", error);
    return {
      success: false,
      error: error.message || "Failed to load trash assets.",
      assets: [],
    };
  }
}

/**
 * Permanently deletes all assets in trash for a given workspace.
 */
export async function emptyTrashAction(
  workspaceId: string,
  workspaceSlug?: string
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const isMember = await services.member
      .isMember(workspaceId, user.id)
      .catch(() => false);
    if (!isMember) {
      return {
        success: false,
        error: "You do not have permission to empty trash.",
      };
    }

    const trashed = await services.asset.listTrashAssets(workspaceId);
    let count = 0;

    for (const a of trashed) {
      await permanentDeleteAssetAction(a.id, {
        workspaceSlug,
        deliveryId: a.deliveryId || undefined,
      });
      count++;
    }

    revalidatePath("/portfolio");
    revalidatePath("/deliveries");
    if (workspaceSlug) {
      revalidatePath(`/${workspaceSlug}/portfolio`);
      revalidatePath(`/${workspaceSlug}/deliveries`);
      revalidatePath(`/p/${workspaceSlug}`);
    }

    return { success: true, count };
  } catch (error: any) {
    console.error("emptyTrashAction error:", error);
    return {
      success: false,
      error: error.message || "Failed to empty trash.",
    };
  }
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
      const project = await services.project.getProjectById(itemId);
      if (!project) {
        return { success: false, error: "Project not found." };
      }

      // Verify membership
      const isMember = await services.member
        .isMember(project.workspaceId, user.id)
        .catch(() => false);
      if (!isMember) {
        return {
          success: false,
          error: "You do not have permission to delete this project.",
        };
      }

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
        console.warn("Portfolio featured cleanup notice:", portErr);
      }

      // Delete the project
      await services.project.deleteProject(itemId);

      revalidatePath("/portfolio");
      if (workspaceSlug) {
        revalidatePath(`/${workspaceSlug}/portfolio`);
        revalidatePath(`/p/${workspaceSlug}`);
      }

      return { success: true };
    } else {
      // Standalone film or still
      return await deleteAssetAction(itemId, {
        portfolioId,
        workspaceSlug,
      });
    }
  } catch (error: any) {
    console.error("deletePortfolioItemAction error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete portfolio item.",
    };
  }
}

/**
 * Permanently deletes a delivery room and all associated assets.
 */
export async function deleteDeliveryAction(
  deliveryId: string,
  workspaceSlug?: string
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const delivery = await services.delivery.getDeliveryById(deliveryId);
    if (!delivery) {
      return { success: false, error: "Delivery not found." };
    }

    const isMember = await services.member
      .isMember(delivery.workspaceId, user.id)
      .catch(() => false);
    if (!isMember) {
      return {
        success: false,
        error: "You do not have permission to delete this delivery.",
      };
    }

    // Delete associated assets and storage files
    try {
      const assets = await services.asset.listDeliveryAssets(deliveryId);
      for (const asset of assets) {
        await deleteAssetAction(asset.id, {
          deliveryId,
          workspaceSlug,
        });
      }
    } catch (e) {
      console.warn("Delivery asset cleanup notice:", e);
    }

    // Delete delivery entity
    await services.delivery.deleteDelivery(deliveryId);

    revalidatePath("/deliveries");
    if (workspaceSlug) {
      revalidatePath(`/${workspaceSlug}/deliveries`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("deleteDeliveryAction error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete delivery.",
    };
  }
}

export interface UpdateAssetInput {
  title?: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  aspectRatio?: string;
}

export interface UpdateAssetOptions {
  deliveryId?: string;
  workspaceSlug?: string;
  portfolioId?: string;
  isProject?: boolean;
}

/**
 * Updates an asset or project's metadata: title, description, category,
 * thumbnail URL, or aspect ratio.
 */
export async function updateAssetAction(
  itemId: string,
  data: UpdateAssetInput,
  options?: UpdateAssetOptions
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    if (options?.isProject) {
      const project = await services.project.getProjectById(itemId);
      if (!project) {
        return { success: false, error: "Project not found." };
      }

      const isMember = await services.member
        .isMember(project.workspaceId, user.id)
        .catch(() => false);
      if (!isMember) {
        return {
          success: false,
          error: "You do not have permission to update this project.",
        };
      }

      const updatedProject = await services.project.updateProject(itemId, {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description.trim() }),
        ...(data.category !== undefined && { category: data.category.trim() }),
        ...(data.thumbnailUrl !== undefined && { coverAssetUrl: data.thumbnailUrl.trim() }),
      });

      revalidatePath("/portfolio");
      if (options?.workspaceSlug) {
        revalidatePath(`/${options.workspaceSlug}/portfolio`);
        revalidatePath(`/p/${options.workspaceSlug}`);
      }

      return { success: true, item: updatedProject };
    }

    // Try finding as asset
    let asset = await services.asset.getAssetById(itemId);

    // If not found and isProject wasn't specified, check if it's a project container
    if (!asset) {
      const project = await services.project.getProjectById(itemId);
      if (project) {
        const isMember = await services.member
          .isMember(project.workspaceId, user.id)
          .catch(() => false);
        if (!isMember) {
          return {
            success: false,
            error: "You do not have permission to update this project.",
          };
        }

        const updatedProject = await services.project.updateProject(itemId, {
          ...(data.title !== undefined && { title: data.title.trim() }),
          ...(data.description !== undefined && { description: data.description.trim() }),
          ...(data.category !== undefined && { category: data.category.trim() }),
          ...(data.thumbnailUrl !== undefined && { coverAssetUrl: data.thumbnailUrl.trim() }),
        });

        revalidatePath("/portfolio");
        if (options?.workspaceSlug) {
          revalidatePath(`/${options.workspaceSlug}/portfolio`);
          revalidatePath(`/p/${options.workspaceSlug}`);
        }

        return { success: true, item: updatedProject };
      }

      return { success: false, error: "Asset not found." };
    }

    // Verify asset ownership
    const isMember = await services.member
      .isMember(asset.workspaceId, user.id)
      .catch(() => false);
    if (!isMember) {
      return {
        success: false,
        error: "You do not have permission to update this asset.",
      };
    }

    // Update asset table
    const assetUpdates: any = {};
    if (data.title !== undefined) assetUpdates.title = data.title.trim();
    if (data.category !== undefined) assetUpdates.category = data.category.trim();
    if (data.aspectRatio !== undefined) assetUpdates.aspectRatio = data.aspectRatio;

    let updatedAsset = asset;
    if (Object.keys(assetUpdates).length > 0) {
      updatedAsset = await services.asset.updateAsset(itemId, assetUpdates);
    }

    // Update active version thumbnail / label if provided
    const activeVersion = await services.asset.getActiveVersion(itemId);
    let updatedThumb = activeVersion?.thumbnailUrl;
    if (activeVersion) {
      if (data.thumbnailUrl !== undefined && data.thumbnailUrl.trim()) {
        await services.asset.updateThumbnail(activeVersion.id, data.thumbnailUrl.trim());
        updatedThumb = data.thumbnailUrl.trim();
      }
      if (data.description !== undefined) {
        await services.asset.renameVersion(activeVersion.id, data.description.trim());
      }
    }

    revalidatePath("/deliveries");
    revalidatePath("/portfolio");

    const deliveryIdToRevalidate = asset.deliveryId || options?.deliveryId;
    if (deliveryIdToRevalidate) {
      revalidatePath(`/deliveries/${deliveryIdToRevalidate}`);
    }

    if (options?.workspaceSlug) {
      revalidatePath(`/${options.workspaceSlug}/portfolio`);
      revalidatePath(`/${options.workspaceSlug}/deliveries`);
      if (deliveryIdToRevalidate) {
        revalidatePath(`/${options.workspaceSlug}/deliveries/${deliveryIdToRevalidate}`);
      }
      revalidatePath(`/p/${options.workspaceSlug}`);
    }

    return {
      success: true,
      item: {
        ...updatedAsset,
        thumbnailUrl: updatedThumb,
        description: data.description,
      },
    };
  } catch (error: any) {
    console.error("updateAssetAction error:", error);
    return {
      success: false,
      error: error.message || "Failed to update asset.",
    };
  }
}


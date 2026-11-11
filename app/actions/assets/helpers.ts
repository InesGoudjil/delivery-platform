import { revalidatePath } from "next/cache";
import { createScopedLogger } from "@/lib/logger";

export const log = createScopedLogger({ actionGroup: "assets" });

export function revalidateAssetPaths(options?: {
  workspaceSlug?: string;
  deliveryId?: string;
  shareToken?: string;
}) {
  if (options?.workspaceSlug) {
    revalidatePath(`/${options.workspaceSlug}/portfolio`);
    revalidatePath(`/${options.workspaceSlug}/deliveries`);
    if (options.deliveryId) {
      revalidatePath(`/${options.workspaceSlug}/deliveries/${options.deliveryId}`);
    }
    revalidatePath(`/p/${options.workspaceSlug}`);
  }
  if (options?.shareToken) {
    revalidatePath(`/deliver/${options.shareToken}`);
  }
  revalidatePath("/[workspaceSlug]/portfolio", "page");
  revalidatePath("/[workspaceSlug]/deliveries", "page");
  revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
  revalidatePath("/deliver/[shareToken]", "page");
  revalidatePath("/p/[handle]", "page");
}

export async function cleanupPortfolioFeaturedItem(
  services: any,
  workspaceId: string,
  itemId: string,
  portfolioId?: string
) {
  try {
    const portfolio = portfolioId
      ? await services.portfolio.getPortfolioById(portfolioId)
      : await services.portfolio.getPortfolioByWorkspace(workspaceId);

    if (portfolio && Array.isArray(portfolio.appearance?.featuredItemIds)) {
      if (portfolio.appearance.featuredItemIds.includes(itemId)) {
        const updatedFeaturedIds = portfolio.appearance.featuredItemIds.filter(
          (id: string) => id !== itemId
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
    log.warn({ err: portErr, itemId }, "Portfolio featuredItem cleanup notice");
  }
}

"use server";

import { getServerServices } from "@/core/server";
import { revalidatePath } from "next/cache";

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

    const repo = (services as any).portfolioRepo || (services as any).portfolio?.portfolioRepo;
    if (isFeatured) {
      if (repo && typeof repo.addFeaturedItem === "function") {
        await repo.addFeaturedItem(portfolioId, itemId, itemType);
      } else {
        await services.portfolio.featureProject(portfolioId, itemId);
      }
    } else {
      if (repo && typeof repo.removeFeaturedItem === "function") {
        await repo.removeFeaturedItem(portfolioId, itemId, itemType);
      } else {
        await services.portfolio.unfeatureProject(portfolioId, itemId);
      }
    }

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

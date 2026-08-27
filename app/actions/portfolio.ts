"use server";

import { getServerServices } from "@/core/server";
import { revalidatePath } from "next/cache";

export async function updatePortfolioAction(
  portfolioId: string,
  data: {
    title?: string;
    bio?: string | null;
    isPublished?: boolean;
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

export async function toggleFeaturedProjectAction(
  portfolioId: string,
  projectId: string,
  isFeatured: boolean
) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    if (isFeatured) {
      await services.portfolio.featureProject(portfolioId, projectId);
    } else {
      await services.portfolio.unfeatureProject(portfolioId, projectId);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update featured project." };
  }
}

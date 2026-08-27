"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import { createStripeProductAndPrice } from "@/lib/stripe/client";

export async function updateUserRoleAction(userId: string, role: "admin" | "user") {
  try {
    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const updatedProfile = await services.profile.updatePlatformRole(userId, role);

    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { success: true, profile: updatedProfile };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update user role." };
  }
}

export async function createCreatorAccountAction(formData: FormData) {
  try {
    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const email = formData.get("email") as string;
    const fullName = formData.get("fullName") as string;
    const role = (formData.get("role") as "admin" | "user") || "user";

    if (!email || !fullName) {
      return { success: false, error: "Full Name and Email are required." };
    }

    // In a production setup with Supabase service_role, you'd invoke admin.createUser or send an invite.
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to provision creator." };
  }
}

export async function updateWorkspacePlanAction(
  workspaceId: string,
  planId: string,
  status: "trialing" | "active" | "past_due" | "canceled" = "active"
) {
  try {
    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const sub = await services.subscription.adminChangeWorkspacePlan(workspaceId, planId, status as any);

    revalidatePath("/admin");
    revalidatePath("/admin/workspaces");
    revalidatePath(`/admin/workspaces/${workspaceId}`);
    revalidatePath("/admin/subscriptions");
    return { success: true, subscription: sub };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update workspace plan." };
  }
}

export async function updateWorkspaceFeaturesAction(
  workspaceId: string,
  features: Record<string, any>
) {
  try {
    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const updatedFeatures = await services.workspace.updateWorkspaceFeatures(workspaceId, features as any);

    revalidatePath("/admin");
    revalidatePath("/admin/workspaces");
    revalidatePath(`/admin/workspaces/${workspaceId}`);
    return { success: true, features: updatedFeatures };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update workspace features." };
  }
}

export async function updatePlanAction(
  planId: string,
  data: {
    name?: string;
    priceCents?: number;
    currency?: string;
    sortOrder?: number;
    isActive?: boolean;
    features?: Record<string, any>;
  }
) {
  try {
    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const updatedPlan = await services.subscription.getPlanById(planId);
    if (!updatedPlan) {
      return { success: false, error: "Plan not found." };
    }

    // Direct update on planRepo via container/services if exposed or container repositories
    // We can use planRepo via server container or repo
    const { repositories } = await (await import("@/core/container")).createCoreServices(await (await import("@/lib/supabase/server")).createClient());
    const plan = await repositories.plan.update(planId, data as any);

    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin");
    return { success: true, plan };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update plan details." };
  }
}

export async function createPlanAction(formData: FormData) {
  try {
    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const name = (formData.get("name") as string)?.trim();
    const rawSlug = (formData.get("slug") as string)?.trim()?.toLowerCase();
    const priceCents = Math.max(0, Math.round(Number(formData.get("priceUsd") || 0) * 100));
    const storageGb = Math.max(1, Number(formData.get("storageGb") || 500));
    const clientLinks = Number(formData.get("clientLinks") || -1);
    const whatsappDelivery = formData.get("whatsappDelivery") === "true";

    if (!name || !rawSlug) {
      return { success: false, error: "Plan Name and Slug are required." };
    }

    const slug = rawSlug.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    // 1. Create automatic counterpart in Stripe API
    const { stripePriceId } = await createStripeProductAndPrice(name, priceCents, "USD", "month");

    // 2. Save plan to database
    const plan = await services.subscription.createPlan({
      name,
      slug,
      priceCents,
      currency: "USD",
      billingInterval: "month",
      sortOrder: 10,
      stripePriceId,
      features: {
        storage_gb: storageGb,
        client_links: clientLinks,
        whatsapp_delivery: whatsappDelivery,
        portfolio_videos: -1,
        team_seats: 1,
        languages: ["ar", "en"],
        password_protected: true,
        watermark: true,
        branding: true,
        download_notifications: true,
        priority_support: true,
      },
    });

    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin");
    return { success: true, plan };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create new subscription plan." };
  }
}

export async function deletePlanAction(planId: string) {
  try {
    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const plan = await services.subscription.getPlanById(planId);
    if (!plan) {
      return { success: false, error: "Plan not found." };
    }

    // 1. Archive counterpart in Stripe API if present
    if (plan.stripePriceId) {
      const { archiveStripeProductAndPrice } = await import("@/lib/stripe/client");
      await archiveStripeProductAndPrice(plan.stripePriceId).catch((err) =>
        console.warn("Stripe archive notice:", err.message)
      );
    }

    // 2. Delete or Archive plan safely with protection rules
    const result = await services.subscription.deletePlan(planId);

    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin");
    return { success: true, action: result.action, message: result.message };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete plan." };
  }
}

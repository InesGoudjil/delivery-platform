"use server";

import { revalidatePath } from "next/cache";
import { getServerServices, getServerAdminServices } from "@/core/server";
import {
  updateUserRoleSchema,
  createCreatorAccountSchema,
  updateWorkspacePlanSchema,
  updateWorkspaceFeaturesSchema,
  updatePlanSchema,
  createPlanSchema,
  safeValidate,
} from "@/lib/validations";

export async function updateUserRoleAction(userId: string, role: "admin" | "user") {
  try {
    const validated = safeValidate(updateUserRoleSchema, { userId, role });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const updatedProfile = await services.profile.updatePlatformRole(
      validated.data.userId,
      validated.data.role
    );

    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { success: true, profile: updatedProfile };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update user role." };
  }
}

export async function createCreatorAccountAction(formData: FormData) {
  try {
    const rawInput = {
      email: formData.get("email"),
      fullName: formData.get("fullName"),
      role: formData.get("role") || "user",
    };

    const validated = safeValidate(createCreatorAccountSchema, rawInput);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
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
    const validated = safeValidate(updateWorkspacePlanSchema, { workspaceId, planId, status });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const adminServices = await getServerAdminServices();
    const sub = await adminServices.subscription.adminChangeWorkspacePlan(
      validated.data.workspaceId,
      validated.data.planId,
      validated.data.status as any
    );

    revalidatePath("/admin");
    revalidatePath("/admin/workspaces");
    revalidatePath(`/admin/workspaces/${validated.data.workspaceId}`);
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
    const validated = safeValidate(updateWorkspaceFeaturesSchema, { workspaceId, features });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const updatedFeatures = await services.workspace.updateWorkspaceFeatures(
      validated.data.workspaceId,
      validated.data.features as any
    );

    revalidatePath("/admin");
    revalidatePath("/admin/workspaces");
    revalidatePath(`/admin/workspaces/${validated.data.workspaceId}`);
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
    if (!planId?.trim()) {
      return { success: false, error: "Plan ID is required." };
    }

    const validated = safeValidate(updatePlanSchema, data);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const adminServices = await getServerAdminServices();
    const updatedPlan = await adminServices.subscription.getPlanById(planId.trim());
    if (!updatedPlan) {
      return { success: false, error: "Plan not found." };
    }

    const plan = await adminServices.subscription.updatePlan(planId.trim(), validated.data as any);

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

    const rawInput = {
      name: formData.get("name"),
      slug: (formData.get("slug") as string)?.trim()?.toLowerCase(),
      priceUsd: formData.get("priceUsd") || 0,
      storageGb: formData.get("storageGb") || 500,
      clientLinks: formData.get("clientLinks") || -1,
      whatsappDelivery: formData.get("whatsappDelivery") === "true",
    };

    const validated = safeValidate(createPlanSchema, rawInput);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { name, slug, priceUsd, storageGb, clientLinks, whatsappDelivery } = validated.data;
    const priceCents = Math.round(priceUsd * 100);

    const adminServices = await getServerAdminServices();

    // 1. Create automatic counterpart in Stripe API via core StripeService
    const { stripePriceId } = await adminServices.stripe.createStripeProductAndPrice({
      name,
      priceCents,
      currency: "USD",
      billingInterval: "month",
    });

    // 2. Save plan to database
    const plan = await adminServices.subscription.createPlan({
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
    if (!planId?.trim()) {
      return { success: false, error: "Plan ID is required." };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProfile = await services.profile.getProfile(currentUser.id);
    if (currentProfile?.platformRole !== "admin") {
      return { success: false, error: "Forbidden: Super Admin privileges required." };
    }

    const adminServices = await getServerAdminServices();
    const plan = await adminServices.subscription.getPlanById(planId.trim());
    if (!plan) {
      return { success: false, error: "Plan not found." };
    }

    // 1. Archive counterpart in Stripe API if present
    if (plan.stripePriceId) {
      await adminServices.stripe.archiveStripeProductAndPrice(plan.stripePriceId).catch((err) =>
        console.warn("Stripe archive notice:", err.message)
      );
    }

    // 2. Delete or Archive plan safely with protection rules
    const result = await adminServices.subscription.deletePlan(planId.trim());

    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin");
    return { success: true, action: result.action, message: result.message };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete plan." };
  }
}

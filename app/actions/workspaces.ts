"use server";

import { revalidatePath } from "next/cache";
import { getServerServices, getServerAdminServices } from "@/core/server";

export interface WorkspaceActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Checks whether the current user is eligible to create a collaborative team workspace.
 * Requires an active subscription that includes team seats (e.g. Studio plan, team_seats > 1).
 */
export async function checkTeamWorkspaceEligibilityAction(): Promise<WorkspaceActionResult<{
  eligible: boolean;
  maxSeats: number;
  planName?: string;
  planSlug?: string;
  reason?: string;
}>> {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: "Please log in to continue." };
    }

    const eligibility = await services.workspace.checkTeamWorkspaceEligibility(user.id);
    return { success: true, data: eligibility };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to check workspace eligibility." };
  }
}

/**
 * Creates a secondary Team Workspace (accountType: 'studio').
 * Gated by checking that the user possesses a subscription with team seats (Studio plan).
 */
export async function createTeamWorkspaceAction(formData: FormData): Promise<WorkspaceActionResult<{ slug: string }>> {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: "Please log in to create a workspace." };
    }

    const brandName = (formData.get("brandName") as string)?.trim();
    const rawSlug = (formData.get("slug") as string)?.trim();
    const accentColor = (formData.get("accentColor") as string)?.trim() || "#f5551d";
    const defaultLanguage = ((formData.get("defaultLanguage") as string)?.trim() as "ar" | "en") || "ar";

    if (!brandName || brandName.length < 2) {
      return { success: false, error: "Please enter a valid studio or workspace name (at least 2 characters)." };
    }

    // Verify subscription eligibility
    const eligibility = await services.workspace.checkTeamWorkspaceEligibility(user.id);
    if (!eligibility.eligible) {
      return {
        success: false,
        error: eligibility.reason || "Creating a Team Workspace requires a subscription with team seats (Studio Plan). Please upgrade your plan.",
      };
    }

    // Create team workspace via service
    const newWorkspace = await services.workspace.createTeamWorkspace(
      user.id,
      brandName,
      rawSlug,
      accentColor,
      defaultLanguage
    );

    revalidatePath("/", "layout");
    revalidatePath("/new-workspace");
    revalidatePath(`/${newWorkspace.slug}`);

    return { success: true, data: { slug: newWorkspace.slug } };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create team workspace." };
  }
}

/**
 * Development & Demo helper to switch a workspace's subscription plan directly (e.g. Upgrade to Studio).
 * Allows instant verification of the team workspace unlock without needing live Stripe webhooks.
 */
export async function switchWorkspacePlanAction(
  workspaceId: string,
  planSlug: string
): Promise<WorkspaceActionResult> {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check ownership or admin status
    const workspace = await services.workspace.getWorkspaceById(workspaceId);
    if (!workspace) {
      return { success: false, error: "Workspace not found" };
    }

    const member = await services.member.getMember(workspaceId, user.id);
    const canManage = workspace.ownerId === user.id || member?.role === "owner" || member?.role === "admin";
    if (!canManage) {
      return { success: false, error: "Permission denied: Only workspace owners can change plans." };
    }

    const adminServices = await getServerAdminServices();
    const plan = await adminServices.subscription.getPlanBySlug(planSlug);
    if (!plan) {
      return { success: false, error: `Plan "${planSlug}" not found.` };
    }

    await adminServices.subscription.adminChangeWorkspacePlan(workspaceId, plan.id, "active");

    revalidatePath("/", "layout");
    revalidatePath(`/${workspace.slug}`);
    revalidatePath(`/${workspace.slug}/subscription`);
    revalidatePath("/new-workspace");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to switch plan." };
  }
}

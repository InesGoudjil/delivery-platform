"use server";

import { revalidatePath } from "next/cache";
import { getServerServices, getServerAdminServices } from "@/core/server";
import {
  createTeamWorkspaceSchema,
  safeValidate,
} from "@/lib/validations";

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

    const rawInput = {
      brandName: formData.get("brandName"),
      slug: formData.get("slug") || undefined,
      accentColor: formData.get("accentColor") || undefined,
      defaultLanguage: formData.get("defaultLanguage") || undefined,
    };

    const validated = safeValidate(createTeamWorkspaceSchema, rawInput);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { brandName, slug: rawSlug, accentColor, defaultLanguage } = validated.data;

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


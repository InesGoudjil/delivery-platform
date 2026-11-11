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

export interface WorkspaceData {
  id: string;
  brandName: string;
  slug: string;
  logoUrl?: string | null;
  accentColor?: string | null;
  accountType?: "individual" | "studio";
  ownerId?: string;
  storageUsedBytes?: number;
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

/**
 * Retrieves workspace details (name, slug, logo, accent, storage)
 * for SWR hydration, live caching, and multi-component synchronization.
 */
export async function getWorkspaceDataAction(
  slug: string
): Promise<WorkspaceActionResult<WorkspaceData>> {
  try {
    if (!slug?.trim()) {
      return { success: false, error: "Workspace slug is required." };
    }

    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    const workspace = await services.workspace.getWorkspaceBySlug(slug.trim());
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    const isOwner = workspace.ownerId === user.id;
    const isMember = await services.member.isMember(workspace.id, user.id);
    if (!isOwner && !isMember) {
      return { success: false, error: "Permission denied: Not a member of this workspace." };
    }

    return {
      success: true,
      data: {
        id: workspace.id,
        brandName: workspace.brandName,
        slug: workspace.slug,
        logoUrl: workspace.logoUrl,
        accentColor: workspace.accentColor,
        accountType: workspace.accountType,
        ownerId: workspace.ownerId,
        storageUsedBytes: workspace.storageUsedBytes,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load workspace data." };
  }
}


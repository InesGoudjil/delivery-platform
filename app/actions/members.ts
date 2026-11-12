"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import { hasMinRole } from "@/core/security/guards";
import {
  WorkspaceMember,
  WorkspaceInvitation,
  EnrichedWorkspaceMember,
} from "@/core/entities/workspace-member";
import {
  inviteWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema,
  removeWorkspaceMemberSchema,
  revokeWorkspaceInvitationSchema,
  acceptWorkspaceInvitationSchema,
  safeValidate,
  type AssignableWorkspaceRole,
} from "@/lib/validations";

export interface MemberActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WorkspaceSeatStats {
  maxSeats: number;
  activeCount: number;
  pendingCount: number;
  usedSeats: number;
  remainingSeats: number;
  canInvite: boolean;
}

export interface WorkspaceMembersData {
  seatStats: WorkspaceSeatStats;
  members: EnrichedWorkspaceMember[];
  /** With their join tokens, so only for owners and admins: empty for everyone else. */
  pendingInvitations: WorkspaceInvitation[];
}

/**
 * Invites a collaborator by email to join the workspace with a given role.
 * Validates caller permissions (owner/admin) and verifies that seat capacity is not exceeded.
 */
export async function inviteWorkspaceMemberAction(
  workspaceSlug: string,
  email: string,
  role: AssignableWorkspaceRole = "editor"
): Promise<MemberActionResult<WorkspaceInvitation>> {
  try {
    const validated = safeValidate(inviteWorkspaceMemberSchema, {
      workspaceSlug,
      email,
      role,
    });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    const workspace = await services.workspace.getWorkspaceBySlug(validated.data.workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    // Permission check: owner or admin
    const member = await services.member.getMember(workspace.id, currentUser.id);
    if (!hasMinRole(member?.role, "admin")) {
      return { success: false, error: "Permission denied: Only workspace owners and admins can invite team members." };
    }

    const invitation = await services.member.inviteMember(
      workspace.id,
      currentUser.id,
      validated.data.email,
      validated.data.role
    );

    revalidatePath(`/${validated.data.workspaceSlug}/members`);
    revalidatePath(`/${validated.data.workspaceSlug}`);

    return { success: true, data: invitation };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to invite collaborator." };
  }
}

/**
 * Updates a collaborator's workspace role (admin, editor or viewer; "owner" can't be given).
 * Owners and admins change roles; only owners change a co-owner's; the workspace owner's never changes.
 */
export async function updateWorkspaceMemberRoleAction(
  workspaceSlug: string,
  memberUserId: string,
  role: AssignableWorkspaceRole
): Promise<MemberActionResult<WorkspaceMember>> {
  try {
    const validated = safeValidate(updateWorkspaceMemberRoleSchema, {
      workspaceSlug,
      memberUserId,
      role,
    });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    const workspace = await services.workspace.getWorkspaceBySlug(validated.data.workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    // Permission check: owner or admin. The service applies the owner rules.
    const callerMember = await services.member.getMember(workspace.id, currentUser.id);
    if (!hasMinRole(callerMember?.role, "admin")) {
      return { success: false, error: "Permission denied: Only workspace owners and admins can manage roles." };
    }

    const updated = await services.member.updateMemberRole(
      workspace.id,
      currentUser.id,
      validated.data.memberUserId,
      validated.data.role
    );

    revalidatePath(`/${validated.data.workspaceSlug}/members`);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update member role." };
  }
}

/**
 * Removes a collaborator from the workspace, or lets the caller leave it.
 * Owners and admins remove others; only owners remove a co-owner; the workspace owner can't be removed.
 */
export async function removeWorkspaceMemberAction(
  workspaceSlug: string,
  memberUserId: string
): Promise<MemberActionResult> {
  try {
    const validated = safeValidate(removeWorkspaceMemberSchema, {
      workspaceSlug,
      memberUserId,
    });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    const workspace = await services.workspace.getWorkspaceBySlug(validated.data.workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    // Permission check: owner or admin, or a member leaving. The service applies the owner rules.
    const callerMember = await services.member.getMember(workspace.id, currentUser.id);
    const isLeaving = currentUser.id === validated.data.memberUserId;
    if (!callerMember || (!isLeaving && !hasMinRole(callerMember.role, "admin"))) {
      return { success: false, error: "Permission denied: You do not have access to remove collaborators." };
    }

    await services.member.removeMember(workspace.id, currentUser.id, validated.data.memberUserId);

    revalidatePath(`/${validated.data.workspaceSlug}/members`);
    revalidatePath(`/${validated.data.workspaceSlug}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to remove member." };
  }
}

/**
 * Revokes a pending invitation for a collaborator.
 */
export async function revokeWorkspaceInvitationAction(
  workspaceSlug: string,
  invitationId: string
): Promise<MemberActionResult> {
  try {
    const validated = safeValidate(revokeWorkspaceInvitationSchema, {
      workspaceSlug,
      invitationId,
    });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    const workspace = await services.workspace.getWorkspaceBySlug(validated.data.workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    const callerMember = await services.member.getMember(workspace.id, currentUser.id);
    if (!hasMinRole(callerMember?.role, "admin")) {
      return { success: false, error: "Permission denied: Only workspace owners and admins can revoke invitations." };
    }

    await services.member.revokeInvitation(validated.data.invitationId, workspace.id);

    revalidatePath(`/${validated.data.workspaceSlug}/members`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to revoke invitation." };
  }
}

/**
 * Accepts an invitation token and adds the current user to the workspace. The signed-in account's
 * email must be the invited address, and confirmed; a token can only be used once.
 */
export async function acceptWorkspaceInvitationAction(
  token: string
): Promise<MemberActionResult<{ workspaceSlug: string }>> {
  try {
    const validated = safeValidate(acceptWorkspaceInvitationSchema, { token });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Please sign in or create an account to accept this invitation." };
    }

    const member = await services.member.acceptInvitation(validated.data.token, {
      id: currentUser.id,
      email: currentUser.email ?? null,
      emailConfirmedAt: currentUser.email_confirmed_at ?? null,
    });
    const workspace = await services.workspace.getWorkspaceById(member.workspaceId);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    revalidatePath("/", "layout");
    revalidatePath(`/${workspace.slug}`);

    return { success: true, data: { workspaceSlug: workspace.slug } };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to accept invitation." };
  }
}

/**
 * Retrieves the complete members data for a workspace, including seat statistics,
 * enriched active members, and (for owners and admins) pending invitations.
 */
export async function getWorkspaceMembersDataAction(
  workspaceSlug: string
): Promise<MemberActionResult<WorkspaceMembersData>> {
  try {
    if (!workspaceSlug || typeof workspaceSlug !== "string") {
      return { success: false, error: "Invalid workspace slug." };
    }

    const services = await getServerServices();
    const currentUser = await services.auth.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return { success: false, error: "Workspace not found." };
    }

    // getMember() also covers the owner in workspaces.owner_id.
    const member = await services.member.getMember(workspace.id, currentUser.id);
    if (!member) {
      return { success: false, error: "Permission denied." };
    }

    const [seatStats, members, pendingInvitations] = await Promise.all([
      services.member.getWorkspaceSeatStats(workspace.id),
      services.member.listMembers(workspace.id),
      services.member.listPendingInvitations(workspace.id, currentUser.id),
    ]);

    return {
      success: true,
      data: {
        seatStats,
        members,
        pendingInvitations,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load members data." };
  }
}

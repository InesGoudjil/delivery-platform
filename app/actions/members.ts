"use server";

import { revalidatePath } from "next/cache";
import { getServerServices } from "@/core/server";
import { WorkspaceRole } from "@/core/entities/workspace-member";
import {
  inviteWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema,
  removeWorkspaceMemberSchema,
  revokeWorkspaceInvitationSchema,
  acceptWorkspaceInvitationSchema,
  safeValidate,
} from "@/lib/validations";

export interface MemberActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Invites a collaborator by email to join the workspace with a given role.
 * Validates caller permissions (owner/admin) and verifies that seat capacity is not exceeded.
 */
export async function inviteWorkspaceMemberAction(
  workspaceSlug: string,
  email: string,
  role: "admin" | "editor" | "viewer" = "editor"
): Promise<MemberActionResult> {
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
    const isOwner = workspace.ownerId === currentUser.id;
    const canInvite = isOwner || member?.role === "owner" || member?.role === "admin";
    if (!canInvite) {
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
 * Updates a collaborator's workspace permission role.
 * Protects workspace owner from being modified.
 */
export async function updateWorkspaceMemberRoleAction(
  workspaceSlug: string,
  memberUserId: string,
  role: WorkspaceRole
): Promise<MemberActionResult> {
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

    // Permission check: owner or admin
    const callerMember = await services.member.getMember(workspace.id, currentUser.id);
    const isOwner = workspace.ownerId === currentUser.id;
    const canManage = isOwner || callerMember?.role === "owner" || callerMember?.role === "admin";
    if (!canManage) {
      return { success: false, error: "Permission denied: Only workspace owners and admins can manage roles." };
    }

    if (workspace.ownerId === validated.data.memberUserId) {
      return { success: false, error: "The workspace owner's role cannot be modified." };
    }

    const updated = await services.member.updateMemberRole(
      workspace.id,
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
 * Removes a collaborator from the workspace.
 * Protects workspace owner from being removed.
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

    // Permission check: owner or admin
    const callerMember = await services.member.getMember(workspace.id, currentUser.id);
    const isOwner = workspace.ownerId === currentUser.id;
    const canRemove = isOwner || callerMember?.role === "owner" || callerMember?.role === "admin";
    if (!canRemove && currentUser.id !== validated.data.memberUserId) {
      return { success: false, error: "Permission denied: You do not have access to remove collaborators." };
    }

    if (workspace.ownerId === validated.data.memberUserId) {
      return { success: false, error: "Cannot remove the workspace owner." };
    }

    await services.member.removeMember(workspace.id, validated.data.memberUserId);

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
    const isOwner = workspace.ownerId === currentUser.id;
    const canRevoke = isOwner || callerMember?.role === "owner" || callerMember?.role === "admin";
    if (!canRevoke) {
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
 * Accepts an invitation token and adds the current user to the workspace.
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

    const member = await services.member.acceptInvitation(validated.data.token, currentUser.id);
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

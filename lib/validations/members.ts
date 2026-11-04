import { z } from "zod";
import { emailSchema } from "./common";

export const workspaceRoleSchema = z.enum(["owner", "admin", "editor", "viewer"]);
export const workspaceInviteRoleSchema = z.enum(["admin", "editor", "viewer"]);

export const inviteWorkspaceMemberSchema = z.object({
  workspaceSlug: z.string().trim().min(1, "Workspace slug is required"),
  email: emailSchema,
  role: workspaceInviteRoleSchema.default("editor"),
});

export type InviteWorkspaceMemberInput = z.infer<typeof inviteWorkspaceMemberSchema>;

export const updateWorkspaceMemberRoleSchema = z.object({
  workspaceSlug: z.string().trim().min(1, "Workspace slug is required"),
  memberUserId: z.string().trim().min(1, "Member user ID is required"),
  role: workspaceRoleSchema,
});

export type UpdateWorkspaceMemberRoleInput = z.infer<typeof updateWorkspaceMemberRoleSchema>;

export const removeWorkspaceMemberSchema = z.object({
  workspaceSlug: z.string().trim().min(1, "Workspace slug is required"),
  memberUserId: z.string().trim().min(1, "Member user ID is required"),
});

export type RemoveWorkspaceMemberInput = z.infer<typeof removeWorkspaceMemberSchema>;

export const revokeWorkspaceInvitationSchema = z.object({
  workspaceSlug: z.string().trim().min(1, "Workspace slug is required"),
  invitationId: z.string().trim().min(1, "Invitation ID is required"),
});

export type RevokeWorkspaceInvitationInput = z.infer<typeof revokeWorkspaceInvitationSchema>;

export const acceptWorkspaceInvitationSchema = z.object({
  token: z.string().trim().min(1, "Invitation token is required"),
});

export type AcceptWorkspaceInvitationInput = z.infer<typeof acceptWorkspaceInvitationSchema>;

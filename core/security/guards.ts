import { getServerServices } from "@/core/server";
import { User } from "@supabase/supabase-js";
import { Workspace } from "@/core/entities/workspace";
import { Delivery } from "@/core/entities/delivery";

export type WorkspaceRoleLevel = "viewer" | "editor" | "admin" | "owner";

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

/** True when `role` is at least `minRole` (viewer < editor < admin < owner). Unknown roles rank lowest. */
export function hasMinRole(role: string | null | undefined, minRole: WorkspaceRoleLevel): boolean {
  return (ROLE_HIERARCHY[role ?? ""] || 0) >= ROLE_HIERARCHY[minRole];
}

export interface AuthContext {
  user: User;
  services: Awaited<ReturnType<typeof getServerServices>>;
}

export interface WorkspaceAuthContext extends AuthContext {
  workspace: Workspace;
  role: WorkspaceRoleLevel;
}

export interface DeliveryAuthContext extends WorkspaceAuthContext {
  delivery: Delivery;
}

/**
 * Ensures the caller has an active, authenticated session.
 * Throws an Error if no authenticated user is found.
 */
export async function requireUser(): Promise<AuthContext> {
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Active user session required.");
  }
  return { user, services };
}

/**
 * Ensures the caller is a platform admin, reading the role from the database
 * (never from client-editable user metadata).
 */
export async function requirePlatformAdmin(): Promise<AuthContext> {
  const ctx = await requireUser();
  const profile = await ctx.services.profile.getProfile(ctx.user.id);
  if (profile?.platformRole !== "admin") {
    throw new Error("Forbidden: Platform admin privileges required.");
  }
  return ctx;
}

/**
 * Ensures the caller is a member of the target workspace with at least minRole permissions.
 * Checks workspace existence, ownership, and role hierarchy.
 */
export async function requireWorkspaceMember(
  workspaceId: string,
  minRole: WorkspaceRoleLevel = "editor"
): Promise<WorkspaceAuthContext> {
  const { user, services } = await requireUser();

  const workspace = await services.workspace.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  // services.member.getMember checks ownership and returns role: 'owner' if user is ownerId
  const member = await services.member.getMember(workspaceId, user.id);
  if (!member || !member.role) {
    throw new Error("Forbidden: You do not have access to this workspace.");
  }

  // Ranked like has_workspace_role() in the database: "owner" is workspaces.owner_id or a co-owner's
  // row, and unknown roles (or an unknown minRole) fail closed.
  const effectiveRole = member.role as WorkspaceRoleLevel;
  if (!hasMinRole(effectiveRole, minRole)) {
    throw new Error(`Forbidden: Requires at least "${minRole}" role permissions.`);
  }

  return { user, services, workspace, role: effectiveRole };
}

/**
 * Resolves a delivery, verifies its existence, and validates workspace membership.
 */
export async function requireDeliveryAccess(
  deliveryId: string,
  minRole: WorkspaceRoleLevel = "editor"
): Promise<DeliveryAuthContext> {
  const { user, services } = await requireUser();
  const delivery = await services.delivery.getDeliveryById(deliveryId.trim());
  if (!delivery) {
    throw new Error("Delivery cut not found.");
  }

  const { workspace, role } = await requireWorkspaceMember(delivery.workspaceId, minRole);
  return { user, services, delivery, workspace, role };
}

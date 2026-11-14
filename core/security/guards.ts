import { cache } from "react";
import { getServerServices } from "@/core/server";
import { User } from "@supabase/supabase-js";
import { Workspace } from "@/core/entities/workspace";
import { Delivery } from "@/core/entities/delivery";
import type { UserProfile } from "@/core/entities/user-profile";
import { isAdminMfaRequired } from "@/lib/security/admin-mfa";

export type WorkspaceRoleLevel = "viewer" | "editor" | "admin" | "owner";

/** What members see when they try to change a suspended workspace. */
export const WORKSPACE_SUSPENDED_MESSAGE =
  "This workspace is suspended, so it can't be changed right now. Contact CineSpace support.";

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

export interface PlatformAdminAuthContext extends AuthContext {
  profile: UserProfile;
}

export type PlatformAdminStatus =
  | { kind: "ok"; context: PlatformAdminAuthContext }
  | { kind: "signed-out" }
  | { kind: "forbidden" }
  /** A platform admin whose session hasn't passed a two-factor check; `enrolled` says whether they have a verified factor. */
  | { kind: "mfa-required"; enrolled: boolean };

/**
 * Whether the caller may use the admin panel: signed in, platform role "admin" read from the
 * database (never from client-editable user metadata), and a two-factor (aal2) session where
 * that's required (lib/security/admin-mfa.ts). Cached per request, so the admin layout, the
 * page and the actions it runs share one lookup.
 */
export const getPlatformAdminStatus = cache(async (): Promise<PlatformAdminStatus> => {
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();
  if (!user) return { kind: "signed-out" };

  const profile = await services.profile.getProfile(user.id);
  if (!profile || profile.platformRole !== "admin") return { kind: "forbidden" };

  if (isAdminMfaRequired() && (await services.auth.getAssuranceLevel()) !== "aal2") {
    const enrolled = (user.factors ?? []).some((factor) => factor.status === "verified");
    return { kind: "mfa-required", enrolled };
  }

  return { kind: "ok", context: { user, services, profile } };
});

/**
 * Ensures the caller is a platform admin (see getPlatformAdminStatus). Throws otherwise; admin
 * pages use requirePlatformAdminPage() in core/admin/context.ts, which redirects instead.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminAuthContext> {
  const status = await getPlatformAdminStatus();
  switch (status.kind) {
    case "ok":
      return status.context;
    case "signed-out":
      throw new Error("Unauthorized: Active user session required.");
    case "forbidden":
      throw new Error("Forbidden: Platform admin privileges required.");
    case "mfa-required":
      throw new Error("Forbidden: Two-factor verification is required for platform admins.");
  }
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

  // A suspended workspace is read-only for its members: viewer-level reads still work.
  if (workspace.suspendedAt && minRole !== "viewer") {
    throw new Error(WORKSPACE_SUSPENDED_MESSAGE);
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

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createCoreServices, type CoreServices } from "@/core/container";
import type { UserProfile } from "@/core/entities/user-profile";
import { getPlatformAdminStatus, requirePlatformAdmin } from "@/core/security/guards";
import { createScopedLogger } from "@/lib/logger";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { AdminAuditLog } from "./audit";
import { AdminReadModel } from "./read-model";
import { AdminUserControls } from "./user-controls";
import { AdminWorkspaceControls } from "./workspace-controls";

export interface PlatformAdminContext {
  user: User;
  profile: UserProfile;
  /** Core services on the service-role client: row-level security doesn't apply. */
  services: CoreServices["services"];
  /**
   * Core services on the admin's own session, for writes the database checks against the admin
   * themselves: platform_role changes must come from a platform admin's session (the
   * prevent_role_escalation trigger).
   */
  sessionServices: CoreServices["services"];
  readModel: AdminReadModel;
  audit: AdminAuditLog;
  /** Devices, bans and two-factor of any user (the user page). */
  userControls: AdminUserControls;
  /** Suspending and lifting a suspension. */
  workspaceControls: AdminWorkspaceControls;
}

/**
 * The only way admin code gets the service role: it runs the platform-admin check (role from the
 * database, plus MFA) first, then builds services on a client that refuses to fall back to the
 * anon key. Throws when the check fails; pages use requirePlatformAdminPage() to redirect instead.
 * Cached per request.
 */
export const getPlatformAdminServices = cache(async (): Promise<PlatformAdminContext> => {
  const { user, profile, services: sessionServices } = await requirePlatformAdmin();
  const client = createServiceRoleClient();
  const { services } = createCoreServices(client as unknown as SupabaseClient<Database>, {
    adminSupabase: client as unknown as SupabaseClient<Database>,
  });
  // Every admin query is timed and logged with the request ID the middleware assigned.
  const log = createScopedLogger({ area: "admin", requestId: await requestId(), adminId: user.id });
  return {
    user,
    profile,
    services,
    sessionServices,
    readModel: new AdminReadModel(client, log),
    audit: new AdminAuditLog(client, log),
    userControls: new AdminUserControls(client, log),
    workspaceControls: new AdminWorkspaceControls(client, log),
  };
});

async function requestId(): Promise<string | null> {
  try {
    return (await headers()).get("x-request-id");
  } catch {
    return null;
  }
}

/**
 * For admin layouts and pages: redirects anyone who isn't a platform admin with a two-factor
 * session (to /login, home, or the two-factor check), then returns the admin context.
 * Call it in every page as well as the layout: Next.js doesn't re-run a layout on every navigation.
 */
export async function requirePlatformAdminPage(returnTo = "/admin"): Promise<PlatformAdminContext> {
  const status = await getPlatformAdminStatus();
  if (status.kind === "signed-out") redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  if (status.kind === "forbidden") redirect("/");
  if (status.kind === "mfa-required") redirect(`/mfa?redirect=${encodeURIComponent(returnTo)}`);
  return getPlatformAdminServices();
}

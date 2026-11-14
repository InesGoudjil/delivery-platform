import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "@/lib/logger";
import { timedQuery } from "./query-timing";

/**
 * Workspace suspension (roadmap 5.6), on the service-role client: the database refuses these
 * columns from tenant sessions. Only build it through getPlatformAdminServices().
 */
export class AdminWorkspaceControls {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly log?: Logger
  ) {}

  async suspend(workspaceId: string, reason: string, adminId: string): Promise<{ suspendedAt: string }> {
    return timedQuery(this.log, "workspace.suspend", async () => {
      const { data, error } = await this.supabase
        .from("workspaces")
        .update({ suspended_at: new Date().toISOString(), suspended_reason: reason, suspended_by: adminId })
        .eq("id", workspaceId)
        .select("suspended_at")
        .single();
      if (error) throw new Error(`Couldn't suspend the workspace: ${error.message}`);
      return { suspendedAt: String((data as { suspended_at: string }).suspended_at) };
    });
  }

  async unsuspend(workspaceId: string): Promise<void> {
    await timedQuery(this.log, "workspace.unsuspend", async () => {
      const { error } = await this.supabase
        .from("workspaces")
        .update({ suspended_at: null, suspended_reason: null, suspended_by: null })
        .eq("id", workspaceId);
      if (error) throw new Error(`Couldn't lift the suspension: ${error.message}`);
    });
  }
}

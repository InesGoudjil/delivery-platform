import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "@/lib/logger";
import { timedQuery } from "./query-timing";
import {
  ADMIN_BAN_DURATIONS,
  type AdminBanDuration,
  type AdminSignOutResult,
  type AdminUserFactor,
  type AdminUserMembership,
  type AdminUserSession,
} from "./types";

type Row = Record<string, unknown>;

const str = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));

/**
 * Account controls for the admin user page (B3), on the service-role client: devices, bans and
 * two-factor. Only build it through getPlatformAdminServices(), after the platform-admin check.
 */
export class AdminUserControls {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly log?: Logger
  ) {}

  async listMemberships(userId: string): Promise<AdminUserMembership[]> {
    return timedQuery(this.log, "user.listMemberships", async () => {
      const { data, error } = await this.supabase
        .from("workspace_members")
        .select("role, joined_at, workspaces(id, brand_name, slug, owner_id)")
        .eq("user_id", userId)
        .order("joined_at", { ascending: true });
      if (error) throw new Error(`Couldn't load the user's workspaces: ${error.message}`);
      return ((data ?? []) as Row[]).flatMap((row) => {
        const workspace = (Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces) as Row | null;
        if (!workspace) return [];
        return [
          {
            workspaceId: String(workspace.id),
            workspaceName: String(workspace.brand_name ?? ""),
            workspaceSlug: String(workspace.slug ?? ""),
            role: String(row.role ?? ""),
            isOwner: workspace.owner_id === userId,
            joinedAt: str(row.joined_at),
          },
        ];
      });
    });
  }

  /** The user's devices, most recently active first. */
  async listSessions(userId: string, limit = 10): Promise<AdminUserSession[]> {
    return timedQuery(this.log, "user.listSessions", async () => {
      const { data, error } = await this.supabase
        .from("user_sessions")
        .select("id, browser, os, device_type, ip_address, city, country, is_revoked, last_active_at, created_at")
        .eq("user_id", userId)
        .order("last_active_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(`Couldn't load the user's devices: ${error.message}`);
      return ((data ?? []) as Row[]).map((row) => ({
        id: String(row.id),
        browser: String(row.browser ?? "Web browser"),
        os: String(row.os ?? ""),
        deviceType: String(row.device_type ?? "desktop"),
        ipAddress: str(row.ip_address),
        city: str(row.city),
        country: str(row.country),
        isRevoked: Boolean(row.is_revoked),
        lastActiveAt: String(row.last_active_at),
        createdAt: String(row.created_at),
      }));
    });
  }

  async listFactors(userId: string): Promise<AdminUserFactor[]> {
    return timedQuery(this.log, "user.listFactors", async () => {
      const { data, error } = await this.supabase.auth.admin.mfa.listFactors({ userId });
      if (error) throw new Error(`Couldn't load the user's two-factor methods: ${error.message}`);
      return (data?.factors ?? []).map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name ?? null,
        factorType: String(factor.factor_type),
        status: factor.status === "verified" ? "verified" : "unverified",
        createdAt: factor.created_at ?? null,
      }));
    });
  }

  /**
   * Signs the user out on every device: flags all their app session rows revoked (the middleware
   * turns those devices away at once) and ends every Supabase login (no refresh tokens left).
   */
  async signOutEverywhere(userId: string): Promise<AdminSignOutResult> {
    return timedQuery(this.log, "user.signOutEverywhere", async () => {
      const { data, error } = await this.supabase
        .from("user_sessions")
        .update({ is_revoked: true })
        .eq("user_id", userId)
        .eq("is_revoked", false)
        .select("id");
      if (error) throw new Error(`Couldn't revoke the user's devices: ${error.message}`);

      const { data: ended, error: endError } = await this.supabase.rpc("admin_end_all_auth_sessions", {
        p_user_id: userId,
      });
      if (endError) throw new Error(`Couldn't end the user's logins: ${endError.message}`);

      return { revokedDevices: (data ?? []).length, endedLogins: Number(ended ?? 0) };
    });
  }

  /** Bans the user for a while (or indefinitely) and signs them out everywhere. Returns when it ends. */
  async ban(userId: string, duration: AdminBanDuration): Promise<{ bannedUntil: string | null } & AdminSignOutResult> {
    const bannedUntil = await timedQuery(this.log, "user.ban", async () => {
      const { data, error } = await this.supabase.auth.admin.updateUserById(userId, {
        ban_duration: ADMIN_BAN_DURATIONS[duration],
      });
      if (error) throw new Error(`Couldn't ban the user: ${error.message}`);
      return data.user?.banned_until ?? null;
    });
    return { bannedUntil, ...(await this.signOutEverywhere(userId)) };
  }

  async unban(userId: string): Promise<void> {
    await timedQuery(this.log, "user.unban", async () => {
      const { error } = await this.supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) throw new Error(`Couldn't lift the ban: ${error.message}`);
    });
  }

  /**
   * Removes every two-factor method of the user (verified or not) and signs them out everywhere,
   * so their next sign-in is password only and they can set up a new authenticator.
   */
  async resetTwoFactor(userId: string): Promise<{ removedFactors: number } & AdminSignOutResult> {
    const factors = await this.listFactors(userId);
    await timedQuery(this.log, "user.resetTwoFactor", async () => {
      for (const factor of factors) {
        const { error } = await this.supabase.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
        if (error) throw new Error(`Couldn't remove a two-factor method: ${error.message}`);
      }
    });
    return { removedFactors: factors.length, ...(await this.signOutEverywhere(userId)) };
  }
}

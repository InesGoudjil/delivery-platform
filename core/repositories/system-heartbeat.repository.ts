import type { SupabaseClient } from "@supabase/supabase-js";

/** Names scheduled jobs record their runs under. */
export const HEARTBEAT_JOBS = {
  /** /api/cron/notifications: comment emails and WhatsApp comment alerts. */
  notifications: "notifications",
} as const;

export interface SystemHeartbeat {
  name: string;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastStatus: "running" | "ok" | "failed" | null;
  lastError: string | null;
  details: unknown;
}

/** When each scheduled job last ran (public.system_heartbeats). Service role only. */
export interface ISystemHeartbeatRepository {
  started(name: string): Promise<void>;
  finished(name: string, status: "ok" | "failed", details?: unknown, error?: string | null): Promise<void>;
  get(name: string): Promise<SystemHeartbeat | null>;
}

export class SupabaseSystemHeartbeatRepository implements ISystemHeartbeatRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async started(name: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from("system_heartbeats")
      .upsert({ name, last_started_at: now, last_status: "running", updated_at: now }, { onConflict: "name" });
    if (error) throw new Error(`Couldn't record the start of ${name}: ${error.message}`);
  }

  async finished(name: string, status: "ok" | "failed", details?: unknown, errorMessage?: string | null): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase.from("system_heartbeats").upsert(
      {
        name,
        last_finished_at: now,
        last_status: status,
        last_error: errorMessage ?? null,
        details: details ?? null,
        updated_at: now,
      },
      { onConflict: "name" }
    );
    if (error) throw new Error(`Couldn't record the end of ${name}: ${error.message}`);
  }

  async get(name: string): Promise<SystemHeartbeat | null> {
    const { data, error } = await this.supabase
      .from("system_heartbeats")
      .select("name, last_started_at, last_finished_at, last_status, last_error, details")
      .eq("name", name)
      .maybeSingle();
    if (error) throw new Error(`Couldn't read the heartbeat of ${name}: ${error.message}`);
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      name: String(row.name),
      lastStartedAt: (row.last_started_at as string | null) ?? null,
      lastFinishedAt: (row.last_finished_at as string | null) ?? null,
      lastStatus: (row.last_status as SystemHeartbeat["lastStatus"]) ?? null,
      lastError: (row.last_error as string | null) ?? null,
      details: row.details ?? null,
    };
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "@/lib/logger";
import { timedQuery } from "./query-timing";
import type { AdminAuditEvent, AdminAuditEventInput, AdminAuditQuery, AdminPage } from "./types";

type Row = Record<string, unknown>;

const str = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));

function toEvent(row: Row): AdminAuditEvent {
  return {
    id: String(row.id),
    actorId: str(row.actor_id),
    actorEmail: str(row.actor_email),
    action: String(row.action),
    targetType: String(row.target_type),
    targetId: str(row.target_id),
    targetLabel: str(row.target_label),
    reason: str(row.reason),
    outcome: row.outcome === "failed" ? "failed" : "succeeded",
    errorMessage: str(row.error_message),
    changes: (row.changes as AdminAuditEvent["changes"]) ?? null,
    requestId: str(row.request_id),
    ipAddress: str(row.ip_address),
    userAgent: str(row.user_agent),
    createdAt: String(row.created_at),
  };
}

/**
 * The append-only record of platform-admin changes (public.admin_audit_events). Written by
 * createPlatformAdminAction() for every admin write, read by the audit pages.
 */
export class AdminAuditLog {
  constructor(
    private readonly supabase: SupabaseClient,
    /** Times each query; getPlatformAdminServices() passes one tagged with the request ID. */
    private readonly log?: Logger
  ) {}

  async record(event: AdminAuditEventInput): Promise<void> {
    return timedQuery(this.log, "audit.record", async () => {
      const { error } = await this.supabase.from("admin_audit_events").insert({
        actor_id: event.actorId,
        actor_email: event.actorEmail,
        action: event.action,
        target_type: event.targetType,
        target_id: event.targetId ?? null,
        target_label: event.targetLabel ?? null,
        reason: event.reason ?? null,
        outcome: event.outcome,
        error_message: event.errorMessage ?? null,
        changes: event.changes ?? null,
        request_id: event.requestId ?? null,
        ip_address: event.ipAddress ?? null,
        user_agent: event.userAgent ?? null,
      });
      if (error) throw new Error(`Couldn't record the admin audit event: ${error.message}`);
    });
  }

  async list(query: AdminAuditQuery): Promise<AdminPage<AdminAuditEvent>> {
    return timedQuery(this.log, "audit.list", async () => {
      const from = (query.page - 1) * query.pageSize;
      let request = this.supabase
        .from("admin_audit_events")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + query.pageSize - 1);

      if (query.action) request = request.eq("action", query.action);
      if (query.targetType) request = request.eq("target_type", query.targetType);
      if (query.targetId) request = request.eq("target_id", query.targetId);
      if (query.actorId) request = request.eq("actor_id", query.actorId);
      if (query.outcome) request = request.eq("outcome", query.outcome);

      const { data, error, count } = await request;
      if (error) throw new Error(`Couldn't load the audit log: ${error.message}`);
      return { rows: ((data ?? []) as Row[]).map(toEvent), total: count ?? 0, page: query.page, pageSize: query.pageSize };
    });
  }

  async listForTarget(targetType: string, targetId: string, limit = 10): Promise<AdminAuditEvent[]> {
    const page = await this.list({ targetType, targetId, page: 1, pageSize: limit });
    return page.rows;
  }

  async latest(limit = 5): Promise<AdminAuditEvent[]> {
    const page = await this.list({ page: 1, pageSize: limit });
    return page.rows;
  }
}

import type { AdminAuditEvent } from "@/core/admin/types";
import { Pill } from "./badges";
import { AUDIT_ACTION_LABELS, formatDateTime, formatRelative } from "../_lib/format";

/** Before and after of an audit event, as compact JSON. */
export function AuditChanges({ changes }: { changes: AdminAuditEvent["changes"] }) {
  if (!changes || (changes.before === undefined && changes.after === undefined)) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">What changed</summary>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        {changes.before !== undefined && (
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Before</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-[11px] leading-snug">
              {JSON.stringify(changes.before, null, 2)}
            </pre>
          </div>
        )}
        {changes.after !== undefined && (
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">After</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-[11px] leading-snug">
              {JSON.stringify(changes.after, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}

export function AuditTimeline({ events, emptyMessage }: { events: AdminAuditEvent[]; emptyMessage: string }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="border-l-2 border-border pl-3">
          <p className="text-sm font-medium">
            {AUDIT_ACTION_LABELS[event.action] ?? event.action}{" "}
            {event.outcome === "failed" && <Pill tone="danger">Failed</Pill>}
          </p>
          <p className="text-xs text-muted-foreground" title={formatDateTime(event.createdAt)}>
            {event.actorEmail ?? "Unknown admin"} · {formatRelative(event.createdAt)}
          </p>
          {event.reason && <p className="mt-1 text-sm">“{event.reason}”</p>}
          {event.errorMessage && <p className="mt-1 text-xs text-destructive">{event.errorMessage}</p>}
          <AuditChanges changes={event.changes} />
        </li>
      ))}
    </ol>
  );
}

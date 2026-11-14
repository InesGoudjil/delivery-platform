"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminAuditEvent } from "@/core/admin/types";
import { AdminDataTable, type AdminTableFilter } from "../../_components/admin-data-table";
import { AuditChanges } from "../../_components/audit-timeline";
import { Pill } from "../../_components/badges";
import { AUDIT_ACTION_LABELS, formatDateTime, formatRelative } from "../../_lib/format";

function targetHref(event: AdminAuditEvent): string | null {
  if (!event.targetId) return null;
  if (event.targetType === "workspace") return `/admin/workspaces/${event.targetId}`;
  if (event.targetType === "user") return `/admin/users/${event.targetId}`;
  return null;
}

export function AuditTable({
  rows,
  total,
  page,
  pageSize,
  admins,
}: {
  rows: AdminAuditEvent[];
  total: number;
  page: number;
  pageSize: number;
  /** Current platform admins, for the "Admin" filter. */
  admins: { id: string; email: string }[];
}) {
  const columns: ColumnDef<AdminAuditEvent, unknown>[] = [
    {
      id: "when",
      header: "When",
      meta: { className: "whitespace-nowrap" },
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground" title={formatDateTime(row.original.createdAt)}>
          {formatRelative(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "admin",
      header: "Admin",
      cell: ({ row }) => <span className="text-sm">{row.original.actorEmail ?? "Unknown admin"}</span>,
    },
    {
      id: "action",
      header: "Change",
      meta: { className: "min-w-[260px]" },
      cell: ({ row }) => {
        const event = row.original;
        const href = targetHref(event);
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {AUDIT_ACTION_LABELS[event.action] ?? event.action}{" "}
              {event.outcome === "failed" && <Pill tone="danger">Failed</Pill>}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {event.targetType}
              {": "}
              {href ? (
                <Link href={href} className="hover:underline">
                  {event.targetLabel ?? event.targetId}
                </Link>
              ) : (
                (event.targetLabel ?? event.targetId ?? "—")
              )}
            </p>
            {event.errorMessage && <p className="text-xs text-destructive">{event.errorMessage}</p>}
            <AuditChanges changes={event.changes} />
          </div>
        );
      },
    },
    {
      id: "reason",
      header: "Reason",
      meta: { className: "min-w-[200px]" },
      cell: ({ row }) => <span className="text-sm">{row.original.reason ?? "—"}</span>,
    },
  ];

  const filters: AdminTableFilter[] = [
    {
      key: "actor",
      label: "Admin",
      options: admins.map((admin) => ({ value: admin.id, label: admin.email })),
    },
    {
      key: "action",
      label: "Change",
      options: Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      key: "target",
      label: "Target",
      options: [
        { value: "workspace", label: "Workspaces" },
        { value: "user", label: "Users" },
        { value: "plan", label: "Plans" },
        { value: "waitlist", label: "Waitlist" },
      ],
    },
    {
      key: "outcome",
      label: "Outcome",
      options: [
        { value: "succeeded", label: "Succeeded" },
        { value: "failed", label: "Failed" },
      ],
    },
  ];

  return (
    <AdminDataTable
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      filters={filters}
      emptyMessage="No admin changes match these filters."
    />
  );
}

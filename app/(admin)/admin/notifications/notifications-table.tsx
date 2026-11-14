"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminNotificationRow } from "@/core/admin/types";
import { AdminDataTable, type AdminTableFilter } from "../../_components/admin-data-table";
import { Pill } from "../../_components/badges";
import { formatDateTime, formatRelative } from "../../_lib/format";

const STATUS_TONES: Record<string, "neutral" | "success" | "danger" | "primary"> = {
  queued: "neutral",
  sent: "primary",
  delivered: "success",
  failed: "danger",
};

export function NotificationsTable({
  rows,
  total,
  page,
  pageSize,
  showWorkspace = true,
  showFilters = true,
}: {
  rows: AdminNotificationRow[];
  total: number;
  page: number;
  pageSize: number;
  showWorkspace?: boolean;
  showFilters?: boolean;
}) {
  const columns: ColumnDef<AdminNotificationRow, unknown>[] = [
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
      id: "channel",
      header: "Channel",
      cell: ({ row }) => <Pill tone="neutral">{row.original.channel === "whatsapp" ? "WhatsApp" : "Email"}</Pill>,
    },
    ...(showWorkspace
      ? [
          {
            id: "workspace",
            header: "Workspace",
            cell: ({ row }) => (
              <Link href={`/admin/workspaces/${row.original.workspaceId}`} className="text-sm hover:underline">
                {row.original.workspaceName ?? "Unknown workspace"}
              </Link>
            ),
          } satisfies ColumnDef<AdminNotificationRow, unknown>,
        ]
      : []),
    {
      id: "message",
      header: "Message",
      meta: { className: "min-w-[220px]" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.original.subject ?? (row.original.channel === "whatsapp" ? "WhatsApp message" : "Email")}</p>
          <p className="truncate text-xs text-muted-foreground">To {row.original.recipient ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      meta: { className: "min-w-[160px]" },
      cell: ({ row }) => (
        <div className="space-y-1">
          <Pill tone={STATUS_TONES[row.original.status] ?? "neutral"}>{row.original.status}</Pill>
          {row.original.errorMessage && (
            <p className="max-w-xs truncate text-xs text-destructive" title={row.original.errorMessage}>
              {row.original.errorMessage}
            </p>
          )}
        </div>
      ),
    },
  ];

  const filters: AdminTableFilter[] = showFilters
    ? [
        {
          key: "status",
          label: "Status",
          options: [
            { value: "failed", label: "Failed" },
            { value: "queued", label: "Queued" },
            { value: "sent", label: "Sent" },
            { value: "delivered", label: "Delivered" },
          ],
        },
        {
          key: "channel",
          label: "Channel",
          options: [
            { value: "email", label: "Email" },
            { value: "whatsapp", label: "WhatsApp" },
          ],
        },
        {
          key: "period",
          label: "Period",
          options: [
            { value: "24h", label: "Last 24 hours" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
          ],
        },
      ]
    : [];

  return (
    <AdminDataTable
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      filters={filters}
      emptyMessage="No notifications match these filters."
    />
  );
}

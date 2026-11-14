"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminWorkspaceRow } from "@/core/admin/types";
import { AdminDataTable, type AdminTableFilter } from "../../_components/admin-data-table";
import { Pill, StorageBar, SubscriptionStatusBadge } from "../../_components/badges";
import {
  SUBSCRIPTION_STATUS_LABELS,
  formatBytes,
  formatDate,
  formatGb,
  formatNumber,
  formatRelative,
  storagePercent,
} from "../../_lib/format";
import { WorkspaceActionsMenu, type AdminPlanOption } from "./workspace-actions";

export function WorkspacesTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  plans,
}: {
  rows: AdminWorkspaceRow[];
  total: number;
  page: number;
  pageSize: number;
  sort: { key: string; desc: boolean };
  plans: AdminPlanOption[];
}) {
  const columns: ColumnDef<AdminWorkspaceRow, unknown>[] = [
    {
      id: "workspace",
      header: "Workspace",
      meta: { sortKey: "brand_name", sortFirst: "asc", className: "min-w-[220px]" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="flex items-center gap-1.5">
            <Link href={`/admin/workspaces/${row.original.id}`} className="font-medium hover:underline">
              {row.original.brandName}
            </Link>
            {row.original.suspendedAt && <Pill tone="danger">Suspended</Pill>}
          </span>
          <p className="truncate text-xs text-muted-foreground">
            /{row.original.slug} · {row.original.ownerEmail ?? "no owner email"}
          </p>
        </div>
      ),
    },
    {
      id: "plan",
      header: "Plan",
      cell: ({ row }) => {
        const workspace = row.original;
        const lapsed = workspace.planSlug && workspace.effectivePlanSlug && workspace.planSlug !== workspace.effectivePlanSlug;
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm">{workspace.planName ?? "—"}</span>
              {workspace.stripeBilled && <Pill tone="neutral">Stripe</Pill>}
              {workspace.hasOverrides && <Pill tone="primary" title="This workspace has feature overrides">Overrides</Pill>}
            </div>
            {lapsed && <p className="text-xs text-muted-foreground">Gets {workspace.effectivePlanSlug} features</p>}
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Subscription",
      cell: ({ row }) => (
        <div className="space-y-1">
          <SubscriptionStatusBadge status={row.original.subscriptionStatus} />
          {row.original.subscriptionStatus === "trialing" && row.original.trialEndsAt && (
            <p className="text-xs text-muted-foreground">Trial ends {formatRelative(row.original.trialEndsAt)}</p>
          )}
        </div>
      ),
    },
    {
      id: "storage",
      header: "Storage",
      meta: { sortKey: "storage", className: "min-w-[150px]" },
      cell: ({ row }) => {
        const percent = storagePercent(row.original.storageUsedBytes, row.original.storageLimitGb);
        return (
          <div className="space-y-1">
            <p className="text-xs tabular-nums">
              {formatBytes(row.original.storageUsedBytes)} <span className="text-muted-foreground">/ {formatGb(row.original.storageLimitGb)}</span>
            </p>
            <StorageBar percent={percent} />
          </div>
        );
      },
    },
    {
      id: "deliveries",
      header: "Deliveries",
      meta: { sortKey: "deliveries", className: "text-right" },
      cell: ({ row }) => (
        <span className="tabular-nums" title={`${row.original.deliveriesCount} including archived`}>
          {formatNumber(row.original.activeDeliveriesCount)}
        </span>
      ),
    },
    {
      id: "members",
      header: "Members",
      meta: { className: "text-right" },
      cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.membersCount)}</span>,
    },
    {
      id: "last_activity",
      header: "Last activity",
      meta: { sortKey: "last_activity" },
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.lastActivityAt)}</span>,
    },
    {
      id: "created_at",
      header: "Created",
      meta: { sortKey: "created_at" },
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      meta: { className: "w-10 text-right" },
      cell: ({ row }) => (
        <WorkspaceActionsMenu
          plans={plans}
          workspace={{
            id: row.original.id,
            brandName: row.original.brandName,
            slug: row.original.slug,
            planId: row.original.planId,
            stripeBilled: row.original.stripeBilled,
            storageLimitGb: row.original.storageLimitGb,
            storageOverrideGb: row.original.storageOverrideGb,
            suspendedAt: row.original.suspendedAt,
          }}
        />
      ),
    },
  ];

  const filters: AdminTableFilter[] = [
    {
      key: "plan",
      label: "Plan",
      options: [...plans.map((plan) => ({ value: plan.slug, label: plan.name })), { value: "none", label: "No subscription" }],
    },
    {
      key: "status",
      label: "Subscription",
      options: ["active", "trialing", "past_due", "canceled", "none"].map((status) => ({
        value: status,
        label: SUBSCRIPTION_STATUS_LABELS[status],
      })),
    },
    {
      key: "flag",
      label: "Needs a look",
      options: [
        { value: "trial_ending", label: "Trial ends within 3 days" },
        { value: "storage_high", label: "Storage above 90%" },
        { value: "overrides", label: "Has overrides" },
        { value: "suspended", label: "Suspended" },
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
      sort={sort}
      getRowId={(row) => row.id}
      search={{ placeholder: "Search name, slug, owner email or ID" }}
      filters={filters}
      emptyMessage="No workspaces match these filters."
    />
  );
}

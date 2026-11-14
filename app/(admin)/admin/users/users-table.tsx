"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminUserRow } from "@/core/admin/types";
import { AdminDataTable, type AdminTableFilter } from "../../_components/admin-data-table";
import { Pill } from "../../_components/badges";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "../../_lib/format";
import { UserActionsMenu } from "./user-actions";

export function UsersTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  currentUserId,
}: {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  sort: { key: string; desc: boolean };
  currentUserId: string;
}) {
  const columns: ColumnDef<AdminUserRow, unknown>[] = [
    {
      id: "user",
      header: "User",
      meta: { sortKey: "email", sortFirst: "asc", className: "min-w-[220px]" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium">
            <Link href={`/admin/users/${row.original.id}`} className="truncate hover:underline">
              {row.original.fullName || row.original.email || "Unnamed user"}
            </Link>
            {row.original.id === currentUserId && <Pill tone="primary">You</Pill>}
          </p>
          {row.original.fullName && <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>}
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) =>
        row.original.platformRole === "admin" ? <Pill tone="primary">Platform admin</Pill> : <span className="text-sm text-muted-foreground">User</span>,
    },
    {
      id: "workspaces",
      header: "Workspaces",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="text-sm">
            {user.primaryWorkspace ? (
              <Link href={`/admin/workspaces/${user.primaryWorkspace.id}`} className="hover:underline">
                {user.primaryWorkspace.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">None owned</span>
            )}
            <p className="text-xs text-muted-foreground">
              Owns {formatNumber(user.ownedWorkspaces)} · member of {formatNumber(user.memberships)}
            </p>
          </div>
        );
      },
    },
    {
      id: "security",
      header: "Account",
      cell: ({ row }) => {
        const user = row.original;
        const banned = user.bannedUntil !== null && new Date(user.bannedUntil) > new Date();
        return (
          <div className="flex flex-wrap gap-1">
            {user.mfaEnabled ? <Pill tone="success">2FA on</Pill> : <Pill tone="neutral">No 2FA</Pill>}
            {!user.emailConfirmedAt && <Pill tone="warning">Unconfirmed</Pill>}
            {banned && <Pill tone="danger" title={`Until ${formatDateTime(user.bannedUntil)}`}>Banned</Pill>}
          </div>
        );
      },
    },
    {
      id: "last_sign_in",
      header: "Last sign-in",
      meta: { sortKey: "last_sign_in" },
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground" title={formatDateTime(row.original.lastSignInAt)}>
          {row.original.lastSignInAt ? formatRelative(row.original.lastSignInAt) : "Never"}
        </span>
      ),
    },
    {
      id: "created_at",
      header: "Joined",
      meta: { sortKey: "created_at" },
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      meta: { className: "w-10 text-right" },
      cell: ({ row }) => (
        <UserActionsMenu
          isSelf={row.original.id === currentUserId}
          user={{
            id: row.original.id,
            email: row.original.email,
            fullName: row.original.fullName,
            platformRole: row.original.platformRole,
            bannedUntil: row.original.bannedUntil,
            mfaEnabled: row.original.mfaEnabled,
          }}
        />
      ),
    },
  ];

  const filters: AdminTableFilter[] = [
    {
      key: "role",
      label: "Role",
      options: [
        { value: "admin", label: "Platform admins" },
        { value: "user", label: "Users" },
      ],
    },
    {
      key: "flag",
      label: "Account",
      options: [
        { value: "unconfirmed", label: "Email unconfirmed" },
        { value: "banned", label: "Banned" },
        { value: "no_mfa", label: "No 2FA" },
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
      search={{ placeholder: "Search email, name or ID" }}
      filters={filters}
      emptyMessage="No users match these filters."
    />
  );
}

"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type { WaitlistEntry } from "@/core/entities/waitlist";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inviteWaitlistCohortAction } from "@/app/actions/waitlist";
import { AdminDataTable } from "../../_components/admin-data-table";
import { KpiCard } from "../../_components/kpi-card";
import { AdminPageHeader } from "../../_components/page-header";
import { Pill } from "../../_components/badges";
import { ReasonDialog } from "../../_components/reason-dialog";
import { formatDate, formatNumber } from "../../_lib/format";

const COHORT_SIZES = ["5", "10", "25", "50"] as const;

export function WaitlistClient({
  metrics,
  entries,
  total,
  page,
  pageSize,
}: {
  metrics: { total: number; pending: number; invited: number; registered: number };
  entries: WaitlistEntry[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const [cohortSize, setCohortSize] = useState<(typeof COHORT_SIZES)[number]>("10");
  const [open, setOpen] = useState(false);
  const offset = (page - 1) * pageSize;

  const columns: ColumnDef<WaitlistEntry, unknown>[] = [
    {
      id: "rank",
      header: "#",
      meta: { className: "w-12 text-muted-foreground" },
      cell: ({ row }) => <span className="tabular-nums">{formatNumber(offset + row.index + 1)}</span>,
    },
    {
      id: "email",
      header: "Email",
      cell: ({ row }) => <span className="font-medium">{row.original.email}</span>,
    },
    {
      id: "referrals",
      header: "Referrals",
      meta: { className: "text-right" },
      cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.referralCount)}</span>,
    },
    {
      id: "score",
      header: "Priority",
      meta: { className: "text-right" },
      cell: ({ row }) => <Pill tone="primary">+{formatNumber(row.original.priorityScore)} pts</Pill>,
    },
    {
      id: "profile",
      header: "Role / size",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.role || "—"}
          {row.original.companySize ? ` (${row.original.companySize})` : ""}
        </span>
      ),
    },
    {
      id: "joined",
      header: "Joined",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Waitlist"
        description="The pending queue in invite order: priority score first, then who joined earliest."
        actions={
          <>
            <Select
              items={COHORT_SIZES.map((size) => ({ value: size, label: `Next ${size}` }))}
              value={cohortSize}
              onValueChange={(value) => setCohortSize((value as (typeof COHORT_SIZES)[number]) ?? "10")}
            >
              <SelectTrigger size="sm" aria-label="Cohort size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COHORT_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    Next {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setOpen(true)} disabled={metrics.pending === 0}>
              <Send className="size-4" /> Invite cohort
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Everyone who joined" value={formatNumber(metrics.total)} />
        <KpiCard label="Waiting" value={formatNumber(metrics.pending)} />
        <KpiCard label="Invited" value={formatNumber(metrics.invited)} />
        <KpiCard label="Signed up" value={formatNumber(metrics.registered)} />
      </div>

      <AdminDataTable
        columns={columns}
        rows={entries}
        total={total}
        page={page}
        pageSize={pageSize}
        getRowId={(row) => row.id}
        emptyMessage="Nobody is waiting."
      />

      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={`Invite the next ${cohortSize} people?`}
        description={`This emails an invite link to the top ${cohortSize} people in the queue. It can't be undone.`}
        confirmLabel="Send invites"
        onConfirm={async (reason) => {
          const result = await inviteWaitlistCohortAction({ limit: Number(cohortSize), reason });
          if (!result.success) return result.error;
          toast.success(`Invited ${formatNumber(result.invitedCount)} ${result.invitedCount === 1 ? "person" : "people"}.`);
        }}
      />
    </>
  );
}

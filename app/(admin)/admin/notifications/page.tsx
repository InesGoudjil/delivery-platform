import { Suspense } from "react";
import Link from "next/link";
import type { SearchParams } from "nuqs/server";
import { getPlatformAdminServices, requirePlatformAdminPage } from "@/core/admin/context";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "../../_components/badges";
import { AdminLoadError, AdminPageHeader, AdminSection } from "../../_components/page-header";
import { attempt } from "../../_lib/data";
import { formatDateTime, formatNumber, formatRelative } from "../../_lib/format";
import { idFrom, loadNotificationListParams, pageFrom } from "../../_lib/search-params";
import { NotificationsTable } from "./notifications-table";

export const metadata = { title: "Notifications" };

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requirePlatformAdminPage("/admin/notifications");
  const params = await loadNotificationListParams(searchParams);
  const page = pageFrom(params.page);
  const pageSize = Number(params.size);
  const workspaceId = idFrom(params.workspace);

  const loaded = await attempt(() =>
    admin.readModel.listNotifications({
      channel: params.channel,
      status: params.status,
      period: params.period,
      workspaceId,
      page,
      pageSize,
    })
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        title="Notifications"
        description="Every email and WhatsApp message the platform sent, with its status. Recipients are shortened."
        actions={
          workspaceId ? (
            <Link href="/admin/notifications" className="text-xs text-muted-foreground hover:text-foreground">
              Showing one workspace · show all
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Suspense fallback={<SectionSkeleton title="Scheduler" />}>
          <Scheduler />
        </Suspense>
        <div className="lg:col-span-2">
          <Suspense fallback={<SectionSkeleton title="Waiting to be sent" />}>
            <PendingBatches />
          </Suspense>
        </div>
      </div>

      {loaded.ok ? (
        <NotificationsTable rows={loaded.value.rows} total={loaded.value.total} page={page} pageSize={pageSize} />
      ) : (
        <AdminLoadError what="notifications" error={loaded.error} />
      )}

      <p className="text-xs text-muted-foreground">
        A failed message can&apos;t be sent again from here yet: the log keeps who it went to and its subject, not the
        message itself.
      </p>
    </div>
  );
}

async function Scheduler() {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).readModel.getScheduler());
  if (!loaded.ok) return <AdminLoadError what="the scheduler status" error={loaded.error} />;
  const scheduler = loaded.value;
  return (
    <AdminSection title="Scheduler" description="/api/cron/notifications sends comment emails and WhatsApp alerts.">
      {!scheduler.lastFinishedAt && !scheduler.lastStartedAt ? (
        <div className="space-y-1 text-sm">
          <Pill tone="warning">Never ran</Pill>
          <p className="text-muted-foreground">
            Nothing calls it yet, so batched comment emails and WhatsApp alerts aren&apos;t sent. Set up the schedule in
            docs/notifications.md (step 3).
          </p>
        </div>
      ) : (
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Last run</dt>
            <dd title={formatDateTime(scheduler.lastFinishedAt)}>{formatRelative(scheduler.lastFinishedAt ?? scheduler.lastStartedAt)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Result</dt>
            <dd>
              {scheduler.lastStatus === "ok" ? (
                <Pill tone="success">OK</Pill>
              ) : scheduler.lastStatus === "failed" ? (
                <Pill tone="danger">Failed</Pill>
              ) : (
                <Pill tone="neutral">Running</Pill>
              )}
            </dd>
          </div>
          {scheduler.lastError && <p className="text-xs text-destructive">{scheduler.lastError}</p>}
          {scheduler.stale && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              It hasn&apos;t run for more than 30 minutes. Check the schedule.
            </p>
          )}
        </dl>
      )}
    </AdminSection>
  );
}

async function PendingBatches() {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).readModel.listPendingBatches());
  if (!loaded.ok) return <AdminLoadError what="the waiting messages" error={loaded.error} />;
  const batches = loaded.value;
  const overdue = batches.filter((batch) => batch.overdue).length;
  return (
    <AdminSection
      title="Waiting to be sent"
      description={
        batches.length === 0
          ? "Client comments the studios haven't been told about yet."
          : `${formatNumber(batches.length)} ${batches.length === 1 ? "batch" : "batches"} of client comments${overdue > 0 ? `, ${formatNumber(overdue)} overdue` : ""}.`
      }
    >
      {batches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing is waiting.</p>
      ) : (
        <ul className="divide-y divide-border">
          {batches.map((batch) => (
            <li key={`${batch.kind}-${batch.deliveryId}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2 first:pt-0 last:pb-0">
              <span className="min-w-0 text-sm">
                <Pill tone="neutral">{batch.kind === "whatsapp" ? "WhatsApp" : "Email"}</Pill>{" "}
                <span className="font-medium">{batch.deliveryTitle ?? "Untitled delivery"}</span>
                <span className="text-muted-foreground">
                  {" "}
                  ·{" "}
                  <Link href={`/admin/workspaces/${batch.workspaceId}`} className="hover:underline">
                    {batch.workspaceName ?? "Unknown workspace"}
                  </Link>{" "}
                  · {formatNumber(batch.comments)} {batch.comments === 1 ? "comment" : "comments"}
                </span>
              </span>
              <span className="text-xs">
                {batch.overdue ? (
                  <Pill tone="warning">Overdue</Pill>
                ) : (
                  <span className="text-muted-foreground">
                    {batch.kind === "email" ? `Due ${formatRelative(batch.dueAt)}` : `Last comment ${formatRelative(batch.dueAt)}`}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <AdminSection title={title}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </AdminSection>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { getPlatformAdminServices, requirePlatformAdminPage } from "@/core/admin/context";
import type { AdminFailedNotification, AdminPlatformKpis, AdminSchedulerStatus } from "@/core/admin/types";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, KpiGridSkeleton } from "../_components/kpi-card";
import { AdminLoadError, AdminPageHeader, AdminSection } from "../_components/page-header";
import { Pill, SubscriptionStatusBadge } from "../_components/badges";
import { attempt, getAdminKpis } from "../_lib/data";
import { DailyTrends, MrrByPlan } from "../_components/admin-trend-charts";
import {
  AUDIT_ACTION_LABELS,
  formatBytes,
  formatGb,
  formatMoney,
  formatNumber,
  formatRelative,
} from "../_lib/format";

export const metadata = { title: "Overview" };

const TREND_RANGES = [30, 90, 365] as const;

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformAdminPage("/admin");
  const requested = Number((await searchParams).range);
  const range = (TREND_RANGES as readonly number[]).includes(requested) ? requested : 90;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader title="Overview" description="Live numbers across every workspace. Nothing here is estimated." />

      <Suspense fallback={<KpiGridSkeleton />}>
        <Kpis />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<SectionSkeleton title="Needs attention" />}>
            <NeedsAttention />
          </Suspense>
        </div>
        <Suspense fallback={<SectionSkeleton title="Recent admin changes" />}>
          <RecentAdminChanges />
        </Suspense>
      </div>

      <section className="space-y-3" aria-labelledby="trends-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="trends-heading" className="text-sm font-semibold">
            Trends
          </h2>
          <nav aria-label="Trend period" className="flex rounded-lg border border-border bg-card p-0.5 text-xs">
            {TREND_RANGES.map((days) => (
              <Link
                key={days}
                href={days === 90 ? "/admin" : `/admin?range=${days}`}
                aria-current={days === range ? "true" : undefined}
                className={
                  days === range
                    ? "rounded-md bg-muted px-2.5 py-1 font-medium text-foreground"
                    : "rounded-md px-2.5 py-1 text-muted-foreground hover:text-foreground"
                }
                scroll={false}
              >
                {days === 365 ? "12 months" : `${days} days`}
              </Link>
            ))}
          </nav>
        </div>
        <Suspense key={range} fallback={<TrendsSkeleton />}>
          <Trends days={range} />
        </Suspense>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Newest workspaces" />}>
          <NewestWorkspaces />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Recent sign-ups" />}>
          <RecentSignups />
        </Suspense>
      </div>
    </div>
  );
}

async function Kpis() {
  let kpis: AdminPlatformKpis;
  try {
    kpis = await getAdminKpis();
  } catch (error) {
    return <AdminLoadError what="the platform numbers" error={error} />;
  }

  const storagePercent =
    kpis.storageProvisionedGb > 0
      ? Math.round((kpis.storageUsedBytes / (kpis.storageProvisionedGb * 1024 ** 3)) * 100)
      : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        label="Workspaces"
        value={formatNumber(kpis.workspaces)}
        hint={`${formatNumber(kpis.workspacesNew7d)} new this week`}
        href="/admin/workspaces"
      />
      <KpiCard
        label="Paying subscriptions"
        value={formatNumber(kpis.subscriptions.active)}
        hint={`${formatNumber(kpis.subscriptions.trialing)} trialing · ${formatNumber(kpis.subscriptions.past_due)} past due · ${formatNumber(kpis.subscriptions.none)} without a subscription`}
        href="/admin/workspaces?status=active"
      />
      <KpiCard
        label="MRR (list price)"
        value={
          kpis.mrr.length === 0 ? (
            formatMoney(0, "USD")
          ) : (
            <span className="flex flex-col">
              {kpis.mrr.map((entry) => (
                <span key={entry.currency}>{formatMoney(entry.amountCents, entry.currency)}</span>
              ))}
            </span>
          )
        }
        hint={
          <span>
            Active subscriptions, annual ÷ 12, before discounts.{" "}
            <a
              href="https://dashboard.stripe.com/subscriptions"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
            >
              Net revenue in Stripe <ExternalLink className="size-3" />
            </a>
          </span>
        }
      />
      <KpiCard
        label="Storage"
        value={formatBytes(kpis.storageUsedBytes)}
        hint={`of ${formatGb(kpis.storageProvisionedGb)} provisioned${storagePercent !== null ? ` (${storagePercent}%)` : ""}`}
        tone={kpis.storageHigh > 0 ? "warning" : "default"}
      />
      <KpiCard
        label="Deliveries this week"
        value={formatNumber(kpis.deliveries7d)}
        hint={`${formatNumber(kpis.deliveries30d)} in 30 days · ${formatNumber(kpis.approvals7d)} approved this week · ${formatNumber(kpis.deliveries)} in total`}
      />
      <KpiCard
        label="Users"
        value={formatNumber(kpis.users)}
        hint={`${formatNumber(kpis.signups7d)} signed up this week`}
        href="/admin/users"
      />
    </div>
  );
}

async function NeedsAttention() {
  let kpis: AdminPlatformKpis;
  let failures: AdminFailedNotification[];
  let scheduler: AdminSchedulerStatus;
  try {
    const admin = await getPlatformAdminServices();
    [kpis, failures, scheduler] = await Promise.all([
      getAdminKpis(),
      admin.readModel.listFailedNotifications(5),
      admin.readModel.getScheduler(),
    ]);
  } catch (error) {
    return <AdminLoadError what="what needs attention" error={error} />;
  }

  const items = [
    {
      // Shown on its own line, not as a count.
      count: scheduler.stale ? 1 : 0,
      label: scheduler.lastFinishedAt
        ? `scheduler hasn't run since ${formatRelative(scheduler.lastFinishedAt)}`
        : "scheduler has never run",
      detail: "Batched comment emails and WhatsApp alerts wait until /api/cron/notifications runs. See docs/notifications.md (step 3).",
      href: "/admin/notifications",
      hideCount: true,
    },
    {
      count: kpis.subscriptions.past_due,
      label: "past-due subscriptions",
      detail: "Payment failed; Stripe is retrying.",
      href: "/admin/workspaces?status=past_due",
    },
    {
      count: kpis.trialsEnding3d,
      label: "trials ending within 3 days",
      detail: "They lapse to Starter unless they subscribe.",
      href: "/admin/workspaces?flag=trial_ending",
    },
    {
      count: kpis.storageHigh,
      label: "workspaces above 90% of their storage",
      detail: "Uploads will start failing when they're full.",
      href: "/admin/workspaces?flag=storage_high",
    },
    {
      count: kpis.notificationsFailed24h,
      label: "failed notifications in the last 24 hours",
      detail: "Email or WhatsApp sends that didn't go out; the latest are below.",
      href: "/admin/notifications?status=failed&period=24h",
    },
    {
      count: kpis.commentBatchesOverdue,
      label: "comment emails overdue",
      detail: "Client comments still waiting 15 minutes after their batch closed.",
      href: "/admin/notifications",
    },
  ].filter((item) => item.count > 0);

  return (
    <AdminSection
      title="Needs attention"
      description={kpis.waitlistPending > 0 ? `${formatNumber(kpis.waitlistPending)} people are waiting on the waitlist.` : undefined}
    >
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-500" /> Nothing needs attention right now.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const content = (
              <>
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <span className="min-w-0">
                  <span className="text-sm font-medium">
                    {"hideCount" in item && item.hideCount ? `The ${item.label}` : `${formatNumber(item.count)} ${item.label}`}
                  </span>
                  <span className="block text-xs text-muted-foreground">{item.detail}</span>
                </span>
              </>
            );
            return (
              <li key={item.label} className="py-2.5 first:pt-0 last:pb-0">
                {item.href ? (
                  <Link href={item.href} className="flex gap-2.5 rounded-md hover:text-primary">
                    {content}
                  </Link>
                ) : (
                  <div className="flex gap-2.5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {failures.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest failed notifications</p>
          <ul className="space-y-2">
            {failures.map((failure) => (
              <li key={failure.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="min-w-0">
                  <Pill tone="neutral">{failure.channel === "whatsapp" ? "WhatsApp" : "Email"}</Pill>{" "}
                  <Link href={`/admin/workspaces/${failure.workspaceId}`} className="font-medium hover:underline">
                    {failure.workspaceName ?? "Unknown workspace"}
                  </Link>
                  {failure.errorMessage && (
                    <span className="block truncate text-xs text-muted-foreground" title={failure.errorMessage}>
                      {failure.errorMessage}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{formatRelative(failure.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminSection>
  );
}

async function RecentAdminChanges() {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).audit.latest(6));
  if (!loaded.ok) return <AdminLoadError what="recent admin changes" error={loaded.error} />;
  const events = loaded.value;
  return (
    <AdminSection
      title="Recent admin changes"
      actions={
        <Link href="/admin/audit" className="text-xs text-muted-foreground hover:text-foreground">
          Audit log
        </Link>
      }
    >
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No admin changes yet.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="text-sm">
              <p className="font-medium">
                {AUDIT_ACTION_LABELS[event.action] ?? event.action}
                {event.targetLabel ? <span className="font-normal text-muted-foreground"> · {event.targetLabel}</span> : null}
                {event.outcome === "failed" && (
                  <>
                    {" "}
                    <Pill tone="danger">Failed</Pill>
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.actorEmail ?? "Unknown admin"} · {formatRelative(event.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

async function NewestWorkspaces() {
  const loaded = await attempt(async () =>
    (await getPlatformAdminServices()).readModel.listWorkspaces({ sort: "created_at", desc: true, page: 1, pageSize: 5 })
  );
  if (!loaded.ok) return <AdminLoadError what="the newest workspaces" error={loaded.error} />;
  const { rows } = loaded.value;
  return (
    <AdminSection
      title="Newest workspaces"
      actions={
        <Link href="/admin/workspaces" className="text-xs text-muted-foreground hover:text-foreground">
          All workspaces
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No workspaces yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((workspace) => (
            <li key={workspace.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <span className="min-w-0">
                <Link href={`/admin/workspaces/${workspace.id}`} className="block truncate text-sm font-medium hover:underline">
                  {workspace.brandName}
                </Link>
                <span className="block truncate text-xs text-muted-foreground">
                  {workspace.ownerEmail ?? "No owner email"} · {formatRelative(workspace.createdAt)}
                </span>
              </span>
              <SubscriptionStatusBadge status={workspace.subscriptionStatus} />
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

async function RecentSignups() {
  const loaded = await attempt(async () =>
    (await getPlatformAdminServices()).readModel.listUsers({ sort: "created_at", desc: true, page: 1, pageSize: 5 })
  );
  if (!loaded.ok) return <AdminLoadError what="recent sign-ups" error={loaded.error} />;
  const { rows } = loaded.value;
  return (
    <AdminSection
      title="Recent sign-ups"
      actions={
        <Link href="/admin/users" className="text-xs text-muted-foreground hover:text-foreground">
          All users
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{user.fullName || user.email || "Unnamed user"}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {user.fullName ? `${user.email} · ` : ""}
                  {formatRelative(user.createdAt)}
                </span>
              </span>
              {!user.emailConfirmedAt && <Pill tone="warning">Unconfirmed</Pill>}
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

async function Trends({ days }: { days: number }) {
  const loaded = await attempt(async () => {
    const admin = await getPlatformAdminServices();
    return Promise.all([admin.readModel.dailySeries(days), admin.readModel.mrrByPlan()]);
  });
  if (!loaded.ok) return <AdminLoadError what="the trends" error={loaded.error} />;
  const [points, plans] = loaded.value;
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <DailyTrends points={points} />
      </div>
      <AdminSection title="MRR by plan" description="List price of active subscriptions, annual ÷ 12.">
        <MrrByPlan plans={plans} />
      </AdminSection>
    </div>
  );
}

function TrendsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-16" />
          <Skeleton className="mt-3 h-28 w-full" />
        </div>
      ))}
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <AdminSection title={title}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </AdminSection>
  );
}

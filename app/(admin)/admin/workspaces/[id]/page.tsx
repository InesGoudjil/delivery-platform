import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getPlatformAdminServices, requirePlatformAdminPage } from "@/core/admin/context";
import type { AdminWorkspaceRow } from "@/core/admin/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "../../../_components/kpi-card";
import { AdminLoadError, AdminPageHeader, AdminSection } from "../../../_components/page-header";
import { Pill, StorageBar, SubscriptionStatusBadge } from "../../../_components/badges";
import { AuditTimeline } from "../../../_components/audit-timeline";
import {
  formatBytes,
  formatDate,
  formatGb,
  formatNumber,
  formatPlanPrice,
  formatRelative,
  storagePercent,
} from "../../../_lib/format";
import { attempt } from "../../../_lib/data";
import { stripeDashboardUrl } from "../../../_lib/stripe-links";
import { WorkspaceActionsMenu } from "../workspace-actions";

export const metadata = { title: "Workspace" };

export default async function AdminWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requirePlatformAdminPage(`/admin/workspaces/${id}`);

  let workspace: AdminWorkspaceRow | null;
  try {
    workspace = await admin.readModel.getWorkspace(id);
  } catch (error) {
    return <AdminLoadError what="this workspace" error={error} />;
  }
  if (!workspace) notFound();

  const [plans, overrides, subscription] = await Promise.all([
    admin.services.subscription.listAllPlans(),
    admin.services.subscription.getFeatureOverrides(workspace.id),
    admin.services.subscription.getSubscription(workspace.id),
  ]);
  const stripeCustomerUrl = stripeDashboardUrl("customers", subscription?.paymentProviderCustId);
  const stripeSubscriptionUrl = stripeDashboardUrl("subscriptions", subscription?.paymentProviderSubId);
  const percent = storagePercent(workspace.storageUsedBytes, workspace.storageLimitGb);
  const overrideEntries = Object.entries(overrides ?? {});

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        backHref="/admin/workspaces"
        backLabel="Workspaces"
        title={workspace.brandName}
        description={
          <>
            /{workspace.slug} · {workspace.accountType} · created {formatDate(workspace.createdAt)} ·{" "}
            <span className="font-mono text-xs">{workspace.id}</span>
          </>
        }
        actions={
          <WorkspaceActionsMenu
            showOpen={false}
            plans={plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              slug: plan.slug,
              priceCents: plan.priceCents,
              currency: plan.currency,
              billingInterval: plan.billingInterval,
              isActive: plan.isActive,
            }))}
            workspace={{
              id: workspace.id,
              brandName: workspace.brandName,
              slug: workspace.slug,
              planId: workspace.planId,
              stripeBilled: workspace.stripeBilled,
              storageLimitGb: workspace.storageLimitGb,
              storageOverrideGb: workspace.storageOverrideGb,
              suspendedAt: workspace.suspendedAt,
            }}
          />
        }
      />

      {workspace.suspendedAt && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Suspended {formatRelative(workspace.suspendedAt)}</p>
          <p className="mt-1 text-muted-foreground">
            Client links and the portfolio are closed; members can look but not change anything. Reason:{" "}
            {workspace.suspendedReason ?? "none given"}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Plan"
          value={workspace.planName ?? "None"}
          hint={
            <span className="flex flex-wrap items-center gap-1.5">
              <SubscriptionStatusBadge status={workspace.subscriptionStatus} />
              {workspace.planPriceCents !== null && formatPlanPrice(workspace.planPriceCents, workspace.planCurrency, workspace.planInterval)}
            </span>
          }
        />
        <KpiCard
          label="Storage"
          value={formatBytes(workspace.storageUsedBytes)}
          hint={
            <span className="block space-y-1">
              <span>
                of {formatGb(workspace.storageLimitGb)}
                {percent !== null ? ` (${percent}%)` : ""}
                {workspace.storageOverrideGb !== null ? " · overridden" : ""}
              </span>
              <StorageBar percent={percent} />
            </span>
          }
          tone={percent !== null && percent >= 90 ? "warning" : "default"}
        />
        <KpiCard
          label="Deliveries"
          value={formatNumber(workspace.activeDeliveriesCount)}
          hint={`${formatNumber(workspace.deliveriesCount)} including archived`}
        />
        <KpiCard
          label="Members"
          value={formatNumber(workspace.membersCount)}
          hint={`Last activity ${formatRelative(workspace.lastActivityAt)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<SectionSkeleton title="Deliveries" />}>
            <Deliveries workspaceId={workspace.id} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton title="Notifications" />}>
            <RecentNotifications workspaceId={workspace.id} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton title="Admin history" />}>
            <History workspaceId={workspace.id} />
          </Suspense>
        </div>

        <div className="space-y-6">
          <AdminSection title="Owner and billing">
            <dl className="space-y-2 text-sm">
              <Row label="Owner">
                {workspace.ownerName ? `${workspace.ownerName} · ` : ""}
                {workspace.ownerEmail ?? "—"}
              </Row>
              <Row label="Billing">{workspace.stripeBilled ? "Stripe" : workspace.subscriptionStatus ? "Not through Stripe" : "No subscription"}</Row>
              {workspace.trialEndsAt && workspace.subscriptionStatus === "trialing" && (
                <Row label="Trial ends">{formatDate(workspace.trialEndsAt)}</Row>
              )}
              {workspace.currentPeriodEnd && <Row label="Period ends">{formatDate(workspace.currentPeriodEnd)}</Row>}
              <Row label="Gets features of">{workspace.effectivePlanSlug ?? "—"}</Row>
              {stripeCustomerUrl && (
                <Row label="Stripe customer">
                  <StripeLink href={stripeCustomerUrl} id={subscription?.paymentProviderCustId ?? ""} />
                </Row>
              )}
              {stripeSubscriptionUrl && (
                <Row label="Stripe subscription">
                  <StripeLink href={stripeSubscriptionUrl} id={subscription?.paymentProviderSubId ?? ""} />
                </Row>
              )}
            </dl>
          </AdminSection>

          <Suspense fallback={<SectionSkeleton title="Storage" />}>
            <Storage workspaceId={workspace.id} usedBytes={workspace.storageUsedBytes} />
          </Suspense>

          <AdminSection title="Feature overrides" description="These replace the plan's values for this workspace.">
            {overrideEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">None. The plan&apos;s values apply.</p>
            ) : (
              <dl className="space-y-1.5 text-sm">
                {overrideEntries.map(([key, value]) => (
                  <Row key={key} label={key}>
                    <span className="font-mono text-xs">{JSON.stringify(value)}</span>
                  </Row>
                ))}
              </dl>
            )}
          </AdminSection>

          <Suspense fallback={<SectionSkeleton title="Members" />}>
            <Members workspaceId={workspace.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function StripeLink({ href, id }: { href: string; id: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs hover:underline">
      {id} <ExternalLink className="size-3" />
    </a>
  );
}

async function Storage({ workspaceId, usedBytes }: { workspaceId: string; usedBytes: number }) {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).readModel.getStorageBreakdown(workspaceId));
  if (!loaded.ok) return <AdminLoadError what="the storage breakdown" error={loaded.error} />;
  const breakdown = loaded.value;
  return (
    <AdminSection title="Storage" description="Current versions of files that aren't archived.">
      {!breakdown ? (
        <p className="text-sm text-muted-foreground">No files yet.</p>
      ) : (
        <dl className="space-y-1.5 text-sm">
          <Row label="Files">{formatNumber(breakdown.files)}</Row>
          <Row label="Videos">{formatBytes(breakdown.videoBytes)}</Row>
          <Row label="Photos">{formatBytes(breakdown.photoBytes)}</Row>
          <Row label="Counted against the limit">{formatBytes(usedBytes)}</Row>
        </dl>
      )}
    </AdminSection>
  );
}

async function RecentNotifications({ workspaceId }: { workspaceId: string }) {
  const loaded = await attempt(async () =>
    (await getPlatformAdminServices()).readModel.listNotifications({ workspaceId, page: 1, pageSize: 8 })
  );
  if (!loaded.ok) return <AdminLoadError what="the notifications" error={loaded.error} />;
  const { rows, total } = loaded.value;
  return (
    <AdminSection
      title="Notifications"
      description="Emails and WhatsApp messages about this workspace. Recipients are shortened."
      actions={
        total > rows.length ? (
          <Link href={`/admin/notifications?workspace=${workspaceId}`} className="text-xs text-muted-foreground hover:text-foreground">
            All {formatNumber(total)}
          </Link>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">None sent yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((notification) => (
            <li key={notification.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 first:pt-0 last:pb-0 text-sm">
              <span className="min-w-0">
                <Pill tone="neutral">{notification.channel === "whatsapp" ? "WhatsApp" : "Email"}</Pill>{" "}
                {notification.subject ?? "Message"} <span className="text-muted-foreground">to {notification.recipient ?? "—"}</span>
                {notification.errorMessage && (
                  <span className="block truncate text-xs text-destructive" title={notification.errorMessage}>
                    {notification.errorMessage}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Pill tone={notification.status === "failed" ? "danger" : notification.status === "delivered" ? "success" : "neutral"}>
                  {notification.status}
                </Pill>
                {formatRelative(notification.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}

async function Deliveries({ workspaceId }: { workspaceId: string }) {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).readModel.listWorkspaceDeliveries(workspaceId, 50));
  if (!loaded.ok) return <AdminLoadError what="the deliveries" error={loaded.error} />;
  const deliveries = loaded.value;
  return (
    <AdminSection title="Deliveries" description="Titles and counts only. Admins don't open client rooms.">
      {deliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deliveries yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Title</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-right text-xs">Files</TableHead>
              <TableHead className="text-right text-xs">Comments</TableHead>
              <TableHead className="text-xs">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow key={delivery.id}>
                <TableCell>
                  <p className="font-medium">{delivery.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {delivery.clientName ?? "No client"}
                    {delivery.passcodeProtected ? " · passcode" : ""}
                  </p>
                </TableCell>
                <TableCell>
                  <Pill tone={delivery.status === "approved" ? "success" : delivery.status === "archived" ? "neutral" : "primary"}>
                    {delivery.status.replace("_", " ")}
                  </Pill>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(delivery.assetsCount)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(delivery.commentsCount)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(delivery.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminSection>
  );
}

async function Members({ workspaceId }: { workspaceId: string }) {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).readModel.listWorkspaceMembers(workspaceId));
  if (!loaded.ok) return <AdminLoadError what="the members" error={loaded.error} />;
  const members = loaded.value;
  return (
    <AdminSection title="Members">
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members.</p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{member.fullName || member.email || "Unknown user"}</span>
                {member.fullName && <span className="block truncate text-xs text-muted-foreground">{member.email}</span>}
              </span>
              <Pill tone={member.role === "owner" ? "primary" : "neutral"}>{member.role}</Pill>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

async function History({ workspaceId }: { workspaceId: string }) {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).audit.listForTarget("workspace", workspaceId, 10));
  if (!loaded.ok) return <AdminLoadError what="the admin history" error={loaded.error} />;
  const events = loaded.value;
  return (
    <AdminSection title="Admin history" description="Changes platform admins made to this workspace.">
      <AuditTimeline events={events} emptyMessage="No admin changes to this workspace yet." />
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

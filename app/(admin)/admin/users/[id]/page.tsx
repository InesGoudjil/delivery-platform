import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlatformAdminServices, requirePlatformAdminPage } from "@/core/admin/context";
import type { AdminUserRow } from "@/core/admin/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditTimeline } from "../../../_components/audit-timeline";
import { Pill } from "../../../_components/badges";
import { KpiCard } from "../../../_components/kpi-card";
import { AdminLoadError, AdminPageHeader, AdminSection } from "../../../_components/page-header";
import { attempt } from "../../../_lib/data";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "../../../_lib/format";
import { UserActionsMenu } from "../user-actions";

export const metadata = { title: "User" };

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requirePlatformAdminPage(`/admin/users/${id}`);

  const loaded = await attempt(() => admin.readModel.getUser(id));
  if (!loaded.ok) return <AdminLoadError what="this user" error={loaded.error} />;
  const user: AdminUserRow | null = loaded.value;
  if (!user) notFound();

  const isSelf = user.id === admin.user.id;
  const banned = user.bannedUntil !== null && new Date(user.bannedUntil) > new Date();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        backHref="/admin/users"
        backLabel="Users"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {user.fullName || user.email || "Unnamed user"}
            {user.platformRole === "admin" && <Pill tone="primary">Platform admin</Pill>}
            {banned && <Pill tone="danger">Banned</Pill>}
            {isSelf && <Pill tone="neutral">You</Pill>}
          </span>
        }
        description={
          <>
            {user.email ?? "No email"} · joined {formatDate(user.createdAt)} ·{" "}
            <span className="font-mono text-xs">{user.id}</span>
          </>
        }
        actions={
          <UserActionsMenu
            showOpen={false}
            isSelf={isSelf}
            user={{
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              platformRole: user.platformRole,
              bannedUntil: user.bannedUntil,
              mfaEnabled: user.mfaEnabled,
            }}
          />
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Last sign-in"
          value={user.lastSignInAt ? formatRelative(user.lastSignInAt) : "Never"}
          hint={user.lastSignInAt ? formatDateTime(user.lastSignInAt) : undefined}
        />
        <KpiCard
          label="Email"
          value={user.emailConfirmedAt ? "Confirmed" : "Unconfirmed"}
          hint={user.emailConfirmedAt ? `on ${formatDate(user.emailConfirmedAt)}` : "They haven't clicked the confirmation link"}
          tone={user.emailConfirmedAt ? "default" : "warning"}
        />
        <KpiCard label="Two-factor" value={user.mfaEnabled ? "On" : "Off"} />
        <KpiCard
          label="Access"
          value={banned ? "Banned" : "Normal"}
          hint={banned ? `until ${formatDateTime(user.bannedUntil)}` : undefined}
          tone={banned ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<SectionSkeleton title="Workspaces" />}>
            <Memberships userId={user.id} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton title="Admin history" />}>
            <History userId={user.id} />
          </Suspense>
        </div>
        <div className="space-y-6">
          <Suspense fallback={<SectionSkeleton title="Devices" />}>
            <Devices userId={user.id} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton title="Two-factor methods" />}>
            <Factors userId={user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function Memberships({ userId }: { userId: string }) {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).userControls.listMemberships(userId));
  if (!loaded.ok) return <AdminLoadError what="their workspaces" error={loaded.error} />;
  const memberships = loaded.value;
  return (
    <AdminSection title="Workspaces" description="Where they're a member, and with which role.">
      {memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not a member of any workspace.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Workspace</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((membership) => (
              <TableRow key={membership.workspaceId}>
                <TableCell>
                  <Link href={`/admin/workspaces/${membership.workspaceId}`} className="font-medium hover:underline">
                    {membership.workspaceName}
                  </Link>
                  <p className="text-xs text-muted-foreground">/{membership.workspaceSlug}</p>
                </TableCell>
                <TableCell>
                  <Pill tone={membership.isOwner || membership.role === "owner" ? "primary" : "neutral"}>
                    {membership.isOwner ? "owner" : membership.role}
                  </Pill>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(membership.joinedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminSection>
  );
}

async function Devices({ userId }: { userId: string }) {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).userControls.listSessions(userId, 10));
  if (!loaded.ok) return <AdminLoadError what="their devices" error={loaded.error} />;
  const sessions = loaded.value;
  const active = sessions.filter((session) => !session.isRevoked);
  return (
    <AdminSection title="Devices" description={`${formatNumber(active.length)} signed in, most recent first.`}>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No devices recorded.</p>
      ) : (
        <ul className="space-y-2.5">
          {sessions.map((session) => (
            <li key={session.id} className="text-sm">
              <p className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {session.browser} on {session.os || session.deviceType}
                </span>
                {session.isRevoked ? <Pill tone="neutral">Signed out</Pill> : <Pill tone="success">Active</Pill>}
              </p>
              <p className="text-xs text-muted-foreground">
                {[session.city, session.country].filter(Boolean).join(", ") || session.ipAddress || "Unknown location"} · last
                active {formatRelative(session.lastActiveAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

async function Factors({ userId }: { userId: string }) {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).userControls.listFactors(userId));
  if (!loaded.ok) return <AdminLoadError what="their two-factor methods" error={loaded.error} />;
  const factors = loaded.value;
  return (
    <AdminSection title="Two-factor methods">
      {factors.length === 0 ? (
        <p className="text-sm text-muted-foreground">None set up.</p>
      ) : (
        <ul className="space-y-2">
          {factors.map((factor) => (
            <li key={factor.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{factor.friendlyName || factor.factorType.toUpperCase()}</span>
                <span className="block text-xs text-muted-foreground">Added {formatDate(factor.createdAt)}</span>
              </span>
              <Pill tone={factor.status === "verified" ? "success" : "warning"}>
                {factor.status === "verified" ? "In use" : "Not finished"}
              </Pill>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

async function History({ userId }: { userId: string }) {
  const loaded = await attempt(async () => (await getPlatformAdminServices()).audit.listForTarget("user", userId, 10));
  if (!loaded.ok) return <AdminLoadError what="the admin history" error={loaded.error} />;
  return (
    <AdminSection title="Admin history" description="Changes platform admins made to this account.">
      <AuditTimeline events={loaded.value} emptyMessage="No admin changes to this account yet." />
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

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { hasMinRole } from "@/core/security/guards";
import { toWorkspaceShareLinkView } from "@/lib/share-links/view";
import { LinksClient } from "./links-client";

/**
 * Every client link in the workspace, across deliveries: what's active, what expires soon, who
 * opened what, with bulk actions for admins (plans/share-links-manager-plan-2026-11-16.md §3.8 C).
 */

async function LinksFeed({ workspace, userId }: { workspace: { id: string; slug: string }; userId: string }) {
  const services = await getServerServices();
  const [installed, membership] = await Promise.all([
    services.shareLink.isInstalled(),
    services.member.getMember(workspace.id, userId).catch(() => null),
  ]);
  if (!membership?.role) redirect("/");

  const links = installed ? (await services.shareLink.listForWorkspace(workspace.id)).map(toWorkspaceShareLinkView) : [];
  return (
    <LinksClient
      workspaceSlug={workspace.slug}
      links={links}
      installed={installed}
      canManage={hasMinRole(membership.role, "admin")}
    />
  );
}

function LinksLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="h-24 rounded-2xl bg-muted" />
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}

export default async function LinksPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();
  if (!user) redirect(`/login?redirect=/${workspaceSlug}/links`);

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) redirect("/");

  return (
    <Suspense fallback={<LinksLoading />}>
      <LinksFeed workspace={workspace} userId={user.id} />
    </Suspense>
  );
}

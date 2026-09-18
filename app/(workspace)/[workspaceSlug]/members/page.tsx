import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { MembersClient } from "./_components/members-client";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}/members`);
  }

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    redirect("/");
  }

  const isOwner = workspace.ownerId === user.id;
  const member = await services.member.getMember(workspace.id, user.id);

  if (!isOwner && !member) {
    redirect("/");
  }

  const canManage = isOwner || member?.role === "owner" || member?.role === "admin";

  const [seatStats, members, pendingInvitations] = await Promise.all([
    services.member.getWorkspaceSeatStats(workspace.id),
    services.member.listMembers(workspace.id),
    services.member.listPendingInvitations(workspace.id),
  ]);

  return (
    <MembersClient
      workspace={{
        id: workspace.id,
        brandName: workspace.brandName,
        slug: workspace.slug,
        accountType: workspace.accountType,
        ownerId: workspace.ownerId,
      }}
      currentUser={{
        id: user.id,
        email: user.email,
      }}
      canManage={canManage}
      isOwner={isOwner}
      seatStats={seatStats}
      members={members}
      pendingInvitations={pendingInvitations}
    />
  );
}

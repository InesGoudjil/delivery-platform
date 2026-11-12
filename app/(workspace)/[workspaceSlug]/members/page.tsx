import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { hasMinRole } from "@/core/security/guards";
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

  // getMember() also covers the owner in workspaces.owner_id.
  const member = await services.member.getMember(workspace.id, user.id);
  if (!member) {
    redirect("/");
  }

  const canManage = hasMinRole(member.role, "admin");

  const [seatStats, members, pendingInvitations] = await Promise.all([
    services.member.getWorkspaceSeatStats(workspace.id),
    services.member.listMembers(workspace.id),
    // Invitations carry their join tokens: owners and admins only, empty for everyone else.
    services.member.listPendingInvitations(workspace.id, user.id),
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
      currentUserRole={member.role}
      seatStats={seatStats}
      members={members}
      pendingInvitations={pendingInvitations}
    />
  );
}

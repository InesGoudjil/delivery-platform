import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { WorkspaceSidebar } from "@/components/workspaces/workspace-sidebar";
import { WorkspaceHeader } from "@/components/workspaces/workspace-header";
import { AmbientBackground } from "@/components/ui/ambient-background";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}`);
  }

  let workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    const userWorkspaces = await services.workspace.getUserWorkspaces(user.id);
    if (userWorkspaces.length > 0 && userWorkspaces[0].slug !== workspaceSlug) {
      redirect(`/${userWorkspaces[0].slug}`);
    }
    const created = await services.workspace.getOrCreateWorkspace(
      user.id,
      user.user_metadata?.full_name || "My Studio"
    );
    redirect(`/${created.slug}`);
  }

  const isOwner = workspace.ownerId === user.id;
  const isMember = await services.member.isMember(workspace.id, user.id);

  if (!isOwner && !isMember) {
    const userWorkspaces = await services.workspace.getUserWorkspaces(user.id);
    if (userWorkspaces.length > 0 && userWorkspaces[0].slug !== workspaceSlug) {
      redirect(`/${userWorkspaces[0].slug}`);
    }
    redirect("/");
  }

  const [profile, plan, userWorkspaces] = await Promise.all([
    services.profile.getProfile(user.id),
    services.subscription.getCurrentPlan(workspace.id),
    services.workspace.getUserWorkspaces(user.id),
  ]);

  return (
    <SidebarProvider defaultOpen={true}>

      <WorkspaceSidebar
        workspace={workspace}
        workspaces={userWorkspaces}
        user={user}
        profile={profile}
        plan={plan}
      />
      <SidebarInset className="bg-background text-foreground min-h-screen flex flex-col transition-colors duration-200 relative overflow-hidden">
        <AmbientBackground variant="subtle" showNoise={false} />
        {/* Top Header matching CineSpace Dashboard with LIVE PREVIEW */}
        <div className="relative z-10">
          <WorkspaceHeader
            workspace={workspace}
            workspaces={userWorkspaces}
            user={user}
            profile={profile}
            plan={plan}
          />
        </div>

        {/* Main Content View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-16 relative z-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

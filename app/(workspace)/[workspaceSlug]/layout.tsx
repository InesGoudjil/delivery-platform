import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { WorkspaceSidebar } from "@/components/workspaces/workspace-sidebar";
import { WorkspaceHeader } from "@/components/workspaces/workspace-header";

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

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    redirect("/");
  }

  if (workspace.ownerId !== user.id) {
    redirect("/");
  }

  const [profile, plan] = await Promise.all([
    services.profile.getProfile(user.id),
    services.subscription.getCurrentPlan(workspace.id),
  ]);

  return (
    <SidebarProvider defaultOpen={true}>
      <WorkspaceSidebar
        workspace={workspace}
        workspaces={[workspace]}
        user={user}
        profile={profile}
        plan={plan}
      />
      <SidebarInset className="bg-[#09090b] text-[#f6f3ec] min-h-screen flex flex-col">
        {/* Top Header matching CineSpace Dashboard with LIVE PREVIEW */}
        <WorkspaceHeader
          workspace={workspace}
          user={user}
          profile={profile}
          plan={plan}
        />

        {/* Main Content View */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

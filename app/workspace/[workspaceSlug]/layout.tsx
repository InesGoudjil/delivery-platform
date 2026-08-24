import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { WorkspaceSidebar } from "@/components/workspaces/workspace-sidebar";

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
    redirect(`/login?redirect=/workspace/${workspaceSlug}`);
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
        user={user}
        profile={profile}
        plan={plan}
      />
      <SidebarInset className="bg-[#0a0a0b] text-[#f6f3ec] min-h-screen flex flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-md px-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-[#9a9a9f] hover:text-white transition-colors cursor-pointer" />
            <Separator orientation="vertical" className="h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-xs text-[#9a9a9f]">
              <span className="font-semibold text-white">
                {workspace.brandName}
              </span>
              <span className="text-[#5e5e64]">/</span>
              <span className="font-mono text-[#f5551d]">
                {workspaceSlug}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

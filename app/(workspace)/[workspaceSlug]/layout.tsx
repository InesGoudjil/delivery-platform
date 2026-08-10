import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SupabaseWorkspaceRepository } from "@/infrastructure/repositories/supabase-workspace.repository";
import { WorkspaceSidebar } from "./_components/workspace-sidebar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}`);
  }

  const workspaceRepo = new SupabaseWorkspaceRepository(supabase);
  const workspace = await workspaceRepo.findBySlug(workspaceSlug);

  if (!workspace) {
    redirect("/");
  }

  if (workspace.ownerId !== user.id) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col md:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspace.slug}
        workspaceName={workspace.brandName}
        accentColor={workspace.accentColor}
        userEmail={user.email}
      />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

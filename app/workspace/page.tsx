import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";

export default async function WorkspaceIndexRedirect() {
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/workspace");
  }

  const userWorkspaces = await services.workspace.getUserWorkspaces(user.id);
  if (userWorkspaces.length > 0) {
    redirect(`/${userWorkspaces[0].slug}`);
  }

  const created = await services.workspace.getOrCreateWorkspace(
    user.id,
    user.user_metadata?.full_name || "My Studio"
  );
  redirect(`/${created.slug}`);
}

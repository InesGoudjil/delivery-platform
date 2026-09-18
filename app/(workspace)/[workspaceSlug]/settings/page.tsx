import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { BrandingClient } from "./branding-client";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}/settings`);
  }

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    redirect("/");
  }

  const [portfolio, features] = await Promise.all([
    services.portfolio.getOrCreatePortfolio(
      workspace.id,
      `${workspace.brandName} Portfolio`,
      workspaceSlug
    ),
    services.subscription.getFeatures(workspace.id),
  ]);

  return (
    <BrandingClient
      workspace={workspace}
      portfolio={portfolio}
      features={features}
    />
  );
}

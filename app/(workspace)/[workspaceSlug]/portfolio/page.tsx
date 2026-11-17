import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { loadWorkspacePortfolioItems } from "@/lib/workspace-portfolio";
import { PortfolioClient } from "./portfolio-client";
import { SelectableCoverAsset } from "@/lib/portfolio-data";
import PortfolioLoading from "./loading";

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}/portfolio`);
  }

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    redirect("/");
  }

  return (
    <Suspense fallback={<PortfolioLoading />}>
      <PortfolioContent
        workspace={workspace}
        workspaceSlug={workspaceSlug}
      />
    </Suspense>
  );
}

async function PortfolioContent({
  workspace,
  workspaceSlug,
}: {
  workspace: any;
  workspaceSlug: string;
}) {
  const services = await getServerServices();

  // 1. Get or Create Portfolio domain entity
  const portfolio = await services.portfolio.getOrCreatePortfolio(
    workspace.id,
    `${workspace.brandName} Portfolio`,
    workspaceSlug
  );


  // 2. Showcase projects with their files, standalone pieces, and plan features
  const [{ items: allPortfolioItems, featuredIds: initialFeaturedIds }, features] = await Promise.all([
    loadWorkspacePortfolioItems(services, workspace.id, portfolio),
    services.subscription.getFeatures(workspace.id),
  ]);

  // Build selectable cover assets for the Cover Banner & Showcase Hero stage
  const availableAssets: SelectableCoverAsset[] = [];

  for (const item of allPortfolioItems) {
    if (item.type === "project" && item.projectAssets && item.projectAssets.length > 0) {
      for (const asset of item.projectAssets) {
        availableAssets.push({
          id: asset.id,
          title: asset.title,
          type: asset.type === "still" ? "still" : "video",
          url: asset.url,
          thumbnailUrl: asset.thumbnailUrl,
          aspectRatio: asset.aspectRatio || "16:9",
          duration: asset.duration,
          category: asset.category,
          projectName: item.title,
        });
      }
    } else {
      availableAssets.push({
        id: item.id,
        title: item.title,
        type: item.type === "still" ? "still" : "video",
        url: item.mediaUrl || item.thumbnailUrl,
        thumbnailUrl: item.thumbnailUrl,
        aspectRatio: item.aspectRatio || "16:9",
        category: item.category,
      });
    }
  }

  const finalAvailableAssets: SelectableCoverAsset[] = availableAssets;

  return (
    <PortfolioClient
      workspace={{
        id: workspace.id,
        brandName: workspace.brandName,
        slug: workspace.slug,
        logoUrl: workspace.logoUrl,
        accentColor: workspace.accentColor,
      }}
      portfolio={portfolio}
      initialProjects={allPortfolioItems}
      initialFeaturedIds={initialFeaturedIds}
      features={features}
      availableAssets={finalAvailableAssets}
    />
  );
}

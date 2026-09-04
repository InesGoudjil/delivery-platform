import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { PortfolioClient, PortfolioItem } from "./portfolio-client";

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

  // 1. Get or Create Portfolio domain entity
  const portfolio = await services.portfolio.getOrCreatePortfolio(
    workspace.id,
    `${workspace.brandName} Portfolio`,
    workspaceSlug
  );


  // 2. Query workspace projects, standalone assets, and featured items
  const [dbProjects, standaloneAssets, featuredRelations] = await Promise.all([
    services.project.listWorkspaceProjects(workspace.id),
    services.asset.listUnassignedAssets(workspace.id),
    services.portfolio.getFeaturedProjects(portfolio.id),
  ]);

  // 3. Map DB projects
  const mappedDbProjects: PortfolioItem[] = await Promise.all(
    dbProjects.map(async (p) => {
      const assets = await services.asset.listAssets(p.id);
      let thumbnailUrl = "";
      if (assets.length > 0) {
        const activeVersion = await services.asset.getActiveVersion(assets[0].id);
        thumbnailUrl = activeVersion?.thumbnailUrl || activeVersion?.rawFileUrl || "";
      }

      return {
        id: p.id,
        title: p.title,
        category: (p as { clientName?: string }).clientName || "Commercial Project",
        type: "project" as const,
        assetCount: assets.length || 1,
        thumbnailUrl,
        isFeatured: featuredRelations.some((fr) => fr.projectId === p.id),
      };
    })
  );

  // 4. Map Standalone Workspace Assets (Films & Stills)
  const mappedStandaloneAssets: PortfolioItem[] = await Promise.all(
    standaloneAssets.map(async (asset) => {
      const activeVersion = await services.asset.getActiveVersion(asset.id);
      const itemType = asset.type === "photo_gallery" ? ("still" as const) : ("film" as const);
      const thumbnailUrl = activeVersion?.thumbnailUrl || activeVersion?.rawFileUrl || "";

      return {
        id: asset.id,
        title: asset.title,
        category: asset.type === "photo_gallery" ? "Photo Gallery" : "Film Cut",
        type: itemType,
        assetCount: 1,
        thumbnailUrl,
        isFeatured: featuredRelations.some((fr) => fr.assetId === asset.id),
      };
    })
  );

  // Unified portfolio showcase containing EVERYTHING (Projects + Standalone Films + Standalone Stills)
  const allPortfolioItems = [...mappedDbProjects, ...mappedStandaloneAssets];

  const initialFeaturedIds =
    featuredRelations.length > 0
      ? featuredRelations
          .map((fr) => fr.projectId || fr.assetId)
          .filter((id): id is string => Boolean(id))
      : allPortfolioItems.map((p) => p.id);

  return (
    <PortfolioClient
      workspace={workspace}
      portfolio={portfolio}
      initialProjects={allPortfolioItems}
      initialFeaturedIds={initialFeaturedIds}
    />
  );
}

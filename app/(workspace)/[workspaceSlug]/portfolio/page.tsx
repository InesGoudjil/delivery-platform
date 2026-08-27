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


  // // 2. Query workspace projects & featured links
  const [dbProjects, featuredRelations] = await Promise.all([
    services.project.listWorkspaceProjects(workspace.id),
    services.portfolio.getFeaturedProjects(portfolio.id),
  ]);

    // console.log("here",portfolio,dbProjects)


  // 3. Map DB projects with assets
  const mappedDbProjects: PortfolioItem[] = await Promise.all(
    dbProjects.map(async (p) => {
      const assets = await services.asset.listAssets(p.id);
      const activeVersion =
        assets.length > 0
          ? await services.asset.getActiveVersion(assets[0].id)
          : null;

      return {
        id: p.id,
        title: p.title,
        category: (p as { clientName?: string }).clientName || "Commercial",
        type: "project" as const,
        assetCount: assets.length || 1,
        thumbnailUrl:
          activeVersion?.thumbnailUrl ||
          "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=80",
        isFeatured: featuredRelations.some((fr) => fr.projectId === p.id),
      };
    })
  );

  // Default Cinematic Showcase items from screenshot if database is fresh


  // Merge real DB projects with showcase items
  const projects =
    mappedDbProjects.length > 0
      ? mappedDbProjects
      : [];

  const initialFeaturedIds =
    featuredRelations.length > 0
      ? featuredRelations.map((fr) => fr.projectId)
      : projects.map((p) => p.id);


  // return (<>aqzd</>)
  return (
    <PortfolioClient
      workspace={workspace}
      portfolio={portfolio}
      initialProjects={projects}
      initialFeaturedIds={initialFeaturedIds}
    />
  );
}

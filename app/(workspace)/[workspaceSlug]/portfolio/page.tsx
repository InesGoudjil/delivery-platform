import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { resolveMediaUrl } from "@/lib/media";
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


  // 2. Query showcase projects and standalone assets
  const [dbProjects, standaloneAssets] = await Promise.all([
    services.project.listPortfolioProjects(portfolio.id),
    services.asset.listUnassignedAssets(workspace.id),
  ]);

  // 3. Map DB projects
  const mappedDbProjects: PortfolioItem[] = await Promise.all(
    dbProjects.map(async (p) => {
      const deliveryIdToQuery = p.sourceDeliveryId || p.id;
      let assets = await services.asset.listAssets(deliveryIdToQuery);
      if (assets.length === 0 && p.id !== deliveryIdToQuery) {
        assets = await services.asset.listAssets(p.id);
      }

      const projectAssets = await Promise.all(
        assets.map(async (a) => {
          const activeVersion = await services.asset.getActiveVersion(a.id);
          const isStill = a.type === "photo_gallery";
          const rawMedia =
            activeVersion?.rawFileUrl ||
            activeVersion?.hlsManifestUrl ||
            activeVersion?.thumbnailUrl ||
            "";
          const rawThumb =
            activeVersion?.thumbnailUrl || activeVersion?.rawFileUrl || "";
          return {
            id: a.id,
            title: a.title,
            type: isStill ? ("still" as const) : ("film" as const),
            url: resolveMediaUrl(rawMedia),
            thumbnailUrl: resolveMediaUrl(rawThumb),
            aspectRatio: a.aspectRatio || "16:9",
            duration: activeVersion?.durationSeconds
              ? `${Math.floor(activeVersion.durationSeconds / 60)}:${String(
                  Math.floor(activeVersion.durationSeconds % 60)
                ).padStart(2, "0")}`
              : null,
            category: isStill ? "Photo Still" : "Film Cut",
          };
        })
      );

      let thumbnailUrl = "";
      if (projectAssets.length > 0) {
        thumbnailUrl = projectAssets[0].thumbnailUrl;
      }

      return {
        id: p.id,
        title: p.title,
        category: p.clientName || p.category || "Commercial Project",
        type: "project" as const,
        assetCount: projectAssets.length,
        thumbnailUrl: resolveMediaUrl(p.coverAssetUrl) || thumbnailUrl,
        description: p.description,
        isFeatured: p.isPublished,
        projectAssets,
      };
    })
  );

  // 4. Map Standalone Workspace Assets (Films & Stills)
  const mappedStandaloneAssets: PortfolioItem[] = await Promise.all(
    standaloneAssets.map(async (asset) => {
      const activeVersion = await services.asset.getActiveVersion(asset.id);
      const itemType = asset.type === "photo_gallery" ? ("still" as const) : ("film" as const);
      const rawThumb = activeVersion?.thumbnailUrl || activeVersion?.rawFileUrl || "";
      const rawMedia =
        activeVersion?.rawFileUrl ||
        activeVersion?.hlsManifestUrl ||
        rawThumb;

      return {
        id: asset.id,
        title: asset.title,
        category: asset.type === "photo_gallery" ? "Photo Gallery" : "Film Cut",
        type: itemType,
        assetCount: 1,
        thumbnailUrl: resolveMediaUrl(rawThumb),
        mediaUrl: resolveMediaUrl(rawMedia),
        aspectRatio: asset.aspectRatio || (itemType === "still" ? "1:1" : "16:9"),
        isFeatured: true,
      };
    })
  );

  // Unified portfolio showcase containing EVERYTHING (Projects + Standalone Films + Standalone Stills)
  const allPortfolioItems = [...mappedDbProjects, ...mappedStandaloneAssets];

  const initialFeaturedIds = allPortfolioItems
    .filter((p) => p.isFeatured)
    .map((p) => p.id);

  return (
    <PortfolioClient
      workspace={workspace}
      portfolio={portfolio}
      initialProjects={allPortfolioItems}
      initialFeaturedIds={initialFeaturedIds}
    />
  );
}

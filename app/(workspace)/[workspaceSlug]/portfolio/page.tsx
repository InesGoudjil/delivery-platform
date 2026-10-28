import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import { PortfolioClient, PortfolioItem } from "./portfolio-client";
import { DEMO_PORTFOLIO_ASSETS } from "@/lib/demo-portfolio";
import { SelectableCoverAsset } from "@/lib/portfolio-data";

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


  // 2. Query showcase projects, standalone assets, and plan features
  const [dbProjects, standaloneAssets, features] = await Promise.all([
    services.project.listPortfolioProjects(portfolio.id),
    services.asset.listUnassignedAssets(workspace.id),
    services.subscription.getFeatures(workspace.id),
  ]);


  const featuredItemIds: string[] = Array.isArray(portfolio.appearance?.featuredItemIds)
    ? portfolio.appearance.featuredItemIds
    : [];

  // 3. Map DB projects
  const mappedDbProjects: PortfolioItem[] = await Promise.all(
    dbProjects.map(async (p) => {
      const deliveryIdToQuery = p.sourceDeliveryId || p.id;
      let assets = await services.asset.listAssets(deliveryIdToQuery);
      if (assets.length === 0 && p.id !== deliveryIdToQuery) {
        assets = await services.asset.listAssets(p.id);
      }
      if (assets.length === 0) {
        const projectWithAssets = await services.project.getProjectWithAssets(p.id);
        if (projectWithAssets?.assets && projectWithAssets.assets.length > 0) {
          assets = projectWithAssets.assets;
        }
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
          const resolvedThumb = resolveThumbnailUrl(
            activeVersion?.thumbnailUrl,
            rawMedia,
            isStill
          );
          return {
            id: a.id,
            title: a.title,
            type: isStill ? ("still" as const) : ("film" as const),
            url: resolveMediaUrl(rawMedia),
            thumbnailUrl: resolvedThumb,
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

      const projectThumb = resolveThumbnailUrl(p.coverAssetUrl, thumbnailUrl, false);

      const isFeatured = featuredItemIds.includes(p.id);

      return {
        id: p.id,
        title: p.title,
        category: p.clientName || p.category || "Commercial Project",
        type: "project" as const,
        assetCount: projectAssets.length,
        thumbnailUrl: projectThumb || thumbnailUrl,
        description: p.description,
        isFeatured,
        projectAssets,
      };
    })
  );

  // 4. Map Standalone Workspace Assets (Films & Stills)
  const mappedStandaloneAssets: PortfolioItem[] = await Promise.all(
    standaloneAssets.map(async (asset) => {
      const activeVersion = await services.asset.getActiveVersion(asset.id);
      const itemType = asset.type === "photo_gallery" ? ("still" as const) : ("film" as const);
      const isStill = itemType === "still";
      const rawMedia =
        activeVersion?.rawFileUrl ||
        activeVersion?.hlsManifestUrl ||
        "";
      const resolvedThumb = resolveThumbnailUrl(
        activeVersion?.thumbnailUrl,
        rawMedia,
        isStill
      );
      const isFeatured = featuredItemIds.includes(asset.id);

      return {
        id: asset.id,
        title: asset.title,
        category: isStill ? "Photo Gallery" : "Film Cut",
        type: itemType,
        assetCount: 1,
        thumbnailUrl: resolvedThumb,
        mediaUrl: resolveMediaUrl(rawMedia || resolvedThumb),
        aspectRatio: asset.aspectRatio || undefined,
        isFeatured,
      };
    })
  );

  // Unified portfolio showcase containing EVERYTHING (Projects + Standalone Films + Standalone Stills)
  const allPortfolioItems = [...mappedDbProjects, ...mappedStandaloneAssets];

  const initialFeaturedIds = featuredItemIds.filter((id) =>
    allPortfolioItems.some((item) => item.id === id)
  );

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

  const finalAvailableAssets: SelectableCoverAsset[] =
    availableAssets.length > 0
      ? availableAssets
      : DEMO_PORTFOLIO_ASSETS.map((demo) => ({
          id: String(demo.id),
          title: demo.title,
          type: demo.kind === "still" ? "still" : "video",
          url: demo.videoUrl || demo.image,
          thumbnailUrl: demo.image,
          aspectRatio: "16:9",
          duration: demo.tc,
          category: demo.cat,
        }));

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

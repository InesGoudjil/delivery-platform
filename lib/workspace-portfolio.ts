import type { CoreServices } from "@/core/container";
import type { Asset, AssetVersion } from "@/core/entities/asset";
import type { Portfolio, PortfolioItem, ProjectAsset } from "@/core/entities/portfolio";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";

type Services = Pick<CoreServices["services"], "asset" | "project">;

/**
 * The items of a workspace's portfolio editor (/<workspace>/portfolio): its showcase projects
 * with their files, then its standalone films and stills. Used by the page and by the SWR
 * refresh (getWorkspacePortfolioDataAction), so both show the same thing.
 *
 * Each project lists the files of its source delivery, or of the delivery with its own id, or the
 * files linked to it, whichever has some. Active versions are read in one query for the
 * standalone pieces and one for every project's files, not one query per file.
 */
export async function loadWorkspacePortfolioItems(
  services: Services,
  workspaceId: string,
  portfolio: Pick<Portfolio, "id" | "appearance">
): Promise<{ items: PortfolioItem[]; featuredIds: string[] }> {
  const [dbProjects, standaloneAssets] = await Promise.all([
    services.project.listPortfolioProjects(portfolio.id),
    services.asset.listPortfolioAssets(workspaceId),
  ]);

  const featuredItemIds: string[] = Array.isArray(portfolio.appearance?.featuredItemIds)
    ? portfolio.appearance.featuredItemIds
    : [];

  const [projectAssetLists, pieceVersions] = await Promise.all([
    Promise.all(
      dbProjects.map(async (p): Promise<Asset[]> => {
        const deliveryIdToQuery = p.sourceDeliveryId || p.id;
        let assets: Asset[] = await services.asset.listAssets(deliveryIdToQuery);
        if (assets.length === 0 && p.id !== deliveryIdToQuery) {
          assets = await services.asset.listAssets(p.id);
        }
        if (assets.length === 0) {
          const projectWithAssets = await services.project.getProjectWithAssets(p.id);
          if (projectWithAssets?.assets && projectWithAssets.assets.length > 0) {
            assets = projectWithAssets.assets;
          }
        }
        return assets;
      })
    ),
    services.asset.getActiveVersions(standaloneAssets.map((a) => a.id)),
  ]);
  const projectVersions = await services.asset.getActiveVersions(projectAssetLists.flat().map((a) => a.id));

  const mappedDbProjects: PortfolioItem[] = dbProjects.map((p, index) => {
    const projectAssets: ProjectAsset[] = projectAssetLists[index].map((a) =>
      toProjectAsset(a, projectVersions.get(a.id) ?? null)
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
  });

  const mappedStandaloneAssets: PortfolioItem[] = standaloneAssets.map((asset) => {
    const activeVersion = pieceVersions.get(asset.id) ?? null;
    const itemType = asset.type === "photo_gallery" ? ("still" as const) : ("film" as const);
    const isStill = itemType === "still";
    const rawMedia = activeVersion?.rawFileUrl || activeVersion?.hlsManifestUrl || "";
    const resolvedThumb = resolveThumbnailUrl(activeVersion?.thumbnailUrl, rawMedia, isStill);
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
  });

  // Projects first, then standalone films and stills.
  const items = [...mappedDbProjects, ...mappedStandaloneAssets];
  const featuredIds = featuredItemIds.filter((id) => items.some((item) => item.id === id));
  return { items, featuredIds };
}

function toProjectAsset(a: Asset, activeVersion: AssetVersion | null): ProjectAsset {
  const isStill = a.type === "photo_gallery";
  const rawMedia = activeVersion?.rawFileUrl || activeVersion?.hlsManifestUrl || activeVersion?.thumbnailUrl || "";
  const resolvedThumb = resolveThumbnailUrl(activeVersion?.thumbnailUrl, rawMedia, isStill);
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
}

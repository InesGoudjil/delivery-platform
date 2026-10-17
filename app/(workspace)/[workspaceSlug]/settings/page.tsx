import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { BrandingClient } from "./branding-client";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import { DEMO_PORTFOLIO_ASSETS } from "@/lib/demo-portfolio";
import { SelectableCoverAsset } from "@/lib/portfolio-data";

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

  const [portfolio, features, userProfile] = await Promise.all([
    services.portfolio.getOrCreatePortfolio(
      workspace.id,
      `${workspace.brandName} Portfolio`,
      workspaceSlug
    ),
    services.subscription.getFeatures(workspace.id),
    services.profile.getProfile(user.id),
  ]);

  // Query projects & standalone assets
  const [pProjects, wProjects, standaloneAssets] = await Promise.all([
    portfolio ? services.project.listPortfolioProjects(portfolio.id) : [],
    services.project.listWorkspaceProjects(workspace.id),
    services.asset.listUnassignedAssets(workspace.id),
  ]);

  // Merge unique projects
  const projectMap = new Map<string, any>();
  pProjects.forEach((p) => projectMap.set(p.id, p));
  wProjects.forEach((p) => {
    if (!projectMap.has(p.id)) projectMap.set(p.id, p);
  });
  const allProjects = Array.from(projectMap.values());

  const realAssets: SelectableCoverAsset[] = [];

  for (const p of allProjects) {
    const deliveryIdToQuery = p.sourceDeliveryId || p.id;
    let assets = await services.asset.listAssets(deliveryIdToQuery);
    if (assets.length === 0 && p.id !== deliveryIdToQuery) {
      assets = await services.asset.listAssets(p.id);
    }
    for (const a of assets) {
      const activeVersion = await services.asset.getActiveVersion(a.id);
      const isStill = a.type === "photo_gallery" || a.category === "still";
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
      realAssets.push({
        id: a.id,
        title: a.title,
        type: isStill ? "still" : "video",
        url: resolveMediaUrl(rawMedia || resolvedThumb),
        thumbnailUrl: resolvedThumb,
        aspectRatio: a.aspectRatio || "16:9",
        duration: activeVersion?.durationSeconds
          ? `${Math.floor(activeVersion.durationSeconds / 60)}:${String(
              Math.floor(activeVersion.durationSeconds % 60)
            ).padStart(2, "0")}`
          : null,
        category: a.category || (isStill ? "Photo Still" : "Film Cut"),
        projectName: p.title,
      });
    }
  }

  for (const a of standaloneAssets) {
    const activeVersion = await services.asset.getActiveVersion(a.id);
    const isStill = a.type === "photo_gallery" || a.category === "still";
    const rawMedia =
      activeVersion?.rawFileUrl ||
      activeVersion?.hlsManifestUrl ||
      "";
    const resolvedThumb = resolveThumbnailUrl(
      activeVersion?.thumbnailUrl,
      rawMedia,
      isStill
    );
    realAssets.push({
      id: a.id,
      title: a.title,
      type: isStill ? "still" : "video",
      url: resolveMediaUrl(rawMedia || resolvedThumb),
      thumbnailUrl: resolvedThumb,
      aspectRatio: a.aspectRatio || "16:9",
      duration: activeVersion?.durationSeconds
        ? `${Math.floor(activeVersion.durationSeconds / 60)}:${String(
            Math.floor(activeVersion.durationSeconds % 60)
          ).padStart(2, "0")}`
        : null,
      category: a.category || (isStill ? "Photo Gallery" : "Film Cut"),
    });
  }

  const finalAssets: SelectableCoverAsset[] =
    realAssets.length > 0
      ? realAssets
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
    <BrandingClient
      workspace={workspace}
      portfolio={portfolio}
      features={features}
      userProfile={userProfile}
      availableAssets={finalAssets}
    />
  );
}

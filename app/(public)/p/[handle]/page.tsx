import type { Metadata } from "next";
import { getServerServices } from "@/core/server";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import {
  PortfolioAsset,
  PortfolioProject,
  FilmmakerProfile,
  PortfolioExperienceItem,
  DEFAULT_PROFILE_TEMPLATE,
  PublicFeaturedItem,
} from "@/lib/portfolio-data";
import { DEMO_PORTFOLIO_PROJECTS, DEMO_PORTFOLIO_ASSETS } from "@/lib/demo-portfolio";
import { PortfolioProvider } from "./_components/portfolio-context";
import { PortfolioHeader } from "./_components/portfolio-header";
import { PortfolioHero } from "./_components/portfolio-hero";
import { LatestWork } from "./_components/latest-work";
import { PortfolioAbout } from "./_components/portfolio-about";
import { PortfolioCta } from "./_components/portfolio-cta";
import { PortfolioFooter } from "./_components/portfolio-footer";
import { PortfolioModals } from "./_components/portfolio-modals";
import { AmbientBackground } from "@/components/ui/ambient-background";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  try {
    const services = await getServerServices();
    let workspace = await services.workspace.getWorkspaceBySlug(handle);
    let portfolio = null;

    if (workspace) {
      portfolio = await services.portfolio.getPortfolioByWorkspace(workspace.id);
    } else {
      const publicView = await services.portfolio.getPublicPortfolio(handle);
      if (publicView) {
        portfolio = publicView;
        workspace = await services.workspace.getWorkspaceById(publicView.workspaceId);
      }
    }

    const title = workspace?.brandName
      ? `${workspace.brandName} — Portfolio`
      : portfolio?.title || "Pedro Concreato — Portfolio";
    const description =
      portfolio?.bio || "Commercial films & luxury visual portfolio across the Gulf.";
    const coverUrl =
      resolveMediaUrl(portfolio?.coverAssetUrl) || "/images/hero.jpg";

    return {
      title: `${title} | CineSpace`,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: coverUrl, width: 1200, height: 630, alt: title }],
      },
    };
  } catch {
    return {
      title: "Pedro Concreato — Portfolio | CineSpace",
      description: "Commercial films & luxury visual portfolio across the Gulf.",
    };
  }
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { handle } = await params;
  const services = await getServerServices();

  let workspace = null;
  let portfolio = null;

  try {
    // 1. Resolve Workspace by slug, public portfolio slug, or first workspace
    workspace = await services.workspace.getWorkspaceBySlug(handle);

    if (!workspace) {
      const publicView = await services.portfolio.getPublicPortfolio(handle);
      if (publicView) {
        portfolio = publicView;
        workspace = await services.workspace.getWorkspaceById(publicView.workspaceId);
      }
    }

    if (!workspace) {
      const allWorkspaces = await services.workspace.listAllWorkspaces();
      workspace =
        allWorkspaces.find((w) => w.slug === handle) ||
        allWorkspaces[0] ||
        null;
    }

    // 2. Fetch or Create Portfolio domain entity
    if (workspace && !portfolio) {
      portfolio = await services.portfolio.getOrCreatePortfolio(
        workspace.id,
        `${workspace.brandName} Portfolio`,
        workspace.slug
      );
    }
  } catch (err: any) {
    console.warn("Notice resolving workspace/portfolio:", err?.message || err);
  }

  // 3. Fetch Real Projects, Standalone Assets, and Deliveries from DB
  let dbProjects: any[] = [];
  let wsProjects: any[] = [];
  let wsDeliveries: any[] = [];
  let standaloneAssets: any[] = [];

  if (workspace) {
    try {
      const [pProjects, wProjects, unassigned, deliveries] = await Promise.all([
        portfolio ? services.project.listPortfolioProjects(portfolio.id) : [],
        services.project.listWorkspaceProjects(workspace.id),
        services.asset.listUnassignedAssets(workspace.id),
        services.delivery.listWorkspaceDeliveries(workspace.id),
      ]);
      dbProjects = pProjects;
      wsProjects = wProjects;
      standaloneAssets = unassigned;
      wsDeliveries = deliveries;
    } catch (err: any) {
      console.warn("Notice fetching database assets/projects:", err?.message || err);
    }
  }

  // Merge unique projects from DB
  const projectMap = new Map<string, any>();
  dbProjects.forEach((p) => projectMap.set(p.id, p));
  wsProjects.forEach((p) => {
    if (!projectMap.has(p.id)) projectMap.set(p.id, p);
  });

  // Include delivered client projects from deliveries table
  wsDeliveries.forEach((d) => {
    if (!projectMap.has(d.id)) {
      projectMap.set(d.id, {
        id: d.id,
        title: d.title,
        clientName: d.title,
        description: d.description || "Delivered commercial production.",
        category: "Commercial Delivery",
        coverAssetUrl: null,
        year: d.deliveryDate ? new Date(d.deliveryDate).getFullYear().toString() : "2026",
        location: d.location || "UAE",
        sourceDeliveryId: d.id,
      });
    }
  });

  const combinedProjects = Array.from(projectMap.values());

  // 4. Extract Real Assets for each project
  const realProjects: PortfolioProject[] = [];
  const realAssets: PortfolioAsset[] = [];

  for (const p of combinedProjects) {
    const deliveryIdToQuery = p.sourceDeliveryId || p.id;
    let assets = await services.asset.listAssets(deliveryIdToQuery);
    if (assets.length === 0 && p.id !== deliveryIdToQuery) {
      assets = await services.asset.listAssets(p.id);
    }

    const projectAssetIds: string[] = [];

    for (const a of assets) {
      const activeVersion = await services.asset.getActiveVersion(a.id);
      const isStill = a.type === "photo_gallery" || a.category === "still";
      const rawMedia = resolveMediaUrl(
        activeVersion?.rawFileUrl ||
        activeVersion?.hlsManifestUrl ||
        activeVersion?.thumbnailUrl ||
        ""
      );
      const rawThumb = resolveThumbnailUrl(
        activeVersion?.thumbnailUrl,
        rawMedia,
        isStill
      );

      let ar = 1.6;
      if (a.aspectRatio === "9:16") ar = 0.5625;
      else if (a.aspectRatio === "1:1") ar = 1.0;
      else if (a.aspectRatio === "4:3") ar = 1.33;

      let tc = "—";
      if (activeVersion?.durationSeconds) {
        const mins = Math.floor(activeVersion.durationSeconds / 60);
        const secs = Math.floor(activeVersion.durationSeconds % 60);
        tc = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
      }

      const assetItem: PortfolioAsset = {
        id: a.id,
        kind: isStill ? "still" : "film",
        cat: p.clientName || p.category || p.title,
        title: a.title || (isStill ? "Photo Still" : "Film Cut"),
        desc: p.description || `${a.title} from ${p.title}`,
        ar,
        tc,
        image: rawThumb || rawMedia || "/images/hero.jpg",
        videoUrl: isStill ? undefined : (rawMedia || undefined),
        resolution: isStill ? "High Res" : "4K 60fps",
      };

      realAssets.push(assetItem);
      projectAssetIds.push(a.id);
    }

    const projectCover =
      resolveMediaUrl(p.coverAssetUrl) ||
      (projectAssetIds.length > 0
        ? realAssets.find((a) => a.id === projectAssetIds[0])?.image
        : "") ||
      "/images/hero.jpg";

    realProjects.push({
      id: p.id,
      title: p.title,
      client: p.clientName || p.category || p.title,
      desc: p.description || `A cinematic showcase project featuring ${p.title}.`,
      date: p.year || "2026",
      location: p.location || "UAE",
      cover: projectAssetIds[0] || p.id,
      coverImage: projectCover,
      tc: `${projectAssetIds.length} ${projectAssetIds.length === 1 ? "asset" : "assets"}`,
      assetIds: projectAssetIds,
    });
  }

  // 5. Extract Standalone Assets (unassigned stills and films)
  for (const a of standaloneAssets) {
    const activeVersion = await services.asset.getActiveVersion(a.id);
    const isStill = a.type === "photo_gallery" || a.category === "still";
    const rawMedia = resolveMediaUrl(
      activeVersion?.rawFileUrl ||
      activeVersion?.hlsManifestUrl ||
      activeVersion?.thumbnailUrl ||
      ""
    );
    const rawThumb = resolveThumbnailUrl(
      activeVersion?.thumbnailUrl,
      rawMedia,
      isStill
    );

    let ar = 1.6;
    if (a.aspectRatio === "9:16") ar = 0.5625;
    else if (a.aspectRatio === "1:1") ar = 1.0;
    else if (a.aspectRatio === "4:3") ar = 1.33;

    let tc = "—";
    if (activeVersion?.durationSeconds) {
      const mins = Math.floor(activeVersion.durationSeconds / 60);
      const secs = Math.floor(activeVersion.durationSeconds % 60);
      tc = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }

    realAssets.push({
      id: a.id,
      kind: isStill ? "still" : "film",
      cat: a.category || (isStill ? "Stills" : "Films"),
      title: a.title || (isStill ? "Photo Still" : "Film Cut"),
      desc: `Visual showcase piece — ${a.title}`,
      ar,
      tc,
      image: rawThumb || rawMedia || "/images/hero.jpg",
      videoUrl: isStill ? undefined : (rawMedia || undefined),
      resolution: isStill ? "High Res" : "4K 60fps",
    });
  }

  // 7. Real Experience from Database Entity
  const realExperiences: PortfolioExperienceItem[] = (
    portfolio?.experience && Array.isArray(portfolio.experience) && portfolio.experience.length > 0
      ? portfolio.experience
      : [
          {
            id: "exp-1",
            role: "Commercial Director & Cinematographer",
            company: "Gulf Brand Campaigns & Launches",
            period: "2022 — Present",
            description: "Directing high-impact commercial campaigns and brand launches for prestige automotive, hospitality, and luxury brands across the UAE.",
          },
          {
            id: "exp-2",
            role: "Lead DP & Colorist",
            company: "Independent Studio · Dubai & Sharjah",
            period: "2020 — 2022",
            description: "Spearheaded camera operation and DaVinci Resolve color grading for fashion editorial films and private client high-end events.",
          },
          {
            id: "exp-3",
            role: "Automotive & Action Filmmaker",
            company: "Prestige Track & Supercar Media",
            period: "2018 — 2020",
            description: "Captured high-speed dynamic tracking, roller shots, and precision anamorphic cinema reels across Yas Marina and Dubai Autodrome.",
          },
        ]
  ).map((exp: any, idx: number) => ({
    id: exp.id || `exp_${idx}`,
    role: exp.role || "Director / Cinematographer",
    company: exp.company || "Brand Production",
    period: exp.years || exp.period || "Present",
    location: exp.location || undefined,
    category: exp.category || undefined,
    description: exp.description || "",
  }));

  // 8. Dynamic Projects & Assets Resolution
  let finalProjects = realProjects;
  let finalAssets = realAssets;

  // Authentic demo fallback ONLY for the default Pedro demo handle if no DB media exists
  if (finalProjects.length === 0 && finalAssets.length === 0 && handle.toLowerCase() === "pedro") {
    finalProjects = DEMO_PORTFOLIO_PROJECTS;
    finalAssets = DEMO_PORTFOLIO_ASSETS;
  }

  // 9. Build Ordered Featured Items List from Appearance Settings
  const featuredItemIds: string[] = Array.isArray(portfolio?.appearance?.featuredItemIds)
    ? portfolio.appearance.featuredItemIds
    : [];

  const featuredItems: PublicFeaturedItem[] = [];

  for (const id of featuredItemIds) {
    const project = finalProjects.find((p) => String(p.id) === String(id));
    if (project) {
      featuredItems.push({
        id: String(project.id),
        title: project.title,
        category: project.client || "Commercial Project",
        type: "project",
        thumbnailUrl: project.coverImage,
        project,
      });
      continue;
    }

    const asset = finalAssets.find((a) => String(a.id) === String(id));
    if (asset) {
      featuredItems.push({
        id: String(asset.id),
        title: asset.title,
        category: asset.cat || (asset.kind === "still" ? "Photo Still" : "Film Cut"),
        type: asset.kind === "still" ? "still" : "film",
        thumbnailUrl: asset.image,
        videoUrl: asset.videoUrl,
        aspectRatio: asset.ar?.toString(),
        asset,
      });
    }
  }

  // If no items are explicitly pinned yet, provide a sensible default highlight
  if (featuredItems.length === 0) {
    if (finalProjects.length > 0) {
      const p = finalProjects[0];
      featuredItems.push({
        id: String(p.id),
        title: p.title,
        category: p.client || "Commercial Project",
        type: "project",
        thumbnailUrl: p.coverImage,
        project: p,
      });
    } else if (finalAssets.length > 0) {
      const a = finalAssets[0];
      featuredItems.push({
        id: String(a.id),
        title: a.title,
        category: a.cat || (a.kind === "still" ? "Photo Still" : "Film Cut"),
        type: a.kind === "still" ? "still" : "film",
        thumbnailUrl: a.image,
        videoUrl: a.videoUrl,
        aspectRatio: a.ar?.toString(),
        asset: a,
      });
    }
  }

  // 10. Profile, Branding, and Cover Resolution
  const brandName =
    workspace?.brandName ||
    (handle.toLowerCase() === "pedro" ? "Pedro Concreato" : handle.charAt(0).toUpperCase() + handle.slice(1));

  const coverSelected =
    resolveMediaUrl(portfolio?.coverAssetUrl) ||
    featuredItems[0]?.thumbnailUrl ||
    (finalProjects.length > 0 ? finalProjects[0].coverImage : "") ||
    (finalAssets.length > 0 ? finalAssets[0].image : "") ||
    "/images/hero.jpg";

  const profile: FilmmakerProfile = {
    name: brandName,
    handle: workspace?.slug || handle,
    title: portfolio?.title || `${brandName} Portfolio`,
    avatar: resolveMediaUrl(workspace?.logoUrl) || "/images/about-img.png",
    bio:
      portfolio?.bio ||
      `${brandName} is a filmmaker and creative director based between Dubai and Sharjah. Over six years he's shot brand films, weddings, and launch content across the Gulf — story first, craft you don't notice. He shoots, directs, and grades his own work, and cares as much about how a film is delivered as how it's made.`,
    tagline: "Commercial Films & Luxury Visuals across the Gulf",
    heroImage: coverSelected,
    featuredProjectId: featuredItems[0]?.id || finalProjects[0]?.id || finalAssets[0]?.id || undefined,
    stats: {
      filmsDelivered: portfolio?.stats?.projects || `${finalAssets.filter((a) => a.kind === "film").length || "80+"}`,
      experienceYears: portfolio?.stats?.years || "6 YRS",
      based: portfolio?.stats?.location || "UAE",
    },
    experience: realExperiences,
    whatsappNumber: portfolio?.whatsappNumber || "+971501234567",
    email: `${workspace?.slug || handle}@cinespace.film`,
    cta: {
      title: "EVERY FRAME,\nCONSIDERED.",
      subtitle: "Brand films, weddings, and launch content — made across the Gulf.",
      image: "/images/cta.jpg",
    },
  };

  // Filter projects to only featured projects if specified by the user
  const featuredProjects = featuredItemIds
    .map((id) => finalProjects.find((p) => String(p.id) === String(id)))
    .filter((p): p is PortfolioProject => Boolean(p));

  const projectsToDisplay = featuredProjects.length > 0 ? featuredProjects : finalProjects;

  // Filter assets to those belonging to the displayed featured projects,
  // PLUS any assets explicitly pinned in featuredItemIds.
  const featuredProjectAssetIds = new Set(
    projectsToDisplay.flatMap((p) => p.assetIds.map(String))
  );

  console.log("featured",featuredProjectAssetIds)
  const explicitlyFeaturedAssetIds = new Set(featuredItemIds.map(String));

  const assetsToDisplay =
    featuredProjects.length > 0
      ? finalAssets.filter(
          (a) =>
            featuredProjectAssetIds.has(String(a.id)) ||
            explicitlyFeaturedAssetIds.has(String(a.id))
        )
      : finalAssets;

  const primaryFeatured = featuredItems.length > 0 ? featuredItems[0] : null;
  const featuredProject =
    (primaryFeatured?.type === "project" && primaryFeatured.project) ||
    projectsToDisplay.find((p) => p.id === profile.featuredProjectId) ||
    projectsToDisplay[0] ||
    null;
  const featuredAsset =
    (primaryFeatured?.type !== "project" && primaryFeatured?.asset) ||
    assetsToDisplay.find((a) => a.id === featuredProject?.cover) ||
    assetsToDisplay[0] ||
    null;

  return (
    <PortfolioProvider
      profile={profile}
      projects={projectsToDisplay}
      assets={assetsToDisplay}
      primaryFeatured={primaryFeatured}
    >
      <div className="min-h-screen bg-[#0a0a0b] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-black relative">
        <AmbientBackground variant="full" />
        <div className="relative z-10">
          {/* 🎬 1. TOP NAVIGATION HEADER (Server Component) */}
          <PortfolioHeader profile={profile} />

          {/* MAIN BODY */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-16 sm:space-y-24">
            {/* 🌟 2. HERO / FEATURED HIGHLIGHT (Server Component) */}
            <PortfolioHero
              profile={profile}
              primaryFeatured={primaryFeatured}
              featuredProject={featuredProject}
              featuredAsset={featuredAsset}
            />

            {/* 📁 3. LATEST WORK & FILTER SEGMENTS (Client Component) */}
            <LatestWork projects={projectsToDisplay} assets={assetsToDisplay} />

            {/* 👤 4. ABOUT SECTION (Server Component) */}
            <PortfolioAbout profile={profile} />

            {/* 🎬 5. END CTA BANNER (Server Component) */}
            <PortfolioCta profile={profile} />
          </main>

          {/* 📜 6. FOOTER (Server Component) */}
          <PortfolioFooter profile={profile} />

          {/* 🪟 7. INTERACTIVE MODALS (Client Component) */}
          <PortfolioModals />
        </div>
      </div>
    </PortfolioProvider>
  );
}

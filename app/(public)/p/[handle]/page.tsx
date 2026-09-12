import type { Metadata } from "next";
import { getServerServices } from "@/core/server";
import { resolveMediaUrl } from "@/lib/media";
import {
  PortfolioAsset,
  PortfolioProject,
  FilmmakerProfile,
  PortfolioExperienceItem,
  DEFAULT_PROFILE_TEMPLATE,
} from "@/lib/portfolio-data";
import { PublicPortfolioClient } from "./public-portfolio-client";

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
      const rawThumb = resolveMediaUrl(
        activeVersion?.thumbnailUrl ||
        activeVersion?.rawFileUrl ||
        ""
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
    const rawThumb = resolveMediaUrl(
      activeVersion?.thumbnailUrl ||
      activeVersion?.rawFileUrl ||
      ""
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

  // 6. Cover Selected (From Settings/Branding or Portfolio Editor)
  const coverSelected =
    resolveMediaUrl(portfolio?.coverAssetUrl) ||
    (realProjects.length > 0 ? realProjects[0].coverImage : "") ||
    "/images/portfolio/projects/Martin-katler/cover.webp";

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
    description: exp.description || "",
  }));

  // 8. Baseline Real Projects if DB is not yet populated
  let finalProjects = realProjects;
  let finalAssets = realAssets;

  if (finalProjects.length === 0) {
    // Authentic baseline directly linked to public portfolio assets
    finalProjects = [
      {
        id: "proj_boxing",
        title: "Boxing Event",
        client: "Boxing Event",
        desc: "A cinematic boxing project featuring films and stills captured across the event with ringside intensity and high-speed motion.",
        date: "2026",
        location: "Dubai, UAE",
        cover: "asset_boxing_3",
        coverImage: "/images/portfolio/projects/Boxing/3.webp",
        tc: "10 assets",
        assetIds: [
          "asset_boxing_3",
          "asset_boxing_6",
          "asset_boxing_9",
          "asset_boxing_4",
          "asset_boxing_1",
          "asset_boxing_7",
          "asset_boxing_10",
          "asset_boxing_5",
          "asset_boxing_2",
          "asset_boxing_8",
        ],
      },
      {
        id: "proj_fashion",
        title: "Fashion Event",
        client: "Fashion Event",
        desc: "A high-fashion project combining movement, dramatic editorial lighting, and medium-format still photography.",
        date: "2026",
        location: "Sharjah, UAE",
        cover: "asset_fashion_8",
        coverImage: "/images/portfolio/projects/fashion/8.webp",
        tc: "8 assets",
        assetIds: [
          "asset_fashion_8",
          "asset_fashion_1",
          "asset_fashion_4",
          "asset_fashion_6",
          "asset_fashion_3",
          "asset_fashion_7",
          "asset_fashion_5",
          "asset_fashion_2",
        ],
      },
      {
        id: "proj_gclass",
        title: "G Class",
        client: "G Class",
        desc: "A cinematic automotive campaign capturing the Mercedes G-Class through morning desert fog and architectural backdrop.",
        date: "2026",
        location: "Dubai Desert, UAE",
        cover: "asset_gclass_3",
        coverImage: "/images/portfolio/projects/G-class/3.webp",
        tc: "7 assets",
        assetIds: [
          "asset_gclass_3",
          "asset_gclass_1",
          "asset_gclass_5",
          "asset_gclass_2",
          "asset_gclass_4",
          "asset_gclass_6",
          "asset_gclass_cov",
        ],
      },
      {
        id: "proj_maserati",
        title: "Maserati",
        client: "Maserati",
        desc: "An automotive campaign capturing the Maserati GranTurismo through dynamic high-speed track films and precision photography.",
        date: "2026",
        location: "Yas Marina, Abu Dhabi",
        cover: "asset_maserati_3",
        coverImage: "/images/portfolio/projects/Maserati/3.webp",
        tc: "4 assets",
        assetIds: [
          "asset_maserati_3",
          "asset_maserati_1",
          "asset_maserati_4",
          "asset_maserati_2",
        ],
      },
      {
        id: "proj_restaurant",
        title: "Restaurant",
        client: "Restaurant",
        desc: "A culinary visual story capturing gourmet cuisine, cocktail mixology, and sophisticated evening atmosphere.",
        date: "2026",
        location: "DIFC Dubai, UAE",
        cover: "asset_restaurant_4",
        coverImage: "/images/portfolio/projects/Restaurant/4.webp",
        tc: "11 assets",
        assetIds: [
          "asset_restaurant_4",
          "asset_restaurant_12",
          "asset_restaurant_2",
          "asset_restaurant_7",
          "asset_restaurant_10",
          "asset_restaurant_3",
          "asset_restaurant_11",
          "asset_restaurant_6",
          "asset_restaurant_9",
          "asset_restaurant_8",
          "asset_restaurant_1",
        ],
      },
      {
        id: "proj_tennis",
        title: "Tennis",
        client: "Tennis",
        desc: "Sports commercial film and vivid still imagery celebrating luxury outdoor tennis and athlete motion under Gulf sunlight.",
        date: "2026",
        location: "Dubai, UAE",
        cover: "asset_tennis_2",
        coverImage: "/images/portfolio/projects/Tenis/2.webp",
        tc: "6 assets",
        assetIds: [
          "asset_tennis_2",
          "asset_tennis_4",
          "asset_tennis_3",
          "asset_tennis_5",
          "asset_tennis_1",
          "asset_tennis_cov",
        ],
      },
      {
        id: "proj_urus",
        title: "Urus",
        client: "Urus",
        desc: "Lamborghini Urus commercial reel and razor-sharp stills capturing yellow supercar presence across open UAE highways.",
        date: "2026",
        location: "Dubai & Hatta, UAE",
        cover: "asset_urus_5",
        coverImage: "/images/portfolio/projects/Urus/5.webp",
        tc: "7 assets",
        assetIds: [
          "asset_urus_5",
          "asset_urus_1",
          "asset_urus_3",
          "asset_urus_6",
          "asset_urus_4",
          "asset_urus_2",
          "asset_urus_cov",
        ],
      },
      {
        id: "proj_mercedes",
        title: "Mercedes GTS",
        client: "Mercedes GTS",
        desc: "A cinematic project featuring Mercedes GTS through film and photography, capturing industrial textures, reflections, and raw V8 presence.",
        date: "2026",
        location: "Dubai Autodrome, UAE",
        cover: "asset_gts_1",
        coverImage: "/images/portfolio/projects/Martin-katler/1.webp",
        tc: "7 assets",
        assetIds: [
          "asset_gts_1",
          "asset_gts_2",
          "asset_gts_3",
          "asset_gts_4",
          "asset_gts_5",
          "asset_gts_6",
          "asset_gts_7",
        ],
      },
    ];

    finalAssets = [
      // Real Films
      {
        id: "asset_boxing_3",
        kind: "film",
        cat: "Boxing Event",
        title: "Boxing Event",
        desc: "A cinematic boxing film, shot across the day.",
        ar: 1.25,
        tc: "01:15",
        image: "/images/portfolio/projects/Boxing/3.webp",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        resolution: "4K 60fps",
      },
      {
        id: "asset_fashion_8",
        kind: "film",
        cat: "Fashion Event",
        title: "Fashion Event",
        desc: "A cinematic fashion film, shot across the day.",
        ar: 0.72,
        tc: "00:48",
        image: "/images/portfolio/projects/fashion/8.webp",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        resolution: "4K 24fps",
      },
      {
        id: "asset_gclass_3",
        kind: "film",
        cat: "G Class",
        title: "G Class",
        desc: "A cinematic G Class film, shot across the day.",
        ar: 1.65,
        tc: "01:30",
        image: "/images/portfolio/projects/G-class/3.webp",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        resolution: "4K 60fps",
      },
      {
        id: "asset_maserati_3",
        kind: "film",
        cat: "Maserati",
        title: "Maserati",
        desc: "A cinematic Maserati film, shot across the day.",
        ar: 0.62,
        tc: "00:54",
        image: "/images/portfolio/projects/Maserati/3.webp",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
        resolution: "4K 60fps",
      },
      {
        id: "asset_restaurant_4",
        kind: "film",
        cat: "Restaurant",
        title: "Restaurant",
        desc: "A cinematic restaurant film, shot across the day.",
        ar: 1.4,
        tc: "01:05",
        image: "/images/portfolio/projects/Restaurant/4.webp",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        resolution: "4K 24fps",
      },
      {
        id: "asset_tennis_2",
        kind: "film",
        cat: "Tennis",
        title: "Tennis",
        desc: "A cinematic tennis film, shot across the day.",
        ar: 0.58,
        tc: "00:42",
        image: "/images/portfolio/projects/Tenis/2.webp",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        resolution: "4K 60fps",
      },
      {
        id: "asset_urus_5",
        kind: "film",
        cat: "Urus",
        title: "Urus",
        desc: "A cinematic Urus film, shot across the day.",
        ar: 1.75,
        tc: "01:20",
        image: "/images/portfolio/projects/Urus/5.webp",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        resolution: "4K 60fps",
      },
      {
        id: "asset_gts_1",
        kind: "film",
        cat: "Mercedes GTS",
        title: "Mercedes GTS",
        desc: "A cinematic project featuring Mercedes GTS through film and photography.",
        ar: 1.77,
        tc: "01:24",
        image: "/images/portfolio/projects/Martin-katler/1.webp",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        resolution: "4K 60fps",
      },

      // Real Stills
      {
        id: "asset_fashion_1",
        kind: "still",
        cat: "Fashion Event",
        title: "Red Dress Model",
        desc: "A cinematic still from the Fashion Event.",
        ar: 0.667,
        tc: "—",
        image: "/images/portfolio/projects/fashion/1.webp",
      },
      {
        id: "asset_tennis_4",
        kind: "still",
        cat: "Tennis",
        title: "Tennis Court Center",
        desc: "A cinematic still from the Tennis project.",
        ar: 0.75,
        tc: "—",
        image: "/images/portfolio/projects/Tenis/4.webp",
      },
      {
        id: "asset_urus_1",
        kind: "still",
        cat: "Urus",
        title: "Yellow Urus Front",
        desc: "A cinematic still from the Urus project.",
        ar: 0.65,
        tc: "—",
        image: "/images/portfolio/projects/Urus/1.webp",
      },
      {
        id: "asset_fashion_4",
        kind: "still",
        cat: "Fashion Event",
        title: "Editorial Profile",
        desc: "A cinematic still from the Fashion Event.",
        ar: 0.75,
        tc: "—",
        image: "/images/portfolio/projects/fashion/4.webp",
      },
      {
        id: "asset_gclass_1",
        kind: "still",
        cat: "G Class",
        title: "G Class Headlights Fog",
        desc: "A cinematic still from the G Class project.",
        ar: 0.68,
        tc: "—",
        image: "/images/portfolio/projects/G-class/1.webp",
      },
      {
        id: "asset_boxing_6",
        kind: "still",
        cat: "Boxing Event",
        title: "Ringside Action",
        desc: "A cinematic still from the Boxing Event.",
        ar: 0.82,
        tc: "—",
        image: "/images/portfolio/projects/Boxing/6.webp",
      },
      {
        id: "asset_restaurant_2",
        kind: "still",
        cat: "Restaurant",
        title: "Dining Ambience",
        desc: "A cinematic still from the Restaurant project.",
        ar: 1.45,
        tc: "—",
        image: "/images/portfolio/projects/Restaurant/2.webp",
      },
      {
        id: "asset_gts_2",
        kind: "still",
        cat: "Mercedes GTS",
        title: "Mercedes GTS Rear Aero",
        desc: "A cinematic still from the Mercedes GTS project.",
        ar: 0.72,
        tc: "—",
        image: "/images/portfolio/projects/Martin-katler/2.webp",
      },
      {
        id: "asset_urus_3",
        kind: "still",
        cat: "Urus",
        title: "Urus Aggressive Angle",
        desc: "A cinematic still from the Urus project.",
        ar: 1.55,
        tc: "—",
        image: "/images/portfolio/projects/Urus/3.webp",
      },
      {
        id: "asset_boxing_9",
        kind: "still",
        cat: "Boxing Event",
        title: "Boxing Ring Glow",
        desc: "A cinematic still from the Boxing Event.",
        ar: 1.2,
        tc: "—",
        image: "/images/portfolio/projects/Boxing/9.webp",
      },
      {
        id: "asset_restaurant_7",
        kind: "still",
        cat: "Restaurant",
        title: "Signature Cocktail",
        desc: "A cinematic still from the Restaurant project.",
        ar: 0.72,
        tc: "—",
        image: "/images/portfolio/projects/Restaurant/7.webp",
      },
      {
        id: "asset_gclass_5",
        kind: "still",
        cat: "G Class",
        title: "G Class Profile",
        desc: "A cinematic still from the G Class project.",
        ar: 1.7,
        tc: "—",
        image: "/images/portfolio/projects/G-class/5.webp",
      },
      {
        id: "asset_maserati_1",
        kind: "still",
        cat: "Maserati",
        title: "Maserati Red Line",
        desc: "A cinematic still from the Maserati project.",
        ar: 1.55,
        tc: "—",
        image: "/images/portfolio/projects/Maserati/1.webp",
      },
      {
        id: "asset_tennis_3",
        kind: "still",
        cat: "Tennis",
        title: "Baseline Court Perspective",
        desc: "A cinematic still from the Tennis project.",
        ar: 1.6,
        tc: "—",
        image: "/images/portfolio/projects/Tenis/3.webp",
      },
      {
        id: "asset_gts_3",
        kind: "still",
        cat: "Mercedes GTS",
        title: "Mercedes GTS Front Low Angle",
        desc: "A cinematic still from the Mercedes GTS project.",
        ar: 1.5,
        tc: "—",
        image: "/images/portfolio/projects/Martin-katler/3.webp",
      },
    ];
  }

  // 9. Profile and Stats
  const brandName =
    workspace?.brandName ||
    (handle.toLowerCase() === "pedro" ? "Pedro Concreato" : handle.charAt(0).toUpperCase() + handle.slice(1));

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
    featuredProjectId: finalProjects.find((p) => p.title.toLowerCase().includes("mercedes"))?.id || finalProjects[0]?.id || 1,
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

  return (
    <PublicPortfolioClient
      profile={profile}
      projects={finalProjects}
      assets={finalAssets}
    />
  );
}

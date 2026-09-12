import { Portfolio, SocialLinks, PortfolioStats } from "@/core/entities/portfolio";
import { Project } from "@/core/entities/project";
import { Asset, AssetVersion } from "@/core/entities/asset";
import { IPortfolioRepository, CreatePortfolioDTO } from "@/core/repositories/portfolio.repository";
import { IProjectRepository } from "@/core/repositories/i-project-repository";
import { IAssetRepository, IAssetVersionRepository } from "@/core/repositories/i-asset-repository";

export interface PublicPortfolioItem {
  id: string;
  title: string;
  category: string;
  type: "film" | "still" | "project";
  thumbnailUrl: string;
  assetCount: number;
  isFeatured?: boolean;
}

export interface PublicPortfolioView extends Portfolio {
  projects: Project[];
  films: Asset[];
  stills: Asset[];
  allItems: PublicPortfolioItem[];
}

export class PortfolioService {
  constructor(
    private readonly portfolioRepo: IPortfolioRepository,
    private readonly projectRepo: IProjectRepository,
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository
  ) {}

  async getPortfolioByWorkspace(workspaceId: string): Promise<Portfolio | null> {
    return this.portfolioRepo.findByWorkspaceId(workspaceId);
  }

  async getOrCreatePortfolio(workspaceId: string, title: string, slug: string): Promise<Portfolio> {
    try {
      const existing = await this.portfolioRepo.findByWorkspaceId(workspaceId);
      if (existing) return existing;

      return await this.portfolioRepo.create({
        workspaceId,
        slug,
        title,
        isPublished: true,
        socialLinks: {},
      });
    } catch (err: any) {
      console.warn("Portfolio getOrCreate notice:", err.message);
      return {
        id: `port_${workspaceId}`,
        workspaceId,
        slug,
        title,
        bio: "Filmmaker & creative director based in the Gulf.",
        coverAssetUrl: null,
        socialLinks: {},
        isPublished: true,
        whatsappNumber: null,
        stats: { projects: "80+", years: "6", location: "UAE" },
        layoutTemplate: "grid",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async getPublicPortfolio(slug: string): Promise<PublicPortfolioView | null> {
    const portfolio = await this.portfolioRepo.findBySlug(slug);
    if (!portfolio || !portfolio.isPublished) return null;

    // 1. Fetch published showcase projects
    const showcaseProjects = await this.projectRepo.listByPortfolioId(portfolio.id);
    const publishedProjects = showcaseProjects.filter((p) => p.isPublished);

    // 2. Fetch standalone films and stills for this workspace
    const workspaceAssets = await this.assetRepo.listByWorkspaceId(portfolio.workspaceId);
    const standaloneAssets = workspaceAssets.filter((a) => !a.isArchived && a.deliveryId === null);

    const films = standaloneAssets.filter((a) => a.category === "film");
    const stills = standaloneAssets.filter((a) => a.category === "still" || a.type === "photo_gallery");

    // 3. Construct unified items array matching prototype
    const mappedProjects: PublicPortfolioItem[] = publishedProjects.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category || "Commercial Project",
      type: "project",
      thumbnailUrl: p.coverAssetUrl || "",
      assetCount: 1,
      isFeatured: true,
    }));

    const mappedFilms: PublicPortfolioItem[] = await Promise.all(
      films.map(async (f) => {
        const activeVer = await this.assetVersionRepo.findActiveVersion(f.id);
        return {
          id: f.id,
          title: f.title,
          category: f.aspectRatio === "9:16" ? "Vertical Reel" : "Film",
          type: "film",
          thumbnailUrl: activeVer?.thumbnailUrl || activeVer?.rawFileUrl || "",
          assetCount: 1,
          isFeatured: true,
        };
      })
    );

    const mappedStills: PublicPortfolioItem[] = await Promise.all(
      stills.map(async (s) => {
        const activeVer = await this.assetVersionRepo.findActiveVersion(s.id);
        return {
          id: s.id,
          title: s.title,
          category: "Photo Still",
          type: "still",
          thumbnailUrl: activeVer?.thumbnailUrl || activeVer?.rawFileUrl || "",
          assetCount: 1,
          isFeatured: true,
        };
      })
    );

    return {
      ...portfolio,
      projects: publishedProjects,
      films,
      stills,
      allItems: [...mappedProjects, ...mappedFilms, ...mappedStills],
    };
  }

  async updatePortfolio(
    id: string,
    data: {
      title?: string;
      slug?: string;
      bio?: string | null;
      coverAssetUrl?: string | null;
      socialLinks?: SocialLinks;
      isPublished?: boolean;
      appearance?: any;
      experience?: any[];
      whatsappNumber?: string | null;
      stats?: PortfolioStats;
      layoutTemplate?: string;
    }
  ): Promise<Portfolio> {
    return this.portfolioRepo.update(id, data);
  }
}

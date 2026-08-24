import { Portfolio, SocialLinks } from '@/core/entities/portfolio';
import { Project } from '@/core/entities/project';
import { AssetVersion } from '@/core/entities/asset';
import { IPortfolioRepository } from '@/core/repositories/portfolio.repository';
import { IProjectRepository } from '@/core/repositories/project.repository';
import { IAssetRepository, IAssetVersionRepository } from '@/core/repositories/asset.repository';

export interface PublicPortfolioView extends Portfolio {
  projects: Array<
    Project & {
      activeVersion?: AssetVersion | null;
    }
  >;
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
    const existing = await this.portfolioRepo.findByWorkspaceId(workspaceId);
    if (existing) return existing;

    return this.portfolioRepo.create({
      workspaceId,
      slug,
      title,
      isPublished: true,
      socialLinks: {},
    });
  }

  async getPublicPortfolio(slug: string): Promise<PublicPortfolioView | null> {
    const portfolio = await this.portfolioRepo.findBySlug(slug);
    if (!portfolio || !portfolio.isPublished) return null;

    const featuredProjectRelations = await this.portfolioRepo.getFeaturedProjects(portfolio.id);
    const enrichedProjects = await Promise.all(
      featuredProjectRelations.map(async ({ projectId }) => {
        const project = await this.projectRepo.findById(projectId);
        if (!project || project.status === 'draft' || project.status === 'archived') {
          return null;
        }

        const assets = await this.assetRepo.listByProjectId(project.id);
        let activeVersion: AssetVersion | null = null;
        if (assets.length > 0) {
          activeVersion = await this.assetVersionRepo.findActiveVersion(assets[0].id);
        }

        return {
          ...project,
          activeVersion,
        };
      })
    );

    return {
      ...portfolio,
      projects: enrichedProjects.filter(Boolean) as any[],
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
    }
  ): Promise<Portfolio> {
    return this.portfolioRepo.update(id, data);
  }

  async featureProject(portfolioId: string, projectId: string, order = 0): Promise<void> {
    return this.portfolioRepo.addFeaturedProject(portfolioId, projectId, order);
  }

  async unfeatureProject(portfolioId: string, projectId: string): Promise<void> {
    return this.portfolioRepo.removeFeaturedProject(portfolioId, projectId);
  }

  async reorderProjects(portfolioId: string, projectIdsInOrder: string[]): Promise<void> {
    return this.portfolioRepo.reorderFeaturedProjects(portfolioId, projectIdsInOrder);
  }
}

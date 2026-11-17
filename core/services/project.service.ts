import { Project, CreateProjectDTO, UpdateProjectDTO } from "@/core/entities/project";
import { Asset, AssetVersion } from "@/core/entities/asset";
import { IProjectRepository } from "@/core/repositories/i-project-repository";
import { IAssetRepository, IAssetVersionRepository } from "@/core/repositories/i-asset-repository";
import { SubscriptionService } from "./subscription.service";

export interface ShowcaseProjectWithAssets extends Project {
  assets: Array<
    Asset & {
      activeVersion?: AssetVersion | null;
    }
  >;
}

export class ProjectService {
  constructor(
    private readonly projectRepo: IProjectRepository,
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository,
    private readonly subscriptionService?: SubscriptionService
  ) {}

  async createProject(dto: CreateProjectDTO): Promise<Project> {
    if (this.subscriptionService && dto.portfolioId) {
      const existingProjects = await this.projectRepo.listByPortfolioId(dto.portfolioId);
      const eligibility = await this.subscriptionService.canAddPortfolioVideo(
        dto.workspaceId,
        existingProjects.length
      );
      if (!eligibility.allowed) {
        throw new Error(
          eligibility.reason ||
            "Portfolio showcase film limit reached. Please upgrade your subscription plan."
        );
      }
    }
    return this.projectRepo.create(dto);
  }

  async getProjectById(id: string): Promise<Project | null> {
    return this.projectRepo.findById(id);
  }

  async listPortfolioProjects(portfolioId: string): Promise<Project[]> {
    return this.projectRepo.listByPortfolioId(portfolioId);
  }

  async listWorkspaceProjects(workspaceId: string): Promise<Project[]> {
    return this.projectRepo.listByWorkspaceId(workspaceId);
  }

  async getProjectWithAssets(id: string): Promise<ShowcaseProjectWithAssets | null> {
    const project = await this.projectRepo.findById(id);
    if (!project) return null;
    const [withAssets] = await this.withProjectAssets([project]);
    return withAssets;
  }

  /**
   * These projects with the files linked to them (project_assets, in display order) and each
   * file's active version. Two round trips however many projects: the links, then the files and
   * their active versions together.
   */
  async withProjectAssets(projects: Project[]): Promise<ShowcaseProjectWithAssets[]> {
    if (projects.length === 0) return [];

    const idsByProject = await this.projectRepo.getProjectAssetIdsByProjectIds(projects.map((p) => p.id));
    const assetIds = [...new Set([...idsByProject.values()].flat())];
    const [rawAssets, activeVersions] = await Promise.all([
      this.assetRepo.listByIds(assetIds),
      this.assetVersionRepo.findActiveVersionsByAssetIds(assetIds),
    ]);
    const assetsById = new Map(rawAssets.map((asset) => [asset.id, asset]));

    return projects.map((project) => ({
      ...project,
      assets: (idsByProject.get(project.id) ?? []).flatMap((assetId) => {
        const asset = assetsById.get(assetId);
        return asset ? [{ ...asset, activeVersion: activeVersions.get(assetId) ?? null }] : [];
      }),
    }));
  }

  async updateProject(id: string, data: UpdateProjectDTO): Promise<Project> {
    return this.projectRepo.update(id, data);
  }

  async deleteProject(id: string): Promise<void> {
    return this.projectRepo.delete(id);
  }

  async attachAssetToProject(projectId: string, assetId: string, order?: number): Promise<void> {
    return this.projectRepo.attachAsset(projectId, assetId, order);
  }

  async detachAssetFromProject(projectId: string, assetId: string): Promise<void> {
    return this.projectRepo.detachAsset(projectId, assetId);
  }

  async reorderProjects(portfolioId: string, projectIdsInOrder: string[]): Promise<void> {
    return this.projectRepo.reorderProjects(portfolioId, projectIdsInOrder);
  }
}

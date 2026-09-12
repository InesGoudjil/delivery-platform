import { Project, CreateProjectDTO, UpdateProjectDTO } from "@/core/entities/project";
import { Asset, AssetVersion } from "@/core/entities/asset";
import { IProjectRepository } from "@/core/repositories/i-project-repository";
import { IAssetRepository, IAssetVersionRepository } from "@/core/repositories/i-asset-repository";

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
    private readonly assetVersionRepo: IAssetVersionRepository
  ) {}

  async createProject(dto: CreateProjectDTO): Promise<Project> {
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

    const assetIds = await this.projectRepo.getProjectAssetIds(project.id);
    const rawAssets = await this.assetRepo.listByIds(assetIds);

    const enrichedAssets = await Promise.all(
      rawAssets.map(async (asset) => {
        const activeVersion = await this.assetVersionRepo.findActiveVersion(asset.id);
        return {
          ...asset,
          activeVersion,
        };
      })
    );

    return {
      ...project,
      assets: enrichedAssets,
    };
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

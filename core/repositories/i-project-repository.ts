import { Project, CreateProjectDTO, UpdateProjectDTO } from "../entities/project";

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  listByPortfolioId(portfolioId: string): Promise<Project[]>;
  listByWorkspaceId(workspaceId: string): Promise<Project[]>;
  create(dto: CreateProjectDTO): Promise<Project>;
  update(id: string, data: UpdateProjectDTO): Promise<Project>;
  delete(id: string): Promise<void>;

  // project_assets junction
  attachAsset(projectId: string, assetId: string, displayOrder?: number): Promise<void>;
  detachAsset(projectId: string, assetId: string): Promise<void>;
  getProjectAssetIds(projectId: string): Promise<string[]>;
  /** Each project's file ids in display order, for many projects in one round trip. */
  getProjectAssetIdsByProjectIds(projectIds: string[]): Promise<Map<string, string[]>>;
  reorderProjects(portfolioId: string, projectIdsInOrder: string[]): Promise<void>;
}

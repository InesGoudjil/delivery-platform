import { Project, ProjectStatus } from '../entities/project';

export interface CreateProjectDTO {
  workspaceId: string;
  clientId?: string;
  title: string;
  description?: string;
  isDownloadAllowed?: boolean;
}

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByShareToken(shareToken: string): Promise<Project | null>;
  listByWorkspaceId(workspaceId: string): Promise<Project[]>;
  create(data: CreateProjectDTO): Promise<Project>;
  updateStatus(id: string, status: ProjectStatus, approvedByName?: string): Promise<Project>;
}

import { Project, ProjectStatus } from '@/core/entities/project';
import { Client } from '@/core/entities/client';
import { Asset, AssetVersion } from '@/core/entities/asset';
import { Feedback } from '@/core/entities/feedback';
import { IProjectRepository, CreateProjectDTO } from '@/core/repositories/project.repository';
import { IClientRepository } from '@/core/repositories/client.repository';
import { IAssetRepository, IAssetVersionRepository } from '@/core/repositories/asset.repository';
import { IFeedbackRepository } from '@/core/repositories/feedback.repository';

export interface ProjectWithDetails extends Project {
  client?: Client | null;
  assets: Array<
    Asset & {
      versions: AssetVersion[];
      activeVersion?: AssetVersion | null;
      feedback: Feedback[];
    }
  >;
}

export class ProjectService {
  constructor(
    private readonly projectRepo: IProjectRepository,
    private readonly clientRepo: IClientRepository,
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository,
    private readonly feedbackRepo: IFeedbackRepository
  ) {}

  async createProject(dto: CreateProjectDTO): Promise<Project> {
    return this.projectRepo.create(dto);
  }

  async getProjectById(id: string): Promise<Project | null> {
    return this.projectRepo.findById(id);
  }

  async getProjectByShareToken(shareToken: string): Promise<Project | null> {
    return this.projectRepo.findByShareToken(shareToken);
  }

  async listWorkspaceProjects(workspaceId: string): Promise<Project[]> {
    return this.projectRepo.listByWorkspaceId(workspaceId);
  }

  async getProjectWithFullDetails(identifier: string): Promise<ProjectWithDetails | null> {
    // Try finding by shareToken first, then by ID
    let project = await this.projectRepo.findByShareToken(identifier);
    if (!project) {
      project = await this.projectRepo.findById(identifier);
    }
    if (!project) return null;

    let client: Client | null = null;
    if (project.clientId) {
      client = await this.clientRepo.findById(project.clientId);
    }

    const assets = await this.assetRepo.listByProjectId(project.id);

    const enrichedAssets = await Promise.all(
      assets.map(async (asset) => {
        const versions = await this.assetVersionRepo.listByAssetId(asset.id);
        const activeVersion = versions.find((v) => v.isActiveVersion) || versions[0] || null;

        let feedback: Feedback[] = [];
        if (activeVersion) {
          feedback = await this.feedbackRepo.listByAssetVersionId(activeVersion.id);
        }

        return {
          ...asset,
          versions,
          activeVersion,
          feedback,
        };
      })
    );

    return {
      ...project,
      client,
      assets: enrichedAssets,
    };
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    return this.projectRepo.update(id, data);
  }

  async updateStatus(id: string, status: ProjectStatus, approvedByName?: string): Promise<Project> {
    return this.projectRepo.updateStatus(id, status, approvedByName);
  }

  async approveCut(id: string, approvedByName?: string): Promise<Project> {
    return this.projectRepo.updateStatus(id, 'approved', approvedByName || 'Client Guest');
  }

  async deleteProject(id: string): Promise<void> {
    return this.projectRepo.delete(id);
  }
}

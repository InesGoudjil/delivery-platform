import { IProjectRepository } from '../../repositories/i-project-repository';

export class ApproveProjectUseCase {
  constructor(private readonly projectRepo: IProjectRepository) {}

  async execute(projectId: string, approvedByName?: string) {
    if (!projectId) {
      throw new Error('Project ID is required for approval.');
    }

    return await this.projectRepo.updateStatus(
      projectId,
      'approved',
      approvedByName?.trim() || 'Client Guest'
    );
  }
}

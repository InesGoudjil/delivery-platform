import { IProjectRepository, CreateProjectDTO } from '../../repositories/i-project-repository';

export class CreateProjectUseCase {
  constructor(private readonly projectRepo: IProjectRepository) {}

  async execute(dto: CreateProjectDTO) {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new Error('Project title is required.');
    }

    if (!dto.workspaceId) {
      throw new Error('Workspace ID is required to create a project.');
    }

    return await this.projectRepo.create({
      ...dto,
      title: dto.title.trim(),
    });
  }
}

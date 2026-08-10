import { IWorkspaceRepository } from '../../repositories/i-workspace-repository';

const RESERVED_SLUGS = [
  'admin', 'login', 'signup', 'api', 'p', 'deliver',
  'auth', 'webhooks', '_next', 'favicon.ico',
];

function generateSlug(brandName: string): string {
  return brandName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'studio';
}

export class GetOrCreateWorkspaceUseCase {
  constructor(private readonly workspaceRepo: IWorkspaceRepository) {}

  async execute(ownerId: string, defaultBrandName = 'My Studio') {
    if (!ownerId) {
      throw new Error('Owner ID is required.');
    }

    const existing = await this.workspaceRepo.findByOwnerId(ownerId);
    if (existing) {
      return existing;
    }

    let slug = generateSlug(defaultBrandName);
    if (RESERVED_SLUGS.includes(slug)) {
      slug = `${slug}-studio`;
    }

    return await this.workspaceRepo.create({
      ownerId,
      brandName: defaultBrandName,
      slug,
    });
  }
}

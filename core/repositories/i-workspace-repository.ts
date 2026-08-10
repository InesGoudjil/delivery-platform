import { Workspace } from '../entities/workspace';

export interface CreateWorkspaceDTO {
  ownerId: string;
  brandName: string;
  slug: string;
  logoUrl?: string;
  customDomain?: string;
  accentColor?: string;
  defaultLanguage?: 'ar' | 'en';
}

export interface IWorkspaceRepository {
  findByOwnerId(ownerId: string): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  findById(id: string): Promise<Workspace | null>;
  create(data: CreateWorkspaceDTO): Promise<Workspace>;
  update(id: string, data: Partial<Workspace>): Promise<Workspace>;
}

export interface Project {
  id: string;
  workspaceId: string;
  portfolioId: string;
  title: string;
  clientName?: string | null;
  description?: string | null;
  category: string;
  coverAssetUrl?: string | null;
  year?: string | null;
  location?: string | null;
  displayOrder: number;
  isPublished: boolean;
  sourceDeliveryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDTO {
  workspaceId: string;
  portfolioId: string;
  title: string;
  clientName?: string | null;
  description?: string | null;
  category?: string;
  coverAssetUrl?: string | null;
  year?: string | null;
  location?: string | null;
  displayOrder?: number;
  isPublished?: boolean;
  sourceDeliveryId?: string | null;
}

export interface UpdateProjectDTO extends Partial<CreateProjectDTO> {}

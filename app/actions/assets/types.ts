export interface DeleteAssetOptions {
  deliveryId?: string;
  workspaceSlug?: string;
  portfolioId?: string;
  projectId?: string;
}

export interface TrashedAssetDTO {
  id: string;
  title: string;
  type: string;
  deliveryId: string | null;
  workspaceId: string;
  thumbnailUrl: string | null;
  fileSizeBytes: number;
  deletedAt: string;
  daysRemaining: number;
}

export interface UpdateAssetInput {
  title?: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  aspectRatio?: string;
}

export interface UpdateAssetOptions {
  deliveryId?: string;
  workspaceSlug?: string;
  portfolioId?: string;
  isProject?: boolean;
}

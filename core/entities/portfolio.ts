export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  twitter?: string;
  vimeo?: string;
  website?: string;
  [key: string]: string | undefined;
}

export interface Portfolio {
  id: string;
  workspaceId: string;
  slug: string;
  title: string;
  bio?: string | null;
  coverAssetUrl?: string | null;
  socialLinks: SocialLinks;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioProject {
  portfolioId: string;
  projectId: string;
  displayOrder: number;
}

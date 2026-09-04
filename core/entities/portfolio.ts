export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  twitter?: string;
  vimeo?: string;
  website?: string;
  [key: string]: string | undefined;
}

export interface PortfolioAppearance {
  cardSize: "S" | "M" | "L";
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3";
  thumbnailScale: "fit" | "fill";
  showClientInfo: boolean;
}

export interface PortfolioExperience {
  id: string;
  role: string;
  company: string;
  years: string;
  description?: string;
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
  appearance?: PortfolioAppearance;
  experience?: PortfolioExperience[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioProject {
  portfolioId: string;
  projectId?: string | null;
  assetId?: string | null;
  displayOrder: number;
}

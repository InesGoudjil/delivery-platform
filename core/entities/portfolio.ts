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
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "grid";
  thumbnailScale: "fit" | "fill";
  showClientInfo: boolean;
  featuredItemIds?: string[];
}

export interface PortfolioExperience {
  id: string;
  role: string;
  company: string;
  years: string;
  location?: string;
  category?: string;
  description?: string;
}

export interface PortfolioStats {
  projects: string;
  years: string;
  location: string;
  [key: string]: string;
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
  whatsappNumber?: string | null;
  stats?: PortfolioStats;
  layoutTemplate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssetRelation {
  projectId: string;
  assetId: string;
  displayOrder: number;
}

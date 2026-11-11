export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  twitter?: string;
  vimeo?: string;
  website?: string;
  [key: string]: string | undefined;
}

export interface PortfolioHeroCover {
  assetId?: string | null;
  type: "video" | "still";
  mediaUrl: string;
  thumbnailUrl?: string;
  title?: string;
  category?: string;
  description?: string;
  aspectRatio?: "21:9" | "16:9" | "3:1" | "full" | "asset" | "original";
  overlayOpacity?: number; // 0 to 100
  videoBehavior?: "ambient_loop" | "click_to_play";
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  showSoundToggle?: boolean;
  showHeroText?: boolean;
}

export interface PortfolioAppearance {
  cardSize: "S" | "M" | "L";
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "grid" | "masonry";
  thumbnailScale: "fit" | "fill";
  showClientInfo: boolean;
  featuredItemIds?: string[];
  heroCover?: PortfolioHeroCover;
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

export interface ProjectAsset {
  id: string;
  title: string;
  type: "film" | "still";
  url: string;
  thumbnailUrl: string;
  aspectRatio?: string;
  duration?: string | null;
  category?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  type: "film" | "still" | "project";
  assetCount: number;
  thumbnailUrl: string;
  mediaUrl?: string;
  description?: string | null;
  aspectRatio?: string;
  isFeatured?: boolean;
  projectAssets?: ProjectAsset[];
}

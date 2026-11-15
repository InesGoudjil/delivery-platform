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

/** How the work grid is laid out: tiles at one ratio, or masonry (each file at its own shape). */
export type PortfolioLayout = "16:9" | "9:16" | "1:1" | "masonry";

/**
 * Project covers have no stored ratio, so in masonry mode the Projects tab shows them as a
 * regular grid of tiles at this shape (in the editor and on the public page alike).
 */
export const PROJECT_COVER_RATIO = 16 / 11;

export interface PortfolioAppearance {
  cardSize: "S" | "M" | "L";
  aspectRatio: PortfolioLayout;
  thumbnailScale: "fit" | "fill";
  showClientInfo: boolean;
  featuredItemIds?: string[];
  heroCover?: PortfolioHeroCover;
}

/**
 * The layout a stored value means. Older saves hold "grid" (what the Masonry button used to
 * save) or "4:3"; both have always been shown as masonry.
 */
export function normalizePortfolioLayout(value: unknown): PortfolioLayout {
  if (value === "masonry" || value === "grid" || value === "4:3") return "masonry";
  if (value === "16:9" || value === "9:16" || value === "1:1") return value;
  return "16:9";
}

/** A stored appearance with defaults filled in and the layout normalized. */
export function normalizePortfolioAppearance(raw: unknown): PortfolioAppearance {
  const stored = raw && typeof raw === "object" ? (raw as Partial<PortfolioAppearance>) : {};
  return {
    cardSize: "M",
    thumbnailScale: "fill",
    showClientInfo: true,
    ...stored,
    featuredItemIds: stored.featuredItemIds ?? [],
    aspectRatio: normalizePortfolioLayout(stored.aspectRatio),
  };
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

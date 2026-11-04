export interface PortfolioAsset {
  id: string | number;
  kind: "film" | "still";
  cat: string;
  title: string;
  desc: string;
  ar: number; // Aspect ratio width/height
  tc: string; // Timecode or duration
  image: string;
  videoUrl?: string;
  resolution?: string;
}

export interface SelectableCoverAsset {
  id: string;
  title: string;
  type: "video" | "still";
  url: string;
  thumbnailUrl: string;
  aspectRatio?: string;
  duration?: string | null;
  category?: string;
  projectName?: string;
}

export interface PublicFeaturedItem {
  id: string;
  title: string;
  category: string;
  type: "project" | "film" | "still";
  thumbnailUrl: string;
  videoUrl?: string;
  aspectRatio?: string;
  project?: PortfolioProject;
  asset?: PortfolioAsset;
}

export interface PortfolioProject {
  id: string | number;
  title: string;
  client: string;
  desc: string;
  date: string;
  location: string;
  cover?: string | number;
  coverImage: string;
  tc: string;
  assetIds: (string | number)[];
}

export interface PortfolioExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  location?: string;
  category?: string;
  description: string;
}

export interface FilmmakerProfile {
  name: string;
  handle: string;
  title: string;
  avatar: string;
  logoUrl?: string | null;
  bio: string;
  tagline: string;
  heroImage: string;
  heroCover?: any;
  featuredProjectId?: string | number;
  stats: {
    filmsDelivered: string;
    experienceYears: string;
    based: string;
  };
  experience: PortfolioExperienceItem[];
  whatsappNumber: string;
  email: string;
  cta: {
    title: string;
    subtitle: string;
    image: string;
  };
}

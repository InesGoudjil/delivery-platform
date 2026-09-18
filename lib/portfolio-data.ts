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
  bio: string;
  tagline: string;
  heroImage: string;
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

export const DEFAULT_PROFILE_TEMPLATE: FilmmakerProfile = {
  name: "Filmmaker",
  handle: "portfolio",
  title: "Filmmaker & Director",
  avatar: "/images/about-img.png",
  bio: "Filmmaker and creative director based across the Gulf. Directing commercial campaigns, brand documentaries, and luxury visual storytelling — story first, craft you don't notice.",
  tagline: "Commercial Films & Luxury Visuals",
  heroImage: "/images/hero.jpg",
  stats: {
    filmsDelivered: "80+",
    experienceYears: "6 YRS",
    based: "UAE",
  },
  experience: [],
  whatsappNumber: "+971501234567",
  email: "hello@cinespace.film",
  cta: {
    title: "EVERY FRAME,\nCONSIDERED.",
    subtitle: "Brand films, weddings, and launch content — made across the Gulf.",
    image: "/images/cta.jpg",
  },
};

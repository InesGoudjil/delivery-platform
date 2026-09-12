export interface CoverPreset {
  id: string;
  title: string;
  url: string;
  gradient: string;
}

export const ACCENTS = ["#F5551D", "#E23B3B", "#7C5CFF", "#1D9E75", "#378ADD"];

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: "desert-twilight",
    title: "Desert Twilight",
    url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80",
    gradient: "linear-gradient(135deg, #3a1a10, #7a2f18)",
  },
  {
    id: "anamorphic-flare",
    title: "Anamorphic Flare",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
    gradient: "linear-gradient(135deg, #101a2e, #1a3a5c)",
  },
  {
    id: "cyberpunk-neon",
    title: "Tokyo Neon",
    url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80",
    gradient: "linear-gradient(135deg, #2a1030, #5c1860)",
  },
  {
    id: "architectural-luxury",
    title: "Architectural Luxury",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    gradient: "linear-gradient(135deg, #201a14, #4a3a28)",
  },
  {
    id: "cinema-noir",
    title: "Cinema Noir 35mm",
    url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80",
    gradient: "linear-gradient(135deg, #111113, #222228)",
  },
  {
    id: "minimalist-studio",
    title: "Minimalist Studio",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80",
    gradient: "linear-gradient(135deg, #181c20, #2c3842)",
  },
];

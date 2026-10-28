/**
 * Centralized Filmmaker Aspect Ratio Engine
 * 
 * Provides mathematical precision, preset taxonomies, intelligent auto-snapping,
 * and responsive bounding calculations for high-end video and still photography.
 */

export type AspectRatioId =
  | "2.39:1"
  | "2:1"
  | "1.85:1"
  | "16:9"
  | "16:10"
  | "3:2"
  | "4:3"
  | "1:1"
  | "4:5"
  | "9:16"
  | "custom";

export type AspectRatioCategory = "cinema" | "desktop" | "photo" | "social";
export type AspectRatioOrientation = "ultrawide" | "landscape" | "square" | "portrait";

export interface AspectRatioPreset {
  id: AspectRatioId;
  label: string;
  shortLabel: string;
  category: AspectRatioCategory;
  orientation: AspectRatioOrientation;
  numeric: number; // width / height
  cssRatio: string; // e.g. "16 / 9", "4 / 5", "2.39 / 1"
  description: string;
  referenceWidth: number;
  referenceHeight: number;
  desktopOptimal: boolean;
  mobileOptimal: boolean;
}

/**
 * Standard Filmmaker Ratio Presets
 */
export const ASPECT_RATIO_PRESETS: readonly AspectRatioPreset[] = [
  // --- CINEMA & THEATRICAL ---
  {
    id: "2.39:1",
    label: "2.39:1 Anamorphic Scope",
    shortLabel: "2.39:1",
    category: "cinema",
    orientation: "ultrawide",
    numeric: 2.3869,
    cssRatio: "2.39 / 1",
    description: "Theatrical widescreen anamorphic feature films & cinematic spots",
    referenceWidth: 3840,
    referenceHeight: 1608,
    desktopOptimal: true,
    mobileOptimal: false,
  },
  {
    id: "2:1",
    label: "2:1 Univisium",
    shortLabel: "2:1",
    category: "cinema",
    orientation: "ultrawide",
    numeric: 2.0,
    cssRatio: "2 / 1",
    description: "Prestige streaming drama (Netflix standard), Storaro format",
    referenceWidth: 3840,
    referenceHeight: 1920,
    desktopOptimal: true,
    mobileOptimal: false,
  },
  {
    id: "1.85:1",
    label: "1.85:1 DCI Flat",
    shortLabel: "1.85:1",
    category: "cinema",
    orientation: "landscape",
    numeric: 1.85,
    cssRatio: "1.85 / 1",
    description: "Standard cinema theatrical release",
    referenceWidth: 3996,
    referenceHeight: 2160,
    desktopOptimal: true,
    mobileOptimal: false,
  },

  // --- DESKTOP, BROADCAST & LAPTOP ---
  {
    id: "16:9",
    label: "16:9 Standard Widescreen",
    shortLabel: "16:9",
    category: "desktop",
    orientation: "landscape",
    numeric: 16 / 9,
    cssRatio: "16 / 9",
    description: "Standard HD / 4K UHD, YouTube, PC monitors, broadcast TV",
    referenceWidth: 1920,
    referenceHeight: 1080,
    desktopOptimal: true,
    mobileOptimal: false,
  },
  {
    id: "16:10",
    label: "16:10 Studio Laptop / MacBook",
    shortLabel: "16:10",
    category: "desktop",
    orientation: "landscape",
    numeric: 16 / 10,
    cssRatio: "16 / 10",
    description: "Apple MacBook Pro Liquid Retina XDR displays & studio monitors",
    referenceWidth: 2560,
    referenceHeight: 1600,
    desktopOptimal: true,
    mobileOptimal: false,
  },

  // --- PHOTO & CLASSIC FILM ---
  {
    id: "3:2",
    label: "3:2 35mm Photography",
    shortLabel: "3:2",
    category: "photo",
    orientation: "landscape",
    numeric: 3 / 2,
    cssRatio: "3 / 2",
    description: "Standard 35mm full-frame camera sensors (Sony, Canon, Nikon)",
    referenceWidth: 6000,
    referenceHeight: 4000,
    desktopOptimal: true,
    mobileOptimal: false,
  },
  {
    id: "4:3",
    label: "4:3 Academy / Vintage",
    shortLabel: "4:3",
    category: "photo",
    orientation: "landscape",
    numeric: 4 / 3,
    cssRatio: "4 / 3",
    description: "Classic TV, 16mm film, Micro Four Thirds, iPad display",
    referenceWidth: 2880,
    referenceHeight: 2160,
    desktopOptimal: true,
    mobileOptimal: false,
  },

  // --- SOCIAL & MOBILE ---
  {
    id: "1:1",
    label: "1:1 Square Feed",
    shortLabel: "1:1",
    category: "social",
    orientation: "square",
    numeric: 1.0,
    cssRatio: "1 / 1",
    description: "Square feed post, album artwork, carousel covers",
    referenceWidth: 1080,
    referenceHeight: 1080,
    desktopOptimal: false,
    mobileOptimal: true,
  },
  {
    id: "4:5",
    label: "4:5 Portrait Feed / Still",
    shortLabel: "4:5",
    category: "social",
    orientation: "portrait",
    numeric: 4 / 5,
    cssRatio: "4 / 5",
    description: "Instagram portrait feed, mobile photography still cut",
    referenceWidth: 1080,
    referenceHeight: 1350,
    desktopOptimal: false,
    mobileOptimal: true,
  },
  {
    id: "9:16",
    label: "9:16 Vertical Reel / Story",
    shortLabel: "9:16",
    category: "social",
    orientation: "portrait",
    numeric: 9 / 16,
    cssRatio: "9 / 16",
    description: "TikTok, Instagram Reels, YouTube Shorts, mobile full-screen",
    referenceWidth: 1080,
    referenceHeight: 1920,
    desktopOptimal: false,
    mobileOptimal: true,
  },
] as const;

/**
 * Fast lookup map by ID
 */
export const ASPECT_RATIO_BY_ID: Record<AspectRatioId, AspectRatioPreset | undefined> =
  ASPECT_RATIO_PRESETS.reduce(
    (acc, preset) => {
      acc[preset.id] = preset;
      return acc;
    },
    {} as Record<AspectRatioId, AspectRatioPreset | undefined>
  );

export interface ParsedAspectRatio {
  raw: string | number;
  numeric: number;
  cssRatio: string;
  id: AspectRatioId;
  label: string;
  matchedPreset: AspectRatioPreset | null;
  orientation: AspectRatioOrientation;
  isPortrait: boolean;
  isLandscape: boolean;
  isSquare: boolean;
  isUltrawide: boolean;
}

/**
 * Determines orientation from numeric ratio
 */
export function getOrientationFromRatio(numeric: number): AspectRatioOrientation {
  if (numeric > 1.95) return "ultrawide";
  if (numeric > 1.05) return "landscape";
  if (numeric >= 0.95 && numeric <= 1.05) return "square";
  return "portrait";
}

/**
 * Parses any ratio string, number, or preset into a strongly-typed normalized result.
 * 
 * Supports:
 * - "16:9", "16/9", "16 / 9", "16x9"
 * - "4:5", "9:16", "1:1", "16:10", "2.39:1"
 * - Decimal numbers: 1.7777, 0.8, 1.6, 2.39
 */
export function parseAspectRatio(input: string | number | ParsedAspectRatio | any | null | undefined): ParsedAspectRatio {
  // Safe default for empty/invalid
  if (input === null || input === undefined || input === "") {
    const defaultPreset = ASPECT_RATIO_BY_ID["16:9"]!;
    return {
      raw: "16:9",
      numeric: defaultPreset.numeric,
      cssRatio: defaultPreset.cssRatio,
      id: "16:9",
      label: defaultPreset.label,
      matchedPreset: defaultPreset,
      orientation: "landscape",
      isPortrait: false,
      isLandscape: true,
      isSquare: false,
      isUltrawide: false,
    };
  }

  // If already an object conforming to ParsedAspectRatio or containing aspect ratio metadata
  if (typeof input === "object" && input !== null) {
    if (input.id && input.cssRatio && typeof input.numeric === "number") {
      return input as ParsedAspectRatio;
    }
    if (input.id && typeof input.id === "string") {
      return parseAspectRatio(input.id);
    }
    if (typeof input.numeric === "number") {
      return parseAspectRatio(input.numeric);
    }
    if (typeof input.cssRatio === "string") {
      return parseAspectRatio(input.cssRatio);
    }
    if (typeof input.raw === "string" || typeof input.raw === "number") {
      return parseAspectRatio(input.raw);
    }
  }

  // If already matches a known preset ID directly
  if (typeof input === "string" && ASPECT_RATIO_BY_ID[input as AspectRatioId]) {
    const preset = ASPECT_RATIO_BY_ID[input as AspectRatioId]!;
    return {
      raw: input,
      numeric: preset.numeric,
      cssRatio: preset.cssRatio,
      id: preset.id,
      label: preset.label,
      matchedPreset: preset,
      orientation: preset.orientation,
      isPortrait: preset.orientation === "portrait",
      isLandscape: preset.orientation === "landscape",
      isSquare: preset.orientation === "square",
      isUltrawide: preset.orientation === "ultrawide",
    };
  }

  let numeric: number | null = null;
  let rawStr = String(input).trim();

  // Handle "w:h", "w/h", "w / h", or "w x h"
  const colonOrSlashMatch = rawStr.match(/^(\d+(?:\.\d+)?)\s*[:/xX]\s*(\d+(?:\.\d+)?)$/);
  if (colonOrSlashMatch) {
    const w = parseFloat(colonOrSlashMatch[1]);
    const h = parseFloat(colonOrSlashMatch[2]);
    if (w > 0 && h > 0) {
      numeric = w / h;
    }
  }

  // Handle single float or integer (e.g. "1.777" or 1.6)
  if (numeric === null) {
    const parsedFloat = parseFloat(rawStr);
    if (!isNaN(parsedFloat) && parsedFloat > 0) {
      numeric = parsedFloat;
    }
  }

  // Fallback if parsing failed
  if (numeric === null || isNaN(numeric) || numeric <= 0) {
    const fallback = ASPECT_RATIO_BY_ID["16:9"]!;
    return {
      raw: input,
      numeric: fallback.numeric,
      cssRatio: fallback.cssRatio,
      id: "16:9",
      label: fallback.label,
      matchedPreset: fallback,
      orientation: "landscape",
      isPortrait: false,
      isLandscape: true,
      isSquare: false,
      isUltrawide: false,
    };
  }

  // Find nearest preset within 2.5% tolerance
  const matched = findNearestPreset(numeric, 0.025);
  const orientation = getOrientationFromRatio(numeric);

  if (matched) {
    return {
      raw: input,
      numeric: matched.numeric,
      cssRatio: matched.cssRatio,
      id: matched.id,
      label: matched.label,
      matchedPreset: matched,
      orientation: matched.orientation,
      isPortrait: matched.orientation === "portrait",
      isLandscape: matched.orientation === "landscape",
      isSquare: matched.orientation === "square",
      isUltrawide: matched.orientation === "ultrawide",
    };
  }

  // Custom non-preset ratio
  const formattedDecimal = Number(numeric.toFixed(3));
  const customCss = `${formattedDecimal} / 1`;

  return {
    raw: input,
    numeric,
    cssRatio: customCss,
    id: "custom",
    label: `${formattedDecimal}:1 Custom`,
    matchedPreset: null,
    orientation,
    isPortrait: orientation === "portrait",
    isLandscape: orientation === "landscape",
    isSquare: orientation === "square",
    isUltrawide: orientation === "ultrawide",
  };
}

/**
 * Snaps raw pixel dimensions to a standard filmmaker aspect ratio preset
 * with tolerance checking.
 * 
 * Default tolerance is 3.5% (0.035), accommodating minor sensor cropping,
 * letterboxing discrepancies, or encoder alignment (e.g. 1920x803 vs 1920x804).
 */
export function detectAspectRatioFromDimensions(
  width: number,
  height: number,
  tolerance: number = 0.035
): ParsedAspectRatio {
  if (!width || !height || width <= 0 || height <= 0) {
    return parseAspectRatio("16:9");
  }

  const rawNumeric = width / height;
  const matched = findNearestPreset(rawNumeric, tolerance);

  if (matched) {
    return {
      raw: `${width}x${height}`,
      numeric: matched.numeric,
      cssRatio: matched.cssRatio,
      id: matched.id,
      label: matched.label,
      matchedPreset: matched,
      orientation: matched.orientation,
      isPortrait: matched.orientation === "portrait",
      isLandscape: matched.orientation === "landscape",
      isSquare: matched.orientation === "square",
      isUltrawide: matched.orientation === "ultrawide",
    };
  }

  const orientation = getOrientationFromRatio(rawNumeric);
  const formattedDecimal = Number(rawNumeric.toFixed(3));

  return {
    raw: `${width}x${height}`,
    numeric: rawNumeric,
    cssRatio: `${formattedDecimal} / 1`,
    id: "custom",
    label: `${formattedDecimal}:1 (${width}×${height})`,
    matchedPreset: null,
    orientation,
    isPortrait: orientation === "portrait",
    isLandscape: orientation === "landscape",
    isSquare: orientation === "square",
    isUltrawide: orientation === "ultrawide",
  };
}

/**
 * Helper to find the nearest preset within a relative tolerance
 */
function findNearestPreset(
  targetNumeric: number,
  maxRelativeTolerance: number
): AspectRatioPreset | null {
  let closest: AspectRatioPreset | null = null;
  let minDiff = Infinity;

  for (const preset of ASPECT_RATIO_PRESETS) {
    const relativeDiff = Math.abs(preset.numeric - targetNumeric) / preset.numeric;
    if (relativeDiff <= maxRelativeTolerance && relativeDiff < minDiff) {
      minDiff = relativeDiff;
      closest = preset;
    }
  }

  return closest;
}

/**
 * Returns the optimal container styling classes and inline CSS properties
 * for rendering media inside the review player or gallery.
 * 
 * Guarantees that:
 * - Portrait / vertical media (4:5, 9:16) never overflows viewport height on desktop screens.
 * - Controls, timecodes, and comments remain visible without forcing the window to scroll.
 * - Mobile screens utilize full width naturally.
 */
export function getMediaBoundingStyles(ratioInput: string | number | null | undefined): {
  className: string;
  style: React.CSSProperties;
  parsed: ParsedAspectRatio;
} {
  const parsed = parseAspectRatio(ratioInput);

  // Styling rules based on orientation
  if (parsed.id === "9:16") {
    return {
      className: "w-auto max-w-full h-full max-h-[72vh] aspect-[9/16] mx-auto",
      style: { aspectRatio: "9 / 16" },
      parsed,
    };
  }

  if (parsed.id === "4:5") {
    return {
      className: "w-auto max-w-full h-full max-h-[72vh] aspect-[4/5] mx-auto",
      style: { aspectRatio: "4 / 5" },
      parsed,
    };
  }

  if (parsed.orientation === "square" || parsed.id === "1:1") {
    return {
      className: "w-auto max-w-full h-full max-h-[68vh] aspect-square mx-auto",
      style: { aspectRatio: "1 / 1" },
      parsed,
    };
  }

  if (parsed.id === "16:10") {
    return {
      className: "w-full max-w-full max-h-[75vh] aspect-[16/10] mx-auto",
      style: { aspectRatio: "16 / 10" },
      parsed,
    };
  }

  if (parsed.id === "2.39:1") {
    return {
      className: "w-full max-w-full max-h-[75vh] aspect-[2.39/1] mx-auto",
      style: { aspectRatio: "2.39 / 1" },
      parsed,
    };
  }

  if (parsed.id === "16:9") {
    return {
      className: "w-full max-w-full max-h-[75vh] aspect-video mx-auto",
      style: { aspectRatio: "16 / 9" },
      parsed,
    };
  }

  // Fallback for custom or other presets (e.g. 3:2, 4:3, 2:1, etc.)
  if (parsed.isPortrait) {
    return {
      className: "w-auto max-w-full h-full max-h-[72vh] mx-auto",
      style: { aspectRatio: parsed.cssRatio },
      parsed,
    };
  }

  return {
    className: "w-full max-w-full max-h-[75vh] mx-auto",
    style: { aspectRatio: parsed.cssRatio },
    parsed,
  };
}

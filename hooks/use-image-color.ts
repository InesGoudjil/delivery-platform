"use client";

import { useState, useEffect } from "react";
import { hexToRgb, rgbToHex } from "@/lib/theme-utils";

export interface ExtractedColor {
  hex: string;
  rgb: [number, number, number];
  rgbString: string;
  isExtracted: boolean;
}

const DEFAULT_AMBER: [number, number, number] = [210, 78, 2]; // #d24e02

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h, s, l];
}

/**
 * Hook to extract the dominant / ambient rim color from an image.
 * Uses an offscreen canvas with weighted scoring to pick the vibrant
 * background / ambient rim-light rather than dull neutrals or dark clothing.
 */
export function useImageColor(
  imageSrc?: string | null,
  fallbackHex: string = "#d24e02"
): ExtractedColor {
  const [color, setColor] = useState<ExtractedColor>(() => {
    const rgb = hexToRgb(fallbackHex) || DEFAULT_AMBER;
    return {
      hex: fallbackHex,
      rgb,
      rgbString: `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`,
      isExtracted: false,
    };
  });

  useEffect(() => {
    if (!imageSrc || typeof window === "undefined") return;

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const size = 48;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size).data;
        const scoredColors: { score: number; r: number; g: number; b: number }[] = [];

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const a = imgData[idx + 3];

            if (a < 128) continue;

            const [, s, l] = rgbToHsl(r, g, b);

            // Avoid near-black shadows, blown-out highlights, and low-saturation neutrals
            if (l < 0.15 || l > 0.85 || s < 0.25) continue;

            // Give extra weight to left and top regions where portrait backdrop lighting sits
            let weight = 1.0;
            if (x < size * 0.45) weight += 0.5;
            if (y < size * 0.45) weight += 0.3;

            // Score prioritizing high saturation and warm mid-tones
            const score = Math.pow(s, 1.5) * (1 - Math.abs(l - 0.45) * 1.2) * weight;
            scoredColors.push({ score, r, g, b });
          }
        }

        if (scoredColors.length > 0) {
          scoredColors.sort((a, b) => b.score - a.score);
          const topK = scoredColors.slice(0, Math.min(15, scoredColors.length));
          const avgR = Math.round(topK.reduce((sum, p) => sum + p.r, 0) / topK.length);
          const avgG = Math.round(topK.reduce((sum, p) => sum + p.g, 0) / topK.length);
          const avgB = Math.round(topK.reduce((sum, p) => sum + p.b, 0) / topK.length);

          const hex = rgbToHex(avgR, avgG, avgB);
          if (isMounted) {
            setColor({
              hex,
              rgb: [avgR, avgG, avgB],
              rgbString: `${avgR}, ${avgG}, ${avgB}`,
              isExtracted: true,
            });
          }
        }
      } catch (err) {
        // Fallback safely preserved if CORS prevents reading external canvas data
        console.warn("Could not extract image color due to CORS or image format:", err);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [imageSrc, fallbackHex]);

  return color;
}

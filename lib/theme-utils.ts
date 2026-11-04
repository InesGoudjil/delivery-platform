/**
 * Theme & Color Utilities for dynamic branding and accent color retinting.
 */

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  const fullHex =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const num = parseInt(fullHex, 16);
  if (isNaN(num)) {
    return [245, 85, 29]; // Default CineSpace Ember Orange (#F5551D)
  }

  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function lighten(hex: string, amount = 0.28): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => c + (255 - c) * amount;
  return rgbToHex(mix(r), mix(g), mix(b));
}

export function darken(rgb: [number, number, number] | number[], amount = 0.28): [number, number, number] {
  return [
    Math.round(rgb[0] * (1 - amount)),
    Math.round(rgb[1] * (1 - amount)),
    Math.round(rgb[2] * (1 - amount)),
  ];
}

/**
 * Calculates perceived brightness using standard ITU-R BT.709 / W3C luminance formulas
 * to determine whether foreground text should be dark or light.
 */
export function getContrastForeground(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  // Perceived luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#09090b" : "#ffffff";
}

/**
 * Generates the full set of CSS custom properties needed to retint:
 * - shadcn primary, ring, sidebar tokens
 * - ambient cinematic background glow variables
 * - CineSpace brand accent tokens (--orange, --orange2, --acc)
 */
export function generateAccentVariables(accentHex: string): Record<string, string> {
  const base = /^#[0-9a-fA-F]{3,6}$/.test(accentHex) ? accentHex : "#F5551D";
  const rgb = hexToRgb(base);
  const lightHex = lighten(base, 0.28);
  const lightRgb = hexToRgb(lightHex);
  const darkRgb = darken(rgb, 0.28);
  const contrastForeground = getContrastForeground(base);

  return {
    "--primary": base,
    "--primary-foreground": contrastForeground,
    "--ring": base,
    "--sidebar-primary": base,
    "--sidebar-primary-foreground": contrastForeground,
    "--sidebar-ring": base,
    "--orange": base,
    "--orange2": lightHex,
    "--acc": base,
    "--acc-rgb": rgb.join(","),
    "--acc2-rgb": lightRgb.join(","),
    "--acc-dk-rgb": darkRgb.join(","),
  };
}

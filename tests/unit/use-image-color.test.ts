import { describe, it, expect } from "vitest";
import { hexToRgb, rgbToHex } from "@/lib/theme-utils";

describe("Color extraction utilities & fallback calculations", () => {
  it("converts hex to RGB and back accurately", () => {
    const hex = "#d24e02";
    const rgb = hexToRgb(hex);
    expect(rgb).toEqual([210, 78, 2]);

    const backHex = rgbToHex(rgb[0], rgb[1], rgb[2]);
    expect(backHex.toLowerCase()).toBe("#d24e02");
  });

  it("handles default fallback values safely", () => {
    const invalidHex = "invalid";
    const rgb = hexToRgb(invalidHex);
    expect(rgb).toEqual([245, 85, 29]); // CineSpace default Ember Orange
  });
});

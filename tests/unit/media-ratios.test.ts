import { describe, it, expect } from "vitest";
import {
  parseAspectRatio,
  detectAspectRatioFromDimensions,
  getMediaBoundingStyles,
  getOrientationFromRatio,
  ASPECT_RATIO_PRESETS,
  ASPECT_RATIO_BY_ID,
} from "@/lib/media-ratios";
import { inspectMediaFile } from "@/lib/media-inspector";

describe("Filmmaker Aspect Ratio Engine (lib/media-ratios)", () => {
  describe("Taxonomy & Presets", () => {
    it("should provide all core filmmaker presets", () => {
      const expectedPresets = [
        "2.39:1",
        "2:1",
        "1.85:1",
        "16:9",
        "16:10",
        "3:2",
        "4:3",
        "1:1",
        "4:5",
        "9:16",
      ];
      expectedPresets.forEach((id) => {
        expect(ASPECT_RATIO_BY_ID[id]).toBeDefined();
        expect(ASPECT_RATIO_BY_ID[id]?.id).toBe(id);
      });
      expect(ASPECT_RATIO_PRESETS.length).toBe(10);
    });

    it("should correctly identify orientation from ratio", () => {
      expect(getOrientationFromRatio(2.39)).toBe("ultrawide");
      expect(getOrientationFromRatio(2.0)).toBe("ultrawide");
      expect(getOrientationFromRatio(1.777)).toBe("landscape");
      expect(getOrientationFromRatio(1.6)).toBe("landscape");
      expect(getOrientationFromRatio(1.0)).toBe("square");
      expect(getOrientationFromRatio(0.8)).toBe("portrait");
      expect(getOrientationFromRatio(0.5625)).toBe("portrait");
    });
  });

  describe("parseAspectRatio", () => {
    it("should fallback gracefully to 16:9 when given null, undefined, or empty string", () => {
      expect(parseAspectRatio(null).id).toBe("16:9");
      expect(parseAspectRatio(undefined).id).toBe("16:9");
      expect(parseAspectRatio("").id).toBe("16:9");
    });

    it("should parse standard preset strings directly", () => {
      const r169 = parseAspectRatio("16:9");
      expect(r169.id).toBe("16:9");
      expect(r169.numeric).toBeCloseTo(16 / 9);
      expect(r169.isLandscape).toBe(true);

      const r1610 = parseAspectRatio("16:10");
      expect(r1610.id).toBe("16:10");
      expect(r1610.numeric).toBeCloseTo(16 / 10);
      expect(r1610.isLandscape).toBe(true);

      const r45 = parseAspectRatio("4:5");
      expect(r45.id).toBe("4:5");
      expect(r45.numeric).toBeCloseTo(4 / 5);
      expect(r45.isPortrait).toBe(true);

      const r916 = parseAspectRatio("9:16");
      expect(r916.id).toBe("9:16");
      expect(r916.numeric).toBeCloseTo(9 / 16);
      expect(r916.isPortrait).toBe(true);

      const r11 = parseAspectRatio("1:1");
      expect(r11.id).toBe("1:1");
      expect(r11.numeric).toBe(1.0);
      expect(r11.isSquare).toBe(true);

      const rScope = parseAspectRatio("2.39:1");
      expect(rScope.id).toBe("2.39:1");
      expect(rScope.isUltrawide).toBe(true);
    });

    it("should parse alternative delimiters like '16/9', '16 / 9', and '4/5'", () => {
      expect(parseAspectRatio("16/9").id).toBe("16:9");
      expect(parseAspectRatio("16 / 9").id).toBe("16:9");
      expect(parseAspectRatio("4/5").id).toBe("4:5");
      expect(parseAspectRatio("9 / 16").id).toBe("9:16");
    });

    it("should parse decimal numeric inputs", () => {
      expect(parseAspectRatio(1.777777).id).toBe("16:9");
      expect(parseAspectRatio(0.8).id).toBe("4:5");
      expect(parseAspectRatio(1.6).id).toBe("16:10");
      expect(parseAspectRatio(1.0).id).toBe("1:1");
    });

    it("should handle custom non-standard ratios gracefully", () => {
      const custom = parseAspectRatio("2.76:1"); // Ultra Panavision 70
      expect(custom.id).toBe("custom");
      expect(custom.numeric).toBeCloseTo(2.76);
      expect(custom.isUltrawide).toBe(true);
      expect(custom.matchedPreset).toBeNull();
    });

    it("should gracefully handle pre-parsed ParsedAspectRatio objects without double-converting or breaking", () => {
      const parsed169 = parseAspectRatio("16:9");
      const reParsed = parseAspectRatio(parsed169);
      expect(reParsed.id).toBe("16:9");
      expect(reParsed.numeric).toBeCloseTo(16 / 9);
      expect(reParsed.cssRatio).toBe("16 / 9");
      expect(reParsed.isLandscape).toBe(true);

      // Object from detectAspectRatioFromDimensions
      const detected = detectAspectRatioFromDimensions(1080, 1920);
      const reParsedDetected = parseAspectRatio(detected);
      expect(reParsedDetected.id).toBe("9:16");
      expect(reParsedDetected.isPortrait).toBe(true);

      // Object with only { id } or { numeric } or { cssRatio }
      expect(parseAspectRatio({ id: "4:5" }).id).toBe("4:5");
      expect(parseAspectRatio({ numeric: 1.0 }).id).toBe("1:1");
      expect(parseAspectRatio({ cssRatio: "16 / 9" }).id).toBe("16:9");
    });
  });

  describe("detectAspectRatioFromDimensions (Smart Snapping)", () => {
    it("should snap 1920x1080 and 3840x2160 to 16:9", () => {
      const hd = detectAspectRatioFromDimensions(1920, 1080);
      expect(hd.id).toBe("16:9");
      expect(hd.matchedPreset?.label).toContain("16:9");

      const uhd = detectAspectRatioFromDimensions(3840, 2160);
      expect(uhd.id).toBe("16:9");
    });

    it("should snap 2560x1600 (MacBook Pro) to 16:10", () => {
      const mbp = detectAspectRatioFromDimensions(2560, 1600);
      expect(mbp.id).toBe("16:10");
    });

    it("should snap 1080x1350 to 4:5 Instagram portrait", () => {
      const ig = detectAspectRatioFromDimensions(1080, 1350);
      expect(ig.id).toBe("4:5");
      expect(ig.isPortrait).toBe(true);
    });

    it("should snap 1080x1920 to 9:16 vertical reel", () => {
      const reel = detectAspectRatioFromDimensions(1080, 1920);
      expect(reel.id).toBe("9:16");
      expect(reel.isPortrait).toBe(true);
    });

    it("should snap 6000x4000 to 3:2 full-frame photography", () => {
      const still = detectAspectRatioFromDimensions(6000, 4000);
      expect(still.id).toBe("3:2");
      expect(still.isLandscape).toBe(true);
    });

    it("should snap 3840x1608 (Anamorphic Scope) to 2.39:1", () => {
      const scope = detectAspectRatioFromDimensions(3840, 1608);
      expect(scope.id).toBe("2.39:1");
      expect(scope.isUltrawide).toBe(true);
    });

    it("should tolerate slight video encoder alignment variations (e.g. 1920x803 vs 804)", () => {
      const scopeApprox = detectAspectRatioFromDimensions(1920, 803);
      expect(scopeApprox.id).toBe("2.39:1");
    });

    it("should handle custom resolution if no standard preset matches", () => {
      const imax = detectAspectRatioFromDimensions(2860, 2000); // 1.43:1
      expect(imax.id).toBe("custom");
      expect(imax.numeric).toBeCloseTo(1.43);
    });
  });

  describe("getMediaBoundingStyles", () => {
    it("should bound 9:16 vertical media with height constraints for desktop", () => {
      const styles = getMediaBoundingStyles("9:16");
      expect(styles.className).toContain("max-h-[72vh]");
      expect(styles.className).toContain("aspect-[9/16]");
      expect(styles.style.aspectRatio).toBe("9 / 16");
    });

    it("should bound 4:5 portrait media with height constraints for desktop", () => {
      const styles = getMediaBoundingStyles("4:5");
      expect(styles.className).toContain("max-h-[72vh]");
      expect(styles.className).toContain("aspect-[4/5]");
      expect(styles.style.aspectRatio).toBe("4 / 5");
    });

    it("should style 16:9 and 16:10 widescreen media appropriately", () => {
      const r169 = getMediaBoundingStyles("16:9");
      expect(r169.className).toContain("aspect-video");
      expect(r169.className).toContain("max-h-[75vh]");

      const r1610 = getMediaBoundingStyles("16:10");
      expect(r1610.className).toContain("aspect-[16/10]");
    });

    it("should bound 1:1 square media with height constraints for desktop", () => {
      const styles = getMediaBoundingStyles("1:1");
      expect(styles.className).toContain("max-h-[68vh]");
      expect(styles.className).toContain("aspect-square");
      expect(styles.style.aspectRatio).toBe("1 / 1");
    });

    it("should style 2.39:1 scope cinematic media with ultrawide width-first constraints", () => {
      const styles = getMediaBoundingStyles("2.39:1");
      expect(styles.className).toContain("max-h-[75vh]");
      expect(styles.className).toContain("aspect-[2.39/1]");
      expect(styles.style.aspectRatio).toBe("2.39 / 1");
    });
  });

  describe("inspectMediaFile in Node/SSR environment", () => {
    it("should return safe fallback when window is undefined", async () => {
      const mockFile = new File(["test"], "sample.mp4", { type: "video/mp4" });
      const result = await inspectMediaFile(mockFile);
      expect(result.success).toBe(false);
      expect(result.aspectRatio.id).toBe("16:9");
    });
  });
});

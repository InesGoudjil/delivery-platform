import { describe, it, expect } from "vitest";
import {
  MediaCard,
  MediaGrid,
  MediaBadge,
  HeroBadge,
  FeaturedBadge,
  AssetCountBadge,
  VersionBadge,
  PlayButtonOverlay,
  ZoomButtonOverlay,
  CardBottomOverlay,
  parseItemAspectRatio,
  getMediaGridClasses,
} from "@/components/workspaces/media-card";

describe("components/workspaces/media-card", () => {
  it("exports all unified media components, subcomponents, and helpers", () => {
    expect(typeof MediaCard).toBe("function");
    expect(typeof MediaGrid).toBe("function");
    expect(typeof MediaBadge).toBe("function");
    expect(typeof HeroBadge).toBe("function");
    expect(typeof FeaturedBadge).toBe("function");
    expect(typeof AssetCountBadge).toBe("function");
    expect(typeof VersionBadge).toBe("function");
    expect(typeof PlayButtonOverlay).toBe("function");
    expect(typeof ZoomButtonOverlay).toBe("function");
    expect(typeof CardBottomOverlay).toBe("function");
    expect(typeof parseItemAspectRatio).toBe("function");
    expect(typeof getMediaGridClasses).toBe("function");
  });

  it("attaches compound subcomponents to MediaCard", () => {
    expect(MediaCard.Badge).toBe(MediaBadge);
    expect(MediaCard.Count).toBe(AssetCountBadge);
    expect(MediaCard.Featured).toBe(FeaturedBadge);
    expect(MediaCard.Hero).toBe(HeroBadge);
    expect(MediaCard.Version).toBe(VersionBadge);
    expect(MediaCard.Play).toBe(PlayButtonOverlay);
    expect(MediaCard.Zoom).toBe(ZoomButtonOverlay);
    expect(MediaCard.BottomOverlay).toBe(CardBottomOverlay);
  });

  describe("parseItemAspectRatio", () => {
    it("parses colon-separated strings accurately", () => {
      expect(parseItemAspectRatio("16:9")).toBeCloseTo(16 / 9, 4);
      expect(parseItemAspectRatio("4:3")).toBeCloseTo(4 / 3, 4);
      expect(parseItemAspectRatio("9:16")).toBeCloseTo(9 / 16, 4);
      expect(parseItemAspectRatio("1:1")).toBe(1);
    });

    it("parses numeric strings and numbers", () => {
      expect(parseItemAspectRatio("1.777")).toBe(1.777);
      expect(parseItemAspectRatio(1.5)).toBe(1.5);
    });

    it("safely handles null, undefined, and invalid inputs", () => {
      expect(parseItemAspectRatio(null)).toBeNull();
      expect(parseItemAspectRatio(undefined)).toBeNull();
      expect(parseItemAspectRatio("invalid")).toBeNull();
      expect(parseItemAspectRatio(0)).toBeNull();
      expect(parseItemAspectRatio(-2)).toBeNull();
    });
  });

  describe("getMediaGridClasses", () => {
    it("returns standard responsive grid classes for fixed ratios", () => {
      const sGrid = getMediaGridClasses(false, "S");
      expect(sGrid).toContain("grid");
      expect(sGrid).toContain("grid-cols-2");

      const mGrid = getMediaGridClasses(false, "M");
      expect(mGrid).toContain("grid");
      expect(mGrid).toContain("grid-cols-1 sm:grid-cols-2 md:grid-cols-3");

      const lGrid = getMediaGridClasses(false, "L");
      expect(lGrid).toContain("grid");
      expect(lGrid).toContain("grid-cols-1 sm:grid-cols-2 lg:grid-cols-3");
    });

    it("returns standard responsive column classes for masonry mode without space-y", () => {
      const sMasonry = getMediaGridClasses(true, "S");
      expect(sMasonry).toContain("columns-2");
      expect(sMasonry).not.toContain("space-y");

      const mMasonry = getMediaGridClasses(true, "M");
      expect(mMasonry).toContain("columns-1 sm:columns-2");
      expect(mMasonry).not.toContain("space-y");

      const lMasonry = getMediaGridClasses(true, "L");
      expect(lMasonry).toContain("columns-1 sm:columns-2 lg:columns-3");
      expect(lMasonry).not.toContain("space-y");
    });
  });
});

import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
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
  getMediaGridClasses,
} from "@/components/workspaces/media-card";
import type { MediaCardProps } from "@/components/workspaces/media-card";

function renderCard(props: Partial<MediaCardProps>): string {
  return renderToStaticMarkup(
    React.createElement(MediaCard, { src: "/images/sample.jpg", title: "Sample", ...props })
  );
}

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

  describe("MediaCard sizing", () => {
    it("gives a masonry card exactly the file's shape, with no minimum height", () => {
      const html = renderCard({ isMasonry: true, aspectRatio: "2.39:1" });
      expect(html).toContain("aspect-ratio:2.39");
      expect(html).not.toContain("min-h-[");
    });

    it("prefers an explicit numeric ratio over the stored one", () => {
      const html = renderCard({ isMasonry: true, aspectRatio: "16:9", numericRatio: 0.8 });
      expect(html).toContain("aspect-ratio:0.8");
    });

    it("clamps impossible ratios so a masonry card never gets absurdly thin or tall", () => {
      expect(renderCard({ isMasonry: true, aspectRatio: "4:1" })).toContain("aspect-ratio:2.5");
      expect(renderCard({ isMasonry: true, aspectRatio: "1:4" })).toContain("aspect-ratio:0.5");
    });

    it("keeps fixed-ratio tiles at the chosen ratio, with no minimum height", () => {
      const html = renderCard({ isMasonry: false, aspectRatio: "9:16", numericRatio: 16 / 9 });
      expect(html).toContain(`aspect-ratio:${16 / 9}`);
      expect(html).not.toContain("min-h-[");
    });

    it("sizes itself from its ratio when used outside a masonry grid", () => {
      const html = renderCard({ isMasonry: true, aspectRatio: "4:5" });
      expect(html).toContain("aspect-ratio:0.8");
      expect(html).toContain("rounded-2xl w-full h-auto");
    });

    it("makes the media box a size container for the compact overlay", () => {
      expect(renderCard({ isMasonry: true })).toContain("[container-type:size]");
      expect(renderCard({ isMasonry: false })).toContain("[container-type:size]");
    });
  });
});

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CoverBannerSection } from "@/app/(workspace)/[workspaceSlug]/portfolio/_components/cover-banner-section";
import { PortfolioHeroCover } from "@/core/entities/portfolio";

describe("CoverBannerSection Component", () => {
  const baseHeroCover: PortfolioHeroCover = {
    type: "video",
    mediaUrl: "https://example.com/cover.mp4",
    thumbnailUrl: "https://example.com/thumb.jpg",
    title: "Cinematic Film Reel",
    category: "Featured Film",
    aspectRatio: "21:9",
    overlayOpacity: 50,
    showHeroText: true,
  };

  it("renders live preview container with matching PortfolioHero dimensions and aspect ratio", () => {
    const html = renderToStaticMarkup(
      React.createElement(CoverBannerSection, {
        heroCover: baseHeroCover,
        onHeroCoverChange: () => {},
        brandName: "Acme Studios",
        handle: "acme",
        accent: "#F5551D",
        onCustomUpload: () => {},
        onSaveHero: () => {},
        isHeroDirty: false,
      })
    );

    expect(html).toContain("w-full");
    expect(html).toContain("aspect-[4/5]");
    expect(html).toContain("sm:aspect-[21/9]");
    expect(html).toContain("min-h-[380px]");
    expect(html).toContain("sm:min-h-0");
    expect(html).toContain("rounded-[1.75rem]");
    expect(html).toContain("sm:rounded-[2rem]");
    expect(html).toContain("Cinematic Film Reel");
    expect(html).toContain("Storefront Hero Banner");
  });

  it("displays loading state when isUploadingMedia is true", () => {
    const html = renderToStaticMarkup(
      React.createElement(CoverBannerSection, {
        heroCover: baseHeroCover,
        onHeroCoverChange: () => {},
        brandName: "Acme Studios",
        handle: "acme",
        accent: "#F5551D",
        onCustomUpload: () => {},
        isUploadingMedia: true,
        uploadProgress: 42,
      })
    );

    expect(html).toContain("Uploading 42%");
  });

  it("renders aspect ratio framing options (21:9, 16:9, 3:1)", () => {
    const html = renderToStaticMarkup(
      React.createElement(CoverBannerSection, {
        heroCover: baseHeroCover,
        onHeroCoverChange: () => {},
        brandName: "Acme Studios",
        handle: "acme",
        accent: "#F5551D",
      })
    );

    expect(html).toContain("21:9");
    expect(html).toContain("16:9");
    expect(html).toContain("3:1");
    expect(html).toContain("Aspect Ratio Framing");
  });
});

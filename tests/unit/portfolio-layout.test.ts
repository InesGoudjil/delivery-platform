import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  normalizePortfolioAppearance,
  normalizePortfolioLayout,
  type PortfolioAppearance,
} from "@/core/entities/portfolio";
import { LatestWork } from "@/app/(public)/p/[handle]/_components/latest-work";
import { PortfolioProvider } from "@/app/(public)/p/[handle]/_components/portfolio-context";
import type { FilmmakerProfile, PortfolioAsset } from "@/lib/portfolio-data";

describe("portfolio layout setting", () => {
  it("reads the old values as masonry, which is how they have always been shown", () => {
    expect(normalizePortfolioLayout("grid")).toBe("masonry");
    expect(normalizePortfolioLayout("4:3")).toBe("masonry");
    expect(normalizePortfolioLayout("masonry")).toBe("masonry");
  });

  it("keeps the fixed ratios and falls back to 16:9", () => {
    expect(normalizePortfolioLayout("16:9")).toBe("16:9");
    expect(normalizePortfolioLayout("9:16")).toBe("9:16");
    expect(normalizePortfolioLayout("1:1")).toBe("1:1");
    expect(normalizePortfolioLayout(undefined)).toBe("16:9");
    expect(normalizePortfolioLayout("21:9")).toBe("16:9");
  });

  it("fills in defaults and keeps every other stored setting", () => {
    expect(normalizePortfolioAppearance(null)).toEqual({
      cardSize: "M",
      thumbnailScale: "fill",
      showClientInfo: true,
      featuredItemIds: [],
      aspectRatio: "16:9",
    });

    const stored = {
      cardSize: "S",
      aspectRatio: "grid",
      thumbnailScale: "fit",
      showClientInfo: false,
      featuredItemIds: ["a1"],
      heroCover: { type: "still", mediaUrl: "/cover.jpg" },
    };
    expect(normalizePortfolioAppearance(stored)).toEqual({ ...stored, aspectRatio: "masonry" });
  });
});

describe("LatestWork grid", () => {
  const profile = {
    name: "Studio Nova",
    handle: "studionova",
    title: "Studio Nova",
    avatar: "",
    bio: "",
    tagline: "",
    heroImage: "",
    stats: { filmsDelivered: "1", experienceYears: "1", based: "Dubai" },
    experience: [],
    whatsappNumber: "",
    email: "",
    cta: { title: "", subtitle: "", image: "" },
  } as unknown as FilmmakerProfile;

  const film: PortfolioAsset = {
    id: "f1",
    kind: "film",
    cat: "Commercial",
    title: "Scope Film",
    desc: "",
    ar: 2.39,
    tc: "1:00",
    image: "/images/film.jpg",
  };

  function render(appearance: PortfolioAppearance) {
    return renderToStaticMarkup(
      React.createElement(PortfolioProvider, {
        profile,
        projects: [],
        assets: [film],
        children: React.createElement(LatestWork, { projects: [], assets: [film], appearance }),
      })
    );
  }

  it("shows films at their own ratio in masonry mode", () => {
    const html = render(normalizePortfolioAppearance({ aspectRatio: "masonry" }));
    expect(html).toContain('<ul class="media-masonry__list" data-size="M">');
    expect(html).toContain("--masonry-span:24;--masonry-ratio:2.39");
  });

  it("treats a stored legacy value the same way", () => {
    const html = render(normalizePortfolioAppearance({ aspectRatio: "grid" }));
    expect(html).toContain("--masonry-ratio:2.39");
  });

  it("uses the chosen tile ratio outside masonry mode", () => {
    const html = render(normalizePortfolioAppearance({ aspectRatio: "1:1" }));
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("aspect-ratio:1");
    expect(html).not.toContain("2.39");
  });
});

import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PortfolioHero } from "@/app/(public)/p/[handle]/_components/portfolio-hero";
import { PortfolioProvider } from "@/app/(public)/p/[handle]/_components/portfolio-context";
import { FilmmakerProfile } from "@/lib/portfolio-data";

const baseProfile: FilmmakerProfile = {
  name: "Studio Nova",
  handle: "studionova",
  title: "Studio Nova Portfolio",
  avatar: "/avatar.jpg",
  bio: "Filmmaker bio",
  tagline: "Commercial Films",
  heroImage: "/images/hero.jpg",
  heroCover: {
    type: "video",
    mediaUrl: "https://example.com/reel.mp4",
    title: "Cinematic Reel 2026",
    category: "Featured Film",
    showHeroText: true,
  },
  stats: {
    filmsDelivered: "50+",
    experienceYears: "5",
    based: "Dubai",
  },
  experience: [],
  whatsappNumber: "+971500000000",
  email: "hello@studionova.film",
  cta: {
    title: "Get in touch",
    subtitle: "Let's make films",
    image: "/images/cta.jpg",
  },
};

function renderHeroWithProvider(profile: FilmmakerProfile) {
  return renderToStaticMarkup(
    React.createElement(
      PortfolioProvider,
      {
        profile,
        projects: [],
        assets: [],
      },
      React.createElement(PortfolioHero, { profile })
    )
  );
}

describe("PortfolioHero Component", () => {
  it("renders both headline text and category badge when showHeroText is true", () => {
    const html = renderHeroWithProvider({
      ...baseProfile,
      heroCover: {
        ...baseProfile.heroCover,
        title: "Cinematic Reel 2026",
        category: "Featured Film",
        showHeroText: true,
      },
    });

    expect(html).toContain("Cinematic Reel 2026");
    expect(html).toContain("Featured Film");
  });

  it("renders both headline text and category badge by default when showHeroText is omitted", () => {
    const html = renderHeroWithProvider({
      ...baseProfile,
      heroCover: {
        type: "video",
        mediaUrl: "https://example.com/reel.mp4",
        title: "Default Visible Title",
        category: "Commercial Showcase",
      },
    });

    expect(html).toContain("Default Visible Title");
    expect(html).toContain("Commercial Showcase");
  });

  it("hides both headline text and category badge when showHeroText is false", () => {
    const html = renderHeroWithProvider({
      ...baseProfile,
      heroCover: {
        ...baseProfile.heroCover,
        title: "Should Be Hidden Headline",
        category: "Hidden Badge",
        showHeroText: false,
      },
    });

    expect(html).not.toContain("Should Be Hidden Headline");
    expect(html).not.toContain("Hidden Badge");
  });
});

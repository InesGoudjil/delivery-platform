import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PortfolioHero } from "@/app/(public)/p/[handle]/_components/portfolio-hero";
import { PortfolioHeader } from "@/app/(public)/p/[handle]/_components/portfolio-header";
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
        children: React.createElement(PortfolioHero, { profile }),
      }
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

describe("PortfolioHero sizing", () => {
  // Screen height minus the sticky header (row + 1px border) and the gap above and below the hero.
  const FRAME_HEIGHT = "h-[calc(100svh_-_var(--portfolio-header-h)_-_1px_-_2*var(--portfolio-gap))]";

  it("fills the first screen whatever the hero format setting, with a minimum height", () => {
    for (const aspectRatio of [undefined, "21:9", "16:9", "3:1"]) {
      const html = renderHeroWithProvider({
        ...baseProfile,
        heroCover: { ...baseProfile.heroCover, aspectRatio },
      });

      expect(html).toContain(FRAME_HEIGHT);
      expect(html).toContain("min-h-48");
      expect(html).not.toContain("aspect-[");
    }
  });

  it("subtracts the same header height that the header row uses", () => {
    const html = renderToStaticMarkup(
      React.createElement(PortfolioProvider, {
        profile: baseProfile,
        projects: [],
        assets: [],
        children: React.createElement(PortfolioHeader, { profile: baseProfile }),
      })
    );

    expect(html).toContain("h-(--portfolio-header-h)");
    expect(html).toContain("border-b");
  });

  it("covers the whole frame with the hero video", () => {
    const html = renderHeroWithProvider(baseProfile);

    expect(html).toMatch(/<video[^>]*class="size-full object-cover"/);
    expect(html).toContain("Unmute");
  });
});

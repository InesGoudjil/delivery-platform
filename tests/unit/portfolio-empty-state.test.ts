import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LatestWork } from "@/app/(public)/p/[handle]/_components/latest-work";
import { PortfolioProvider } from "@/app/(public)/p/[handle]/_components/portfolio-context";
import { FilmmakerProfile } from "@/lib/portfolio-data";

const emptyProfile: FilmmakerProfile = {
  name: "Apex Studio",
  handle: "apexstudio",
  title: "Apex Studio Portfolio",
  avatar: "",
  bio: "Commercial studio",
  tagline: "Commercial Films",
  heroImage: "/images/hero.jpg",
  stats: {
    filmsDelivered: "0",
    experienceYears: "—",
    based: "Global",
  },
  experience: [],
  whatsappNumber: "",
  email: "apexstudio@cinespace.film",
  cta: {
    title: "LET'S CREATE TOGETHER.",
    subtitle: "Brand films and commercial campaigns.",
    image: "/images/hero.jpg",
  },
};

describe("Portfolio Empty State", () => {
  it("renders authentic empty state without mock data when workspace has no projects or assets", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        PortfolioProvider,
        {
          profile: emptyProfile,
          projects: [],
          assets: [],
          children: React.createElement(LatestWork, {
            projects: [],
            assets: [],
          }),
        }
      )
    );

    // Verifies empty state rendered
    expect(html).toContain("No featured projects published yet.");

    // Verifies no mock projects exist in render
    expect(html).not.toContain("Boxing Event");
    expect(html).not.toContain("Fashion Event");
    expect(html).not.toContain("Maserati");
    expect(html).not.toContain("G Class");
    expect(html).not.toContain("Pedro Concreato");
  });
});

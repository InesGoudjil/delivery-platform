"use client";

import React, { useState } from "react";
import { PortfolioAppearance, PortfolioExperience, SocialLinks } from "@/core/entities/portfolio";
import { PortfolioHero } from "./_components/portfolio-hero";
import { ExperienceSection } from "./_components/experience-section";
import { AppearanceToolbar } from "./_components/appearance-toolbar";
import { FeaturedReel } from "./_components/featured-reel";
import { ShowcaseGrid } from "./_components/showcase-grid";

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  type: "film" | "still" | "project";
  assetCount: number;
  thumbnailUrl: string;
  isFeatured?: boolean;
}

export interface PortfolioClientProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  portfolio: {
    id: string;
    title: string;
    bio?: string | null;
    coverAssetUrl?: string | null;
    socialLinks?: SocialLinks;
    isPublished?: boolean;
    appearance?: PortfolioAppearance;
    experience?: PortfolioExperience[];
  };
  initialProjects: PortfolioItem[];
  initialFeaturedIds: string[];
}

export function PortfolioClient({
  workspace,
  portfolio,
  initialProjects,
  initialFeaturedIds,
}: PortfolioClientProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [projects, setProjects] = useState<PortfolioItem[]>(initialProjects);

  const initialApp: PortfolioAppearance = portfolio.appearance || {
    cardSize: "M",
    aspectRatio: "16:9",
    thumbnailScale: "fill",
    showClientInfo: true,
  };
  const [appearance, setAppearance] = useState<PortfolioAppearance>(initialApp);

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleProjectCreated = (newItem: PortfolioItem) => {
    setProjects((prev) => [newItem, ...prev]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#f5551d] text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* 1. Profile Hero Banner & Modals */}
      <PortfolioHero
        workspace={workspace}
        portfolio={portfolio}
        onProjectCreated={handleProjectCreated}
        showFlash={showFlash}
      />

      {/* 2. Experience & Credentials Section */}
      <ExperienceSection
        portfolioId={portfolio.id}
        initialExperiences={portfolio.experience || []}
        showFlash={showFlash}
      />

      {/* 3. Appearance Controls Toolbar */}
      <AppearanceToolbar
        portfolioId={portfolio.id}
        initialAppearance={appearance}
        onAppearanceChange={setAppearance}
        showFlash={showFlash}
      />

      {/* 4. Featured Work Reel */}
      <FeaturedReel
        portfolioId={portfolio.id}
        initialProjects={projects}
        initialFeaturedIds={initialFeaturedIds}
        showFlash={showFlash}
      />

      {/* 5. Showcase Work Grid */}
      <ShowcaseGrid
        portfolioId={portfolio.id}
        workspaceSlug={workspace.slug}
        projects={projects}
        initialFeaturedIds={initialFeaturedIds}
        appearance={appearance}
        showFlash={showFlash}
      />
    </div>
  );
}

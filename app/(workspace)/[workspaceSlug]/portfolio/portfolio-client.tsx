"use client";

import React, { useState } from "react";
import { PortfolioAppearance, PortfolioExperience, SocialLinks } from "@/core/entities/portfolio";
import { PortfolioHero } from "./_components/portfolio-hero";
import { AppearanceToolbar } from "./_components/appearance-toolbar";
import { FeaturedReel } from "./_components/featured-reel";
import { ShowcaseGrid } from "./_components/showcase-grid";
import {
  StillLightboxModal,
  FilmPlayerModal,
  ProjectExplorerModal,
} from "./_components/portfolio-modals";
import { ExperienceSection } from "./_components/experience-section";



export interface ProjectAsset {
  id: string;
  title: string;
  type: "film" | "still";
  url: string;
  thumbnailUrl: string;
  aspectRatio?: string;
  duration?: string | null;
  category?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  type: "film" | "still" | "project";
  assetCount: number;
  thumbnailUrl: string;
  mediaUrl?: string;
  description?: string | null;
  aspectRatio?: string;
  isFeatured?: boolean;
  projectAssets?: ProjectAsset[];
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

  // Modal Preview States
  const [selectedStill, setSelectedStill] = useState<PortfolioItem | ProjectAsset | null>(null);
  const [selectedFilm, setSelectedFilm] = useState<PortfolioItem | ProjectAsset | null>(null);
  const [selectedProject, setSelectedProject] = useState<PortfolioItem | null>(null);
  const [activeParentProject, setActiveParentProject] = useState<PortfolioItem | null>(null);

  const handleSelectItem = (item: PortfolioItem) => {
    if (item.type === "still") {
      setSelectedStill(item);
    } else if (item.type === "film") {
      setSelectedFilm(item);
    } else if (item.type === "project") {
      setSelectedProject(item);
    }
  };

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleProjectCreated = (newItem: PortfolioItem) => {
    setProjects((prev) => [newItem, ...prev]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#f5551d] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 border border-white/20">
          {toast}
        </div>
      )}

      {/* 1. Header & Modals matching Screenshot 3 */}
      <PortfolioHero
        workspace={workspace}
        portfolio={portfolio}
        onProjectCreated={handleProjectCreated}
        showFlash={showFlash}
      />

      {/* 2. Appearance Controls Card matching Screenshot 3 */}
      <AppearanceToolbar
        portfolioId={portfolio.id}
        initialAppearance={appearance}
        onAppearanceChange={setAppearance}
        showFlash={showFlash}
      />

      {/* 3. Featured Work Reel matching Screenshot 3 */}
      <FeaturedReel
        portfolioId={portfolio.id}
        initialProjects={projects}
        initialFeaturedIds={initialFeaturedIds}
        showFlash={showFlash}
        onSelectItem={handleSelectItem}
      />

      {/* 4. Showcase Work Grid matching Screenshot 4 */}
      <ShowcaseGrid
        portfolioId={portfolio.id}
        workspaceSlug={workspace.slug}
        projects={projects}
        initialFeaturedIds={initialFeaturedIds}
        appearance={appearance}
        showFlash={showFlash}
        onSelectItem={handleSelectItem}
      />

      {/* 5. Experience & Credentials Section */}
      <ExperienceSection
        portfolioId={portfolio.id}
        initialExperiences={portfolio.experience || []}
        showFlash={showFlash}
      />

      {/* 6. Still Lightbox Modal */}
      {selectedStill && (
        <StillLightboxModal
          item={selectedStill}
          onClose={() => {
            setSelectedStill(null);
            setActiveParentProject(null);
          }}
          onBack={
            activeParentProject
              ? () => {
                  setSelectedStill(null);
                  setSelectedProject(activeParentProject);
                }
              : undefined
          }
        />
      )}

      {/* 6. Film Video Player Modal */}
      {selectedFilm && (
        <FilmPlayerModal
          item={selectedFilm}
          onClose={() => {
            setSelectedFilm(null);
            setActiveParentProject(null);
          }}
          onBack={
            activeParentProject
              ? () => {
                  setSelectedFilm(null);
                  setSelectedProject(activeParentProject);
                }
              : undefined
          }
        />
      )}

      {/* 7. Project Exploration Modal */}
      {selectedProject && (
        <ProjectExplorerModal
          project={selectedProject}
          onClose={() => {
            setSelectedProject(null);
            setActiveParentProject(null);
          }}
          onSelectStill={(still) => {
            setActiveParentProject(selectedProject);
            setSelectedProject(null);
            setSelectedStill(still);
          }}
          onSelectFilm={(film) => {
            setActiveParentProject(selectedProject);
            setSelectedProject(null);
            setSelectedFilm(film);
          }}
        />
      )}
    </div>
  );
}


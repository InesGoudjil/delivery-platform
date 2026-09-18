"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { PortfolioAsset, PortfolioProject, FilmmakerProfile, PublicFeaturedItem } from "@/lib/portfolio-data";

interface PortfolioContextType {
  profile: FilmmakerProfile;
  projects: PortfolioProject[];
  assets: PortfolioAsset[];
  primaryFeatured: PublicFeaturedItem | null;
  activeStill: PortfolioAsset | null;
  setActiveStill: (still: PortfolioAsset | null) => void;
  activeFilm: PortfolioAsset | null;
  setActiveFilm: (film: PortfolioAsset | null) => void;
  selectedProject: PortfolioProject | null;
  setSelectedProject: (project: PortfolioProject | null) => void;
  isContactOpen: boolean;
  setIsContactOpen: (open: boolean) => void;
  openPrimaryFeatured: () => void;
  handleWhatsAppChat: (customText?: string) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

interface PortfolioProviderProps {
  children: ReactNode;
  profile: FilmmakerProfile;
  projects: PortfolioProject[];
  assets: PortfolioAsset[];
  primaryFeatured?: PublicFeaturedItem | null;
}

export function PortfolioProvider({
  children,
  profile,
  projects,
  assets,
  primaryFeatured = null,
}: PortfolioProviderProps) {
  const [activeStill, setActiveStill] = useState<PortfolioAsset | null>(null);
  const [activeFilm, setActiveFilm] = useState<PortfolioAsset | null>(null);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleWhatsAppChat = (customText?: string) => {
    const msg = encodeURIComponent(
      customText ||
        `Hi ${profile.name}! I saw your portfolio on CineSpace (@${profile.handle}) and would like to discuss booking a project.`
    );
    const cleanNumber = profile.whatsappNumber.replace(/[^0-9+]/g, "");
    window.open(`https://wa.me/${cleanNumber}?text=${msg}`, "_blank");
  };

  const openPrimaryFeatured = () => {
    if (primaryFeatured) {
      if (primaryFeatured.type === "film" && primaryFeatured.asset) {
        setActiveFilm(primaryFeatured.asset);
        return;
      }
      if (primaryFeatured.type === "still" && primaryFeatured.asset) {
        setActiveStill(primaryFeatured.asset);
        return;
      }
      if (primaryFeatured.type === "project" && primaryFeatured.project) {
        setSelectedProject(primaryFeatured.project);
        return;
      }
    }

    const featuredProject =
      projects.find((p) => p.id === profile.featuredProjectId) || projects[0];
    const featuredAsset =
      assets.find((a) => a.id === featuredProject?.cover) || assets[0];

    if (featuredAsset?.videoUrl) {
      setActiveFilm(featuredAsset);
    } else if (featuredProject) {
      setSelectedProject(featuredProject);
    } else {
      setIsContactOpen(true);
    }
  };

  return (
    <PortfolioContext.Provider
      value={{
        profile,
        projects,
        assets,
        primaryFeatured,
        activeStill,
        setActiveStill,
        activeFilm,
        setActiveFilm,
        selectedProject,
        setSelectedProject,
        isContactOpen,
        setIsContactOpen,
        openPrimaryFeatured,
        handleWhatsAppChat,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioModal() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolioModal must be used within a PortfolioProvider");
  }
  return context;
}

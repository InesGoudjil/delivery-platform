"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Upload,
  Plus,
  ExternalLink,
  Edit3,
} from "lucide-react";
import { UploadFilmModal } from "./upload-film-modal";
import { UploadProjectModal } from "./upload-project-modal";
import { PortfolioItem } from "../portfolio-client";
import { updatePortfolioAction } from "@/app/actions/portfolio";

interface PortfolioHeroProps {
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
    socialLinks?: Record<string, string | undefined>;
  };
  onProjectCreated?: (newItem: PortfolioItem) => void;
  showFlash: (msg: string) => void;
}

export function PortfolioHero({
  workspace,
  portfolio,
  onProjectCreated,
  showFlash,
}: PortfolioHeroProps) {
  const [showFilmModal, setShowFilmModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const handleAssetUploaded = (newItem: PortfolioItem) => {
    if (onProjectCreated) {
      onProjectCreated(newItem);
    }
  };

  return (
    <>
      {/* Upload Film/Still Glass Modal (Screenshot 1) */}
      <UploadFilmModal
        workspaceId={workspace.id}
        isOpen={showFilmModal}
        onClose={() => setShowFilmModal(false)}
        onAssetUploaded={handleAssetUploaded}
        showFlash={showFlash}
      />

      {/* Upload Project Glass Modal (Screenshot 2) */}
      <UploadProjectModal
        workspaceId={workspace.id}
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onProjectCreated={handleAssetUploaded}
        showFlash={showFlash}
      />

      {/* Top Header matching Screenshot 3 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-2 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#f5551d] tracking-wide">
              Your public page
            </span>
            <Link
              href={`/p/${workspace.slug}`}
              target="_blank"
              className="text-[11px] text-zinc-500 hover:text-[#f5551d] flex items-center gap-1 transition-colors"
              title="Preview public page"
            >
              <ExternalLink className="size-3" />
            </Link>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase font-heading">
            PORTFOLIO
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed max-w-xl">
            Manage the work potential clients see when they visit your public Work and Portfolio pages.
          </p>
        </div>

        {/* Action Buttons matching Screenshot 3 */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Button 1: Standalone Asset Upload (Film or Still) */}
          <button
            type="button"
            onClick={() => setShowFilmModal(true)}
            className="rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] text-white text-xs font-bold px-5 py-2.5 backdrop-blur-md transition-all shadow-sm flex items-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Upload className="size-3.5 text-[#f5551d]" />
            <span>UPLOAD FILM OR STILL</span>
          </button>

          {/* Button 2: Create Multi-Asset Project Container */}
          <button
            type="button"
            onClick={() => setShowProjectModal(true)}
            className="rounded-full bg-gradient-to-r from-[#b8481e] via-[#db5722] to-[#8d3615] hover:brightness-110 active:brightness-95 text-white text-xs font-extrabold px-5 py-2.5 transition-all shadow-lg shadow-orange-950/40 flex items-center gap-1.5 border border-white/20 cursor-pointer uppercase tracking-wider"
          >
            <Plus className="size-4 stroke-[3]" />
            <span>UPLOAD A PROJECT</span>
          </button>
        </div>
      </div>
    </>
  );
}

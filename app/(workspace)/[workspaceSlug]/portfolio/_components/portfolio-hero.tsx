"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Upload,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographyH1, TypographyLead } from "@/components/ui/typography";
import { UploadFilmModal } from "./upload-film-modal";
import { UploadProjectModal } from "./upload-project-modal";
import { PortfolioItem } from "../portfolio-client";
import { cn } from "@/lib/utils";

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
  features?: any;
  projectsCount?: number;
}

export function PortfolioHero({
  workspace,
  portfolio,
  onProjectCreated,
  showFlash,
  features,
  projectsCount = 0,
}: PortfolioHeroProps) {
  const [showFilmModal, setShowFilmModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const portfolioLimit = features?.portfolio_videos ?? 4;
  const isUnlimited = portfolioLimit === -1;
  const isAtLimit = !isUnlimited && projectsCount >= portfolioLimit;

  const handleAssetUploaded = (newItem: PortfolioItem) => {
    if (onProjectCreated) {
      onProjectCreated(newItem);
    }
  };

  return (
    <>
      {/* Upload Film/Still Glass Modal */}
      <UploadFilmModal
        workspaceId={workspace.id}
        isOpen={showFilmModal}
        onClose={() => setShowFilmModal(false)}
        onAssetUploaded={handleAssetUploaded}
        showFlash={showFlash}
        isAtLimit={isAtLimit}
        limit={portfolioLimit}
        workspaceSlug={workspace.slug}
      />

      {/* Upload Project Glass Modal */}
      <UploadProjectModal
        workspaceId={workspace.id}
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onProjectCreated={handleAssetUploaded}
        showFlash={showFlash}
        isAtLimit={isAtLimit}
        limit={portfolioLimit}
        workspaceSlug={workspace.slug}
      />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-2 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Avatar size="sm" className="ring-1 ring-white/20">
              {portfolio.coverAssetUrl && <AvatarImage src={portfolio.coverAssetUrl} alt={workspace.brandName} />}
              <AvatarFallback className="bg-[#2a1a15] text-[#f5551d] font-bold text-[10px]">
                {workspace.brandName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <Badge variant="orange" className="text-xs font-semibold tracking-wide">
              Your public page
            </Badge>

            {!isUnlimited && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-mono font-semibold",
                  isAtLimit
                    ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                    : "border-white/15 text-zinc-400"
                )}
              >
                {projectsCount} / {portfolioLimit} films
              </Badge>
            )}

            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href={`/p/${workspace.slug}`}
                    target="_blank"
                    className="text-xs text-zinc-400 hover:text-[#f5551d] flex items-center gap-1.5 transition-colors font-mono"
                  >
                    <span>/p/{workspace.slug}</span>
                    <ExternalLink className="size-3" />
                  </Link>
                }
              />
              <TooltipContent>
                Open live public portfolio in a new tab
              </TooltipContent>
            </Tooltip>
          </div>

          <TypographyH1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase font-heading">
            PORTFOLIO
          </TypographyH1>

          <TypographyLead className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed max-w-xl">
            Manage the work potential clients see when they visit your public Work and Portfolio pages.
          </TypographyLead>
        </div>

        {/* Action Buttons with Tooltips */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Button 1: Standalone Asset Upload */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilmModal(true)}
                  className="rounded-full border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-bold px-5 h-10 backdrop-blur-md transition-all shadow-sm flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Upload className="size-3.5 text-[#f5551d]" />
                  <span>UPLOAD FILM OR STILL</span>
                </Button>
              }
            />
            <TooltipContent>Upload a standalone film or high-res photograph</TooltipContent>
          </Tooltip>

          {/* Button 2: Create Multi-Asset Project Container */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  onClick={() => setShowProjectModal(true)}
                  className="rounded-full bg-gradient-to-r from-[#b8481e] via-[#db5722] to-[#8d3615] hover:brightness-110 active:brightness-95 text-white text-xs font-extrabold px-5 h-10 transition-all shadow-lg shadow-orange-950/40 flex items-center gap-1.5 border border-white/20 cursor-pointer uppercase tracking-wider"
                >
                  <Plus className="size-4 stroke-[3]" />
                  <span>UPLOAD A PROJECT</span>
                </Button>
              }
            />
            <TooltipContent>Create a multi-asset case study or campaign container</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );
}

"use client";

import React, { ReactNode } from "react";
import {
  X,
  Share2,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographyH3 } from "@/components/ui/typography";

export interface LightboxHeaderProps {
  title: string;
  isStill: boolean;
  fileSizeText?: string;
  activeVersionNumber: number;
  hasVersions: boolean;
  category?: string | null;
  displayAspectRatio: string;
  timecode?: string | null;
  status?: string | null;
  onToggleApproval?: () => void;
  onBack?: () => void;
  onClose: () => void;
  headerExtra?: ReactNode;
  showShareLink?: boolean;
  onShareLink?: () => void;
  showDownload?: boolean;
  onDownload?: () => void;
  showVersions?: boolean;
  canUploadVersion?: boolean;
  onToggleUploadZone?: () => void;
  isUploadingVersion?: boolean;
  showUploadZone?: boolean;
  nextVersionNumber?: number;
  onEditAsset?: () => void;
  onDeleteAsset?: () => void;
}

export function LightboxHeader({
  title,
  isStill,
  fileSizeText = "-- MB",
  activeVersionNumber,
  hasVersions,
  category,
  displayAspectRatio,
  timecode,
  status,
  onToggleApproval,
  onBack,
  onClose,
  headerExtra,
  showShareLink,
  onShareLink,
  showDownload,
  onDownload,
  showVersions,
  canUploadVersion,
  onToggleUploadZone,
  isUploadingVersion,
  showUploadZone,
  nextVersionNumber,
  onEditAsset,
  onDeleteAsset,
}: LightboxHeaderProps) {
  const typeLabel = isStill ? "Photo" : "Video";
  const eyebrow = `${typeLabel} · ${fileSizeText}`;

  return (
    <header className="flex items-start justify-between gap-4 pb-3 shrink-0">
      {/* Left Eyebrow & Title */}
      <div className="flex items-start gap-2.5 min-w-0">
        {onBack && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={onBack}
                  className="size-8 rounded-full bg-white/5 hover:bg-white/15 text-white cursor-pointer border border-white/10 shrink-0 mt-0.5"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Back</TooltipContent>
          </Tooltip>
        )}

        <div className="min-w-0 flex-1">
          {/* Eyebrow in coral/primary matching visual mockup */}
          <div className="text-[12px] font-semibold text-primary tracking-wide flex items-center gap-1.5">
            <span>{eyebrow}</span>
            {category && (
              <>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400 font-normal">{category}</span>
              </>
            )}
            {displayAspectRatio && (
              <>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400 font-normal">{displayAspectRatio}</span>
              </>
            )}
          </div>

          {/* Large Bold Title */}
          <TypographyH3 className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight truncate mt-0.5">
            {title}
          </TypographyH3>
        </div>
      </div>

      {/* Right Action Icons & Close Button */}
      <div className="flex items-center gap-1.5 shrink-0">
        {headerExtra}

        {showShareLink && onShareLink && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={onShareLink}
                  className="size-8.5 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white cursor-pointer border border-white/10 transition-colors"
                >
                  <Share2 className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Share link</TooltipContent>
          </Tooltip>
        )}

        {onDeleteAsset && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={onDeleteAsset}
                  className="size-8.5 rounded-full bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 cursor-pointer border border-white/10 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Delete deliverable</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors border border-white/5"
              >
                <X className="size-4.5" />
              </Button>
            }
          />
          <TooltipContent>Close preview (Esc)</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

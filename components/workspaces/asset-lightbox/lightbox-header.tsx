"use client";

import React, { ReactNode } from "react";
import {
  FileVideo,
  Image as ImageIcon,
  Check,
  X,
  Share2,
  Download,
  UploadCloud,
  Pencil,
  Trash2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographyH3, TypographyMuted } from "@/components/ui/typography";

export interface LightboxHeaderProps {
  title: string;
  isStill: boolean;
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
  const isApproved = status === "approved";

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 shrink-0">
      {/* Left Metadata & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="rounded-full bg-white/5 hover:bg-white/15 text-white text-xs font-semibold h-8 px-2.5 flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10 shrink-0"
                >
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              }
            />
            <TooltipContent>Return to project gallery</TooltipContent>
          </Tooltip>
        )}

        <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-primary">
          {isStill ? (
            <ImageIcon className="size-4.5" />
          ) : (
            <FileVideo className="size-4.5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <TypographyH3 className="font-heading font-bold text-base sm:text-lg text-white truncate max-w-[200px] sm:max-w-md">
              {title}
            </TypographyH3>
            {hasVersions && (
              <Badge variant="orange" className="text-[10px] font-mono font-bold px-2 py-0.5">
                V{activeVersionNumber}
              </Badge>
            )}
            {category && (
              <Badge variant="outline" className="text-[10px] font-mono text-zinc-400 border-white/15">
                {category}
              </Badge>
            )}
          </div>
          <TypographyMuted className="text-xs text-muted-foreground font-mono truncate flex items-center gap-1.5 mt-0.5">
            <span>Aspect: {displayAspectRatio}</span>
            <span>·</span>
            {timecode && (
              <>
                <span>{timecode}</span>
                <span>·</span>
              </>
            )}
            <span className="text-zinc-400">
              {isStill ? "Hi-Res Still" : "ProRes / Master Stream"}
            </span>
          </TypographyMuted>
        </div>
      </div>

      {/* Right Controls & Approval CTA */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-end">
        {/* Optional Custom Header Slot */}
        {headerExtra}

        {/* 🌟 Prominent Approval Toggle (Delivery Review Mode) */}
        {onToggleApproval && status && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  onClick={onToggleApproval}
                  size="sm"
                  className={`rounded-full text-xs font-bold px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5 h-8 transition-all ${
                    isApproved
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-500/60 shadow-sm shadow-emerald-950/40"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground border border-primary/30 shadow-md shadow-primary/25"
                  }`}
                >
                  {isApproved ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      <span>Approved</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>Mark Approved</span>
                    </>
                  )}
                </Button>
              }
            />
            <TooltipContent>
              {isApproved ? "Click to request revisions on this cut" : "Approve this asset version"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Upload New Version Button */}
        {showVersions && canUploadVersion && onToggleUploadZone && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onToggleUploadZone}
                  disabled={isUploadingVersion}
                  className={`rounded-full text-xs font-bold px-3 py-1.5 cursor-pointer flex items-center gap-1.5 h-8 transition-all ${
                    showUploadZone
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-primary/40 text-primary bg-primary/10 hover:bg-primary/20"
                  }`}
                >
                  <UploadCloud className="size-3.5 text-primary" />
                  <span className="hidden md:inline">
                    {showUploadZone ? "Close Upload" : `Upload V${nextVersionNumber || activeVersionNumber + 1}`}
                  </span>
                </Button>
              }
            />
            <TooltipContent>
              Upload a new revised cut or still (V{nextVersionNumber || activeVersionNumber + 1})
            </TooltipContent>
          </Tooltip>
        )}

        {/* Download Master Button */}
        {showDownload && onDownload && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  className="rounded-full border-white/20 text-white bg-white/5 hover:bg-white/15 text-xs font-bold px-3 py-1.5 cursor-pointer flex items-center gap-1.5 h-8 transition-colors"
                >
                  <Download className="size-3.5 text-primary" />
                  <span className="hidden lg:inline">Download</span>
                </Button>
              }
            />
            <TooltipContent>Download master media file to disk</TooltipContent>
          </Tooltip>
        )}

        {/* Share Link Button */}
        {showShareLink && onShareLink && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={onShareLink}
                  className="size-8 rounded-full bg-white/5 hover:bg-white/15 text-white cursor-pointer border border-white/10"
                >
                  <Share2 className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Copy shareable link</TooltipContent>
          </Tooltip>
        )}

        {/* Edit Metadata Button */}
        {onEditAsset && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={onEditAsset}
                  className="size-8 rounded-full border-white/15 text-white/80 hover:text-white bg-white/5 hover:bg-white/15 cursor-pointer"
                >
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Edit title and ratio</TooltipContent>
          </Tooltip>
        )}

        {/* Delete Asset Button */}
        {onDeleteAsset && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={onDeleteAsset}
                  className="size-8 rounded-full border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Delete deliverable</TooltipContent>
          </Tooltip>
        )}

        {/* Close Modal Button */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="size-8 sm:size-9 rounded-full bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white flex items-center justify-center cursor-pointer ml-1"
              >
                <X className="size-4 sm:size-5" />
              </Button>
            }
          />
          <TooltipContent>Close preview (Esc)</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

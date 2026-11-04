"use client";

import React from "react";
import { Star, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AssetVersionItem, FeedbackItem } from "./types";

export interface LightboxVersionBarProps {
  versions: AssetVersionItem[];
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
  allFeedback: FeedbackItem[];
  canMakeActive?: boolean;
  onMakeVersionActive?: (versionId: string, versionNumber: number) => void;
  canUploadVersion?: boolean;
  showUploadZone?: boolean;
  onToggleUploadZone?: () => void;
  isUploadingVersion?: boolean;
  nextVersionNumber?: number;
  onEditAsset?: () => void;
}

export function LightboxVersionBar({
  versions,
  selectedVersionId,
  onSelectVersion,
  allFeedback,
  canMakeActive = false,
  onMakeVersionActive,
  canUploadVersion = false,
  showUploadZone = false,
  onToggleUploadZone,
  isUploadingVersion = false,
  nextVersionNumber,
  onEditAsset,
}: LightboxVersionBarProps) {
  const canManage = Boolean(canMakeActive || onEditAsset);

  // If there are no multiple versions and cannot upload or manage versions, do not render
  if (versions.length <= 1 && !canUploadVersion && !canManage) return null;

  const currentVer =
    versions.find((v) => v.id === selectedVersionId) ||
    versions.find((v) => v.isActiveVersion) ||
    versions[versions.length - 1] ||
    versions[0] ||
    null;

  const isClientActive = Boolean(currentVer?.isActiveVersion);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* 1. Version Pills Row */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {versions.length > 0 ? (
          versions.map((ver) => {
            const isSelected = selectedVersionId === ver.id;
            const verFeedbackCount = allFeedback.filter(
              (f) => f.assetVersionId === ver.id || (!f.assetVersionId && ver.versionNumber === 1)
            ).length;

            return (
              <Button
                key={ver.id}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={() => onSelectVersion(ver.id)}
                className={`px-4 py-1.5 h-auto rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary/10 border border-primary text-primary shadow-sm"
                    : "bg-[#18181d] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>V{ver.versionNumber}</span>
                {canManage && ver.isActiveVersion && (
                  <span className="text-amber-400 text-[11px]" title="Active client version">
                    ★
                  </span>
                )}
                {canManage && verFeedbackCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-white/15 text-white"
                    }`}
                  >
                    {verFeedbackCount}
                  </span>
                )}
              </Button>
            );
          })
        ) : (
          <div className="px-4 py-1.5 h-auto rounded-full text-xs font-semibold bg-primary/10 border border-primary text-primary flex items-center gap-1.5">
            <span>V1</span>
          </div>
        )}

        {/* "+ Upload new version" Pill */}
        {canUploadVersion && onToggleUploadZone && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onToggleUploadZone}
            disabled={isUploadingVersion}
            className={`px-3.5 py-1.5 h-auto rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              showUploadZone
                ? "bg-primary text-primary-foreground border-primary"
                : "border-primary/50 text-primary bg-primary/5 hover:bg-primary/15"
            }`}
          >
            <Plus className="size-3.5" />
            <span>{showUploadZone ? "Close upload" : "+ Upload new version"}</span>
          </Button>
        )}
      </div>

      {/* 2. MANAGE VERSIONS Section (Only in workspace management mode) */}
      {canManage && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 select-none">
            MANAGE VERSIONS
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-white">
                V{currentVer?.versionNumber || 1}
              </span>
              {isClientActive && (
                <span className="text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/25">
                  ★ Client Active
                </span>
              )}
              {canMakeActive && !isClientActive && onMakeVersionActive && currentVer && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => onMakeVersionActive(currentVer.id, currentVer.versionNumber)}
                        className="text-[11px] text-zinc-400 hover:text-amber-300 flex items-center gap-1 h-auto p-0 cursor-pointer ml-1"
                      >
                        <Star className="size-3" />
                        <span>Make Active</span>
                      </Button>
                    }
                  />
                  <TooltipContent>
                    Set V{currentVer.versionNumber} as active version for client
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {onEditAsset && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={onEditAsset}
                      className="size-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors p-0"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>Edit deliverable details</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

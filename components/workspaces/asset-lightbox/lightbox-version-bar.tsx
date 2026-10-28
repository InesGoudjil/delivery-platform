"use client";

import React from "react";
import { Layers, Star, Plus } from "lucide-react";
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
}: LightboxVersionBarProps) {
  if (versions.length === 0 && !canUploadVersion) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-[#18181d] px-3 py-2 rounded-2xl border border-white/10 flex-wrap">
      {/* Version Pills List */}
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0 select-none">
          <Layers className="size-3.5 text-primary" />
          <span>Versions ({versions.length}):</span>
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          {versions.map((ver) => {
            const isSelected = selectedVersionId === ver.id;
            const isClientActive = Boolean(ver.isActiveVersion);
            const verFeedbackCount = allFeedback.filter(
              (f) => f.assetVersionId === ver.id || (!f.assetVersionId && ver.versionNumber === 1)
            ).length;

            return (
              <div key={ver.id} className="flex items-center gap-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => onSelectVersion(ver.id)}
                  className={`px-3 py-1 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 border-transparent"
                      : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span>V{ver.versionNumber}</span>
                  {isClientActive && (
                    <span
                      className="text-[10px] text-amber-300 font-bold flex items-center gap-0.5"
                      title="Active Version for Clients"
                    >
                      ★ <span className="hidden sm:inline text-[9px] uppercase">Active</span>
                    </span>
                  )}
                  {verFeedbackCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-white/15 text-white/90"
                      }`}
                    >
                      {verFeedbackCount}
                    </span>
                  )}
                </Button>

                {/* Star icon button to make selected non-active version active */}
                {canMakeActive && !isClientActive && isSelected && onMakeVersionActive && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onMakeVersionActive(ver.id, ver.versionNumber)}
                          className="size-7 text-muted-foreground hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          <Star className="size-3.5" />
                        </Button>
                      }
                    />
                    <TooltipContent>
                      Set V{ver.versionNumber} as active version for client review
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Next Version Action */}
      {canUploadVersion && onToggleUploadZone && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onToggleUploadZone}
          disabled={isUploadingVersion}
          className={`px-3 py-1 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            showUploadZone
              ? "bg-primary text-primary-foreground border-primary"
              : "border-dashed border-primary/40 text-primary bg-primary/5 hover:bg-primary/15"
          }`}
        >
          <Plus className="size-3" />
          <span>{showUploadZone ? "Close Upload" : `Upload V${nextVersionNumber || versions.length + 1}`}</span>
        </Button>
      )}
    </div>
  );
}

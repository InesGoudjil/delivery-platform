"use client";

import React from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  Maximize2,
  Minimize2,
  RotateCcw,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographySpan } from "@/components/ui/typography";

export interface ImageViewerHudProps {
  zoomLevel: number;
  rotation: number;
  isFlipped: boolean;
  isCommentMode?: boolean;
  onToggleCommentMode?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (zoom: number) => void;
  onRotate: () => void;
  onFlip: () => void;
  onReset: () => void;
  aspectRatioLabel?: string;
  commentsCount?: number;
}

export function ImageViewerHud({
  zoomLevel,
  rotation,
  isFlipped,
  isCommentMode = false,
  onToggleCommentMode,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onRotate,
  onFlip,
  onReset,
  aspectRatioLabel = "16:9",
  commentsCount = 0,
}: ImageViewerHudProps) {
  const zoomPercent = Math.round(zoomLevel * 100);
  const isTransformed = zoomLevel !== 1 || rotation !== 0 || isFlipped;

  return (
    <div className="bg-[#121215] border-t border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
      {/* Left: Metadata & Status */}
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] flex items-center gap-1.5 font-bold shadow-sm">
          <ImageIcon className="size-3.5" />
          <TypographySpan>STILL PHOTOGRAPHY</TypographySpan>
        </span>
        <span className="px-2 py-0.5 rounded-md text-[10px] text-muted-foreground bg-white/5 border border-white/10">
          <TypographySpan>{aspectRatioLabel}</TypographySpan>
        </span>
        {commentsCount > 0 && (
          <span className="px-2 py-0.5 rounded-md text-[10px] text-primary bg-primary/10 border border-primary/20 font-bold flex items-center gap-1">
            <MessageSquare className="size-3" />
            <TypographySpan>{commentsCount} {commentsCount === 1 ? "pin" : "pins"}</TypographySpan>
          </span>
        )}
      </div>

      {/* Center: Interactive Mode & Quick Presets */}
      <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-xl p-1">
        {onToggleCommentMode && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={isCommentMode ? "default" : "ghost"}
                  size="sm"
                  onClick={onToggleCommentMode}
                  className={`h-7 px-2.5 text-xs font-semibold rounded-lg cursor-pointer transition-all gap-1.5 ${
                    isCommentMode
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-zinc-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <MessageSquare className="size-3.5" />
                  <TypographySpan>Drop Pin</TypographySpan>
                </Button>
              }
            />
            <TooltipContent>
              {isCommentMode
                ? "Click anywhere on image to add pin feedback"
                : "Toggle spatial pin commenting"}
            </TooltipContent>
          </Tooltip>
        )}

        <div className="h-4 w-px bg-white/10 mx-0.5" />

        <Button
          type="button"
          variant={zoomLevel === 1 ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSetZoom(1)}
          className="h-7 px-2.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white cursor-pointer"
        >
          <TypographySpan>Fit</TypographySpan>
        </Button>
        <Button
          type="button"
          variant={zoomLevel === 1.5 ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSetZoom(1.5)}
          className="h-7 px-2.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white cursor-pointer"
        >
          <TypographySpan>100%</TypographySpan>
        </Button>
        <Button
          type="button"
          variant={zoomLevel === 2 ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSetZoom(2)}
          className="h-7 px-2.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white cursor-pointer"
        >
          <TypographySpan>200%</TypographySpan>
        </Button>
      </div>

      {/* Right: Fine-Grain Zoom, Rotation, and Reset */}
      <div className="flex items-center gap-1">
        {/* Zoom Stepper */}
        <div className="flex items-center bg-black/60 border border-white/10 rounded-lg p-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={onZoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="size-7 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>

          <span className="px-2 text-[10px] text-white font-mono font-bold min-w-[44px] text-center">
            {zoomPercent}%
          </span>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={onZoomIn}
                  disabled={zoomLevel >= 4}
                  className="size-7 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
        </div>

        {/* Rotate 90 deg */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onRotate}
                className="size-7 rounded-lg bg-black/60 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <RotateCw className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent>Rotate 90° Clockwise</TooltipContent>
        </Tooltip>

        {/* Flip Horizontal */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onFlip}
                className={`size-7 rounded-lg bg-black/60 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer ${
                  isFlipped ? "text-primary border-primary/40 bg-primary/10" : ""
                }`}
              >
                <FlipHorizontal className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent>Flip Horizontal</TooltipContent>
        </Tooltip>

        {/* Reset Transform */}
        {isTransformed && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={onReset}
                  className="size-7 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 cursor-pointer animate-in fade-in"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Reset View (Fit &amp; 0°)</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

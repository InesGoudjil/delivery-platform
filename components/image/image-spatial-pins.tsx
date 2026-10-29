"use client";

import React from "react";
import { MessageSquare, Check } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographySpan } from "@/components/ui/typography";
import type { ImageCommentMarker } from "./types";

interface ImageSpatialPinsProps {
  comments?: ImageCommentMarker[];
  activeCommentId?: string | null;
  onCommentSelect?: (id: string) => void;
  scale?: number;
}

export function ImageSpatialPins({
  comments = [],
  activeCommentId,
  onCommentSelect,
  scale = 1,
}: ImageSpatialPinsProps) {
  if (comments.length === 0) return null;

  // Counteract container zoom scale so pins maintain a readable size on screen
  const pinInverseScale = Math.max(0.5, Math.min(1.2, 1 / Math.sqrt(scale)));

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {comments.map((marker, idx) => {
        const isActive = activeCommentId === marker.id;
        const isResolved = marker.isResolved;

        return (
          <div
            key={marker.id}
            style={{
              left: `${marker.xPercent}%`,
              top: `${marker.yPercent}%`,
              transform: `translate(-50%, -50%) scale(${pinInverseScale})`,
              transformOrigin: "center center",
            }}
            className="absolute pointer-events-auto"
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCommentSelect?.(marker.id);
                    }}
                    className={`group/pin relative flex items-center justify-center size-7 rounded-full shadow-2xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/40 scale-110 shadow-primary/40"
                        : isResolved
                        ? "bg-emerald-600 text-white border border-white/20 opacity-80 hover:opacity-100 hover:scale-105"
                        : "bg-black/85 text-white border border-white/25 hover:border-primary hover:bg-black hover:scale-105"
                    }`}
                  >
                    {isResolved ? (
                      <Check className="size-3.5 stroke-[2.5]" />
                    ) : (
                      <span className="text-[11px] font-black tracking-tight">
                        {idx + 1}
                      </span>
                    )}

                    {/* Active pulse ring */}
                    {isActive && (
                      <span className="absolute -inset-1 rounded-full bg-primary/30 animate-ping -z-10" />
                    )}
                  </button>
                }
              />
              <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 font-bold">
                  <TypographySpan className="text-zinc-200">
                    {marker.authorName || `Comment #${idx + 1}`}
                  </TypographySpan>
                  {isResolved && (
                    <span className="text-[9px] text-emerald-400 font-semibold uppercase">
                      Resolved
                    </span>
                  )}
                </div>
                {marker.commentText && (
                  <p className="text-zinc-300 font-normal line-clamp-2">
                    {marker.commentText}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}

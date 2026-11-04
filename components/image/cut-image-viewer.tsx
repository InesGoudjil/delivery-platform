"use client";

import React, {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import { motion } from "framer-motion";
import { Maximize, Minimize } from "lucide-react";
import { WatermarkOverlay } from "@/components/ui/watermark-overlay";
import {
  getMediaBoundingStyles,
  detectAspectRatioFromDimensions,
} from "@/lib/media-ratios";
import { resolveMediaUrl } from "@/lib/media";
import { ImageSpatialPins } from "./image-spatial-pins";
import type {
  CutImageViewerProps,
  CutImageViewerRef,
} from "./types";

export const CutImageViewer = forwardRef<CutImageViewerRef, CutImageViewerProps>(
  (
    {
      src,
      title,
      aspectRatio = "16:9",
      comments = [],
      activeCommentId,
      onCommentSelect,
      onAddCommentPin,
      isCommentMode = false,
      showWatermark = false,
      watermarkText = "STUDIO PREVIEW",
      className = "",
    },
    ref
  ) => {
    const resolvedSrc = resolveMediaUrl(src);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const [zoomLevel, setZoomLevel] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [detectedRatio, setDetectedRatio] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const activeRatio = detectedRatio || aspectRatio || "16:9";
    const bounding = getMediaBoundingStyles(activeRatio);

    // Reset detected ratio on src/aspectRatio change
    useEffect(() => {
      setDetectedRatio(null);
      setZoomLevel(1);
      setRotation(0);
      setIsFlipped(false);
    }, [src, aspectRatio]);

    // Fullscreen change listener
    useEffect(() => {
      const handleFsChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement));
      };
      document.addEventListener("fullscreenchange", handleFsChange);
      return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }, []);

    const handleZoomIn = useCallback(() => {
      setZoomLevel((prev) => Math.min(4, Math.round((prev + 0.25) * 100) / 100));
    }, []);

    const handleZoomOut = useCallback(() => {
      setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100));
    }, []);

    const handleReset = useCallback(() => {
      setZoomLevel(1);
      setRotation(0);
      setIsFlipped(false);
    }, []);

    const handleRotate = useCallback(() => {
      setRotation((prev) => (prev + 90) % 360);
    }, []);

    const handleFlip = useCallback(() => {
      setIsFlipped((prev) => !prev);
    }, []);

    const handleSetZoom = useCallback((zoom: number) => {
      setZoomLevel(Math.max(0.5, Math.min(4, zoom)));
    }, []);

    // Wheel zoom handling
    const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey || zoomLevel > 1) {
        e.preventDefault();
        const delta = e.deltaY * -0.002;
        setZoomLevel((prev) => Math.max(0.5, Math.min(4, Math.round((prev + delta) * 100) / 100)));
      }
    };

    // Double-click toggle: Fit (1x) <-> 2x
    const handleDoubleClick = (e: React.MouseEvent) => {
      if (isCommentMode) return;
      e.preventDefault();
      setZoomLevel((prev) => (prev > 1.2 ? 1 : 2));
    };

    // Click-to-pin calculation
    const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCommentMode || !onAddCommentPin || !imageRef.current) return;

      const rect = imageRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (clickX >= 0 && clickX <= rect.width && clickY >= 0 && clickY <= rect.height) {
        const xPercent = Math.round((clickX / rect.width) * 1000) / 10;
        const yPercent = Math.round((clickY / rect.height) * 1000) / 10;
        onAddCommentPin(xPercent, yPercent);
      }
    };

    // Expose ref API
    useImperativeHandle(
      ref,
      () => ({
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
        reset: handleReset,
        rotate: (dir = 1) => setRotation((prev) => (prev + (dir === 1 ? 90 : -90) + 360) % 360),
        flipHorizontal: handleFlip,
        setZoom: handleSetZoom,
        getZoom: () => zoomLevel,
      }),
      [handleZoomIn, handleZoomOut, handleReset, handleFlip, handleSetZoom, zoomLevel]
    );

    return (
      <div
        ref={containerRef}
        className={`group/image-viewer relative flex flex-col bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl select-none w-full h-full ${className}`}
      >
        {/* Viewport Stage */}
        <div
          style={bounding.style}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onContextMenu={(e) => {
            if (showWatermark) e.preventDefault();
          }}
          className={`relative overflow-hidden bg-black flex items-center justify-center w-full h-full ${
            isCommentMode
              ? "cursor-crosshair"
              : zoomLevel > 1
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-default"
          } ${bounding.className}`}
        >
          {/* Framer Motion Pan & Zoom Canvas */}
          <motion.div
            drag={zoomLevel > 1 && !isCommentMode}
            dragConstraints={containerRef}
            dragElastic={0.08}
            onDoubleClick={handleDoubleClick}
            animate={{
              scale: zoomLevel,
              rotate: rotation,
              scaleX: isFlipped ? -zoomLevel : zoomLevel,
            }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="relative flex items-center justify-center max-w-full max-h-full"
          >
            <img
              ref={imageRef}
              src={resolvedSrc || src}
              alt={title || "Still Asset"}
              draggable={false}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/api/media/placeholder.svg";
              }}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (
                  img.naturalWidth &&
                  img.naturalHeight &&
                  (!aspectRatio || aspectRatio === "16:9")
                ) {
                  const detected = detectAspectRatioFromDimensions(
                    img.naturalWidth,
                    img.naturalHeight
                  );
                  if (detected.id !== "16:9") {
                    setDetectedRatio(detected.id === "custom" ? detected.cssRatio : detected.id);
                  }
                }
              }}
              className="max-w-full max-h-full object-contain pointer-events-none select-none shadow-2xl"
            />

            {/* Spatial Feedback Pin Layer */}
            <ImageSpatialPins
              comments={comments}
              activeCommentId={activeCommentId}
              onCommentSelect={onCommentSelect}
              scale={zoomLevel}
            />
          </motion.div>

          {/* Watermark Overlay */}
          {showWatermark && (
            <WatermarkOverlay
              text={watermarkText}
              variant="player"
              showBadge
              className="pointer-events-none z-10"
            />
          )}

          {/* Clean, discreet Fullscreen Button (Bottom Right) */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute bottom-3 right-3 z-30 size-8 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-md border border-white/15 flex items-center justify-center cursor-pointer transition-all shadow-lg opacity-70 hover:opacity-100"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </div>
    );
  }
);

CutImageViewer.displayName = "CutImageViewer";

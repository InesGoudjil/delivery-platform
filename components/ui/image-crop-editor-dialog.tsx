"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  SlidersHorizontal,
  RotateCwSquare,
  Check,
  X,
  Loader2,
  Move,
  Sparkles,
} from "lucide-react";
import {
  UniversalDialogRoot,
  UniversalDialogContent,
} from "@/components/ui/universal-dialog";
import { Button } from "@/components/ui/button";

export type CropAspectRatioPreset =
  | "1:1"
  | "3:1"
  | "16:9"
  | "16:10"
  | "4:3"
  | "4:5"
  | "9:16"
  | "2.39:1";

export interface ImageCropResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  aspectRatio: CropAspectRatioPreset;
}

export interface ImageCropEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  title?: string;
  subtitle?: string;
  defaultAspectRatio?: CropAspectRatioPreset;
  aspectRatioOptions?: CropAspectRatioPreset[];
  lockAspectRatio?: boolean;
  circularGuide?: boolean;
  outputFileName?: string;
  onApply: (result: ImageCropResult) => void | Promise<void>;
}

const ASPECT_RATIO_CONFIG: Record<
  CropAspectRatioPreset,
  { label: string; numeric: number; outputWidth: number; outputHeight: number }
> = {
  "1:1": { label: "1:1 Square", numeric: 1, outputWidth: 800, outputHeight: 800 },
  "3:1": { label: "3:1 Banner", numeric: 3, outputWidth: 1920, outputHeight: 640 },
  "16:9": { label: "16:9 Wide", numeric: 16 / 9, outputWidth: 1920, outputHeight: 1080 },
  "16:10": { label: "16:10 Laptop", numeric: 16 / 10, outputWidth: 1920, outputHeight: 1200 },
  "4:3": { label: "4:3 Standard", numeric: 4 / 3, outputWidth: 1440, outputHeight: 1080 },
  "4:5": { label: "4:5 Portrait", numeric: 4 / 5, outputWidth: 1080, outputHeight: 1350 },
  "9:16": { label: "9:16 Vertical", numeric: 9 / 16, outputWidth: 1080, outputHeight: 1920 },
  "2.39:1": { label: "2.39:1 Scope", numeric: 2.3869, outputWidth: 1920, outputHeight: 804 },
};

export function ImageCropEditorDialog({
  isOpen,
  onClose,
  imageSrc,
  title = "EDIT & CROP IMAGE",
  subtitle = "Drag to reposition, zoom, rotate, or fine-tune color before applying.",
  defaultAspectRatio = "16:9",
  aspectRatioOptions = ["16:9", "3:1", "1:1", "4:3", "9:16"],
  lockAspectRatio = false,
  circularGuide = false,
  outputFileName = "cropped-image.jpg",
  onApply,
}: ImageCropEditorDialogProps) {
  const [aspectRatio, setAspectRatio] = useState<CropAspectRatioPreset>(defaultAspectRatio);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [activeTab, setActiveTab] = useState<"transform" | "adjust">("transform");

  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [isLoadingImg, setIsLoadingImg] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null
  );

  // Reset state whenever modal opens with a new image or defaultAspectRatio
  useEffect(() => {
    if (isOpen) {
      setAspectRatio(defaultAspectRatio);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setActiveTab("transform");
    }
  }, [isOpen, imageSrc, defaultAspectRatio]);

  // Load HTMLImageElement safely (handling data URLs, blob URLs, and remote URLs)
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setLoadedImg(null);
      return;
    }

    let isCancelled = false;
    let revokeUrl: string | null = null;
    setIsLoadingImg(true);
    setLoadError(null);

    const loadFromUrl = (url: string, withCors: boolean) => {
      const img = new window.Image();
      if (withCors && !url.startsWith("data:") && !url.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        if (isCancelled) return;
        setLoadedImg(img);
        setIsLoadingImg(false);
      };
      img.onerror = async () => {
        if (isCancelled) return;
        // Fallback: try fetching as blob if direct crossOrigin load failed
        if (withCors && !url.startsWith("data:") && !url.startsWith("blob:")) {
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            revokeUrl = URL.createObjectURL(blob);
            loadFromUrl(revokeUrl, false);
            return;
          } catch {
            // Final fallback: load without crossOrigin
            loadFromUrl(url, false);
            return;
          }
        }
        setLoadError("Unable to load image for editing.");
        setIsLoadingImg(false);
      };
      img.src = url;
    };

    loadFromUrl(imageSrc, true);

    return () => {
      isCancelled = true;
      if (revokeUrl) {
        URL.revokeObjectURL(revokeUrl);
      }
    };
  }, [isOpen, imageSrc]);

  // Compute preview canvas dimensions that fit neatly inside the dialog stage
  const getPreviewDimensions = useCallback((preset: CropAspectRatioPreset) => {
    const maxStageWidth = 480;
    const maxStageHeight = 270;
    const numeric = ASPECT_RATIO_CONFIG[preset].numeric;

    let width = maxStageWidth;
    let height = Math.round(width / numeric);

    if (height > maxStageHeight) {
      height = maxStageHeight;
      width = Math.round(height * numeric);
    }

    return { width, height };
  }, []);

  const previewDims = getPreviewDimensions(aspectRatio);

  // Clamp pan offset so the image always covers the crop viewport
  const clampPan = useCallback(
    (rawPan: { x: number; y: number }, currentZoom: number, currentRotation: number) => {
      if (!loadedImg) return { x: 0, y: 0 };

      const isRotated90 = Math.abs(currentRotation) % 180 === 90;
      const effW = isRotated90 ? loadedImg.naturalHeight : loadedImg.naturalWidth;
      const effH = isRotated90 ? loadedImg.naturalWidth : loadedImg.naturalHeight;

      const baseScale = Math.max(previewDims.width / effW, previewDims.height / effH);
      const dispW = effW * baseScale * currentZoom;
      const dispH = effH * baseScale * currentZoom;

      const maxPanX = Math.max(0, (dispW - previewDims.width) / 2);
      const maxPanY = Math.max(0, (dispH - previewDims.height) / 2);

      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, rawPan.x)),
        y: Math.min(maxPanY, Math.max(-maxPanY, rawPan.y)),
      };
    },
    [loadedImg, previewDims.width, previewDims.height]
  );

  // Re-clamp pan whenever zoom, rotation, or aspect ratio changes
  useEffect(() => {
    setPan((prev) => clampPan(prev, zoom, rotation));
  }, [zoom, rotation, aspectRatio, clampPan]);

  // Shared rendering function for both live preview canvas and high-res export canvas
  const renderToCanvas = useCallback(
    (canvas: HTMLCanvasElement, targetWidth: number, targetHeight: number) => {
      if (!loadedImg) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const isRotated90 = Math.abs(rotation) % 180 === 90;
      const effW = isRotated90 ? loadedImg.naturalHeight : loadedImg.naturalWidth;
      const effH = isRotated90 ? loadedImg.naturalWidth : loadedImg.naturalHeight;

      const baseScale = Math.max(targetWidth / effW, targetHeight / effH);
      const clamped = clampPan(pan, zoom, rotation);
      const scaleRatio = targetWidth / previewDims.width;

      ctx.save();
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

      ctx.translate(
        targetWidth / 2 + clamped.x * scaleRatio,
        targetHeight / 2 + clamped.y * scaleRatio
      );
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.rotate((rotation * Math.PI) / 180);

      const drawW = loadedImg.naturalWidth * baseScale * zoom;
      const drawH = loadedImg.naturalHeight * baseScale * zoom;
      ctx.drawImage(loadedImg, -drawW / 2, -drawH / 2, drawW, drawH);

      ctx.restore();
    },
    [
      loadedImg,
      rotation,
      pan,
      zoom,
      previewDims.width,
      brightness,
      contrast,
      saturation,
      flipH,
      flipV,
      clampPan,
    ]
  );

  // Draw live preview whenever parameters change
  useEffect(() => {
    if (!previewCanvasRef.current || !loadedImg) return;
    renderToCanvas(previewCanvasRef.current, previewDims.width, previewDims.height);
  }, [loadedImg, previewDims.width, previewDims.height, renderToCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!loadedImg) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setPan(
      clampPan(
        {
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy,
        },
        zoom,
        rotation
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(3, Math.max(1, Number((prev + delta).toFixed(2)))));
  };

  const handleResetAll = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const handleApplyCrop = async () => {
    if (!loadedImg || isApplying) return;
    setIsApplying(true);
    try {
      const config = ASPECT_RATIO_CONFIG[aspectRatio];
      const exportCanvas = document.createElement("canvas");
      renderToCanvas(exportCanvas, config.outputWidth, config.outputHeight);

      const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.92);
      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to encode cropped image"));
          },
          "image/jpeg",
          0.92
        );
      });

      const cleanName = outputFileName.replace(/\.[^/.]+$/, "") + ".jpg";
      const file = new File([blob], cleanName, { type: "image/jpeg" });

      await onApply({
        file,
        blob,
        dataUrl,
        aspectRatio,
      });
      onClose();
    } catch (err: any) {
      setLoadError(err?.message || "Failed to export edited image.");
    } finally {
      setIsApplying(false);
    }
  };

  const showAspectSwitcher = !lockAspectRatio && aspectRatioOptions.length > 1;

  return (
    <UniversalDialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <UniversalDialogContent
        size="xl"
        showCloseButton={false}
        overlayClassName="z-[60]"
        className="z-[60] p-5 sm:p-6 w-full max-w-xl space-y-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Crop className="size-4 text-primary" />
              <h3 className="text-base sm:text-lg font-black font-heading tracking-wide uppercase text-white">
                {title}
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="size-4" />
          </Button>
        </div>

        {loadError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {loadError}
          </div>
        )}

        {/* Interactive Crop Stage */}
        <div className="relative w-full h-[290px] rounded-2xl bg-[#08080a] border border-white/10 flex items-center justify-center overflow-hidden select-none">
          {isLoadingImg ? (
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs ">Loading image...</span>
            </div>
          ) : loadedImg ? (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              style={{
                width: `${previewDims.width}px`,
                height: `${previewDims.height}px`,
              }}
              className={`relative rounded-xl overflow-hidden shadow-2xl ring-2 ring-primary/80 transition-shadow ${
                isDragging ? "cursor-grabbing ring-primary" : "cursor-grab"
              }`}
            >
              <canvas
                ref={previewCanvasRef}
                width={previewDims.width}
                height={previewDims.height}
                className="w-full h-full block pointer-events-none"
              />

              {/* Rule of Thirds Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>

              {/* Optional Avatar Squircle / Circle Safe-Zone Guide */}
              {(circularGuide || aspectRatio === "1:1") && (
                <div className="absolute inset-2 rounded-3xl border-2 border-dashed border-white/40 pointer-events-none" />
              )}

              {/* Drag Hint Pill */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px]  text-white/90 flex items-center gap-1.5 pointer-events-none shadow-md">
                <Move className="size-3 text-primary" />
                <span>Drag to pan · Scroll to zoom</span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">No image selected</span>
          )}
        </div>

        {/* Aspect Ratio Selector (when unlocked) */}
        {showAspectSwitcher && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px]  uppercase tracking-widest text-zinc-400">
              Aspect Ratio
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {aspectRatioOptions.map((preset) => {
                const isSelected = aspectRatio === preset;
                return (
                  <Button
                    key={preset}
                    type="button"
                    size="xs"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => setAspectRatio(preset)}
                    className={`h-7 px-2.5 rounded-lg text-[11px]  transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold border-primary shadow-sm hover:bg-primary/90"
                        : "bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {ASPECT_RATIO_CONFIG[preset].label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode Switcher Tabs: Transform vs Color Adjust */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="xs"
              variant={activeTab === "transform" ? "default" : "ghost"}
              onClick={() => setActiveTab("transform")}
              className={`h-7 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "transform"
                  ? "bg-white text-black hover:bg-white/90"
                  : "text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10"
              }`}
            >
              <RotateCwSquare className="size-3.5" />
              <span>Crop &amp; Transform</span>
            </Button>
            <Button
              type="button"
              size="xs"
              variant={activeTab === "adjust" ? "default" : "ghost"}
              onClick={() => setActiveTab("adjust")}
              className={`h-7 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "adjust"
                  ? "bg-white text-black hover:bg-white/90"
                  : "text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10"
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Tone &amp; Color</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleResetAll}
            className="h-auto py-1 px-2 text-[11px]  text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Reset All
          </Button>
        </div>

        {/* Controls Panel */}
        {activeTab === "transform" ? (
          <div className="space-y-3.5">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => setZoom((z) => Math.max(1, Number((z - 0.1).toFixed(2))))}
                className="size-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <div className="flex-1 flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.02}
                  value={zoom}
                  onChange={(e) => setZoom( parseFloat(e.target.value) )}
                  className="w-full accent-primary cursor-pointer h-1.5 bg-white/15 rounded-lg"
                />
                <span className="text-xs  text-zinc-300 w-12 text-right">
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
                className="size-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="size-3.5" />
              </Button>
            </div>

            {/* Rotate & Flip Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation((r) => (r - 90) % 360)}
                className="rounded-xl bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200 text-xs font-semibold h-9 gap-1.5 cursor-pointer"
              >
                <RotateCcw className="size-3.5 text-primary" />
                <span>-90°</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="rounded-xl bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200 text-xs font-semibold h-9 gap-1.5 cursor-pointer"
              >
                <RotateCw className="size-3.5 text-primary" />
                <span>+90°</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFlipH((f) => !f)}
                className={`rounded-xl border-white/10 text-xs font-semibold h-9 gap-1.5 cursor-pointer ${
                  flipH
                    ? "bg-primary/20 border-primary/50 text-white"
                    : "bg-white/5 hover:bg-white/10 text-zinc-200"
                }`}
              >
                <FlipHorizontal2 className="size-3.5 text-primary" />
                <span>Flip H</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFlipV((f) => !f)}
                className={`rounded-xl border-white/10 text-xs font-semibold h-9 gap-1.5 cursor-pointer ${
                  flipV
                    ? "bg-primary/20 border-primary/50 text-white"
                    : "bg-white/5 hover:bg-white/10 text-zinc-200"
                }`}
              >
                <FlipVertical2 className="size-3.5 text-primary" />
                <span>Flip V</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Brightness */}
            <div className="flex items-center gap-3">
              <span className="text-[11px]  text-zinc-400 w-20">Brightness</span>
              <input
                type="range"
                min={50}
                max={150}
                step={1}
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                className="flex-1 accent-primary cursor-pointer h-1.5 bg-white/15 rounded-lg"
              />
              <span className="text-[11px]  text-zinc-300 w-10 text-right">
                {brightness}%
              </span>
            </div>

            {/* Contrast */}
            <div className="flex items-center gap-3">
              <span className="text-[11px]  text-zinc-400 w-20">Contrast</span>
              <input
                type="range"
                min={50}
                max={150}
                step={1}
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                className="flex-1 accent-primary cursor-pointer h-1.5 bg-white/15 rounded-lg"
              />
              <span className="text-[11px]  text-zinc-300 w-10 text-right">
                {contrast}%
              </span>
            </div>

            {/* Saturation */}
            <div className="flex items-center gap-3">
              <span className="text-[11px]  text-zinc-400 w-20">Saturation</span>
              <input
                type="range"
                min={0}
                max={200}
                step={1}
                value={saturation}
                onChange={(e) => setSaturation(parseInt(e.target.value, 10))}
                className="flex-1 accent-primary cursor-pointer h-1.5 bg-white/15 rounded-lg"
              />
              <span className="text-[11px]  text-zinc-300 w-10 text-right">
                {saturation}%
              </span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="text-[10px]  text-zinc-500 flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" />
            <span>
              Output: {ASPECT_RATIO_CONFIG[aspectRatio].outputWidth}×
              {ASPECT_RATIO_CONFIG[aspectRatio].outputHeight}px HQ
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isApplying}
              className="rounded-full text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-semibold px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyCrop}
              disabled={!loadedImg || isApplying}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-6 py-2.5 h-auto shadow-lg shadow-primary/25 cursor-pointer flex items-center gap-1.5"
            >
              {isApplying ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>APPLY &amp; SAVE</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </UniversalDialogContent>
    </UniversalDialogRoot>
  );
}

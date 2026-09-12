"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  Film,
  Image as ImageIcon,
  FolderKanban,
  ExternalLink,
  Download,
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize2,
  Loader2,
} from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { PortfolioItem, ProjectAsset } from "../portfolio-client";
import { getProjectAssetsAction } from "@/app/actions/portfolio";
import { resolveMediaUrl } from "@/lib/media";

// ==========================================
// 1. STILL LIGHTBOX MODAL (Image Full View)
// ==========================================
interface StillLightboxModalProps {
  item: PortfolioItem | ProjectAsset | null;
  onClose: () => void;
  onBack?: () => void;
}

export function StillLightboxModal({
  item,
  onClose,
  onBack,
}: StillLightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onBack) onBack();
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onBack]);

  if (!item) return null;

  const fallbackUnsplash = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&q=80";
  const rawUrl =
    ("mediaUrl" in item && item.mediaUrl ? item.mediaUrl : null) ||
    ("url" in item && item.url ? item.url : null) ||
    item.thumbnailUrl ||
    fallbackUnsplash;
  const primaryUrl = resolveMediaUrl(rawUrl) || fallbackUnsplash;

  const [currentSrc, setCurrentSrc] = useState(primaryUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(primaryUrl);
    setIsLoading(true);
    setHasError(false);
  }, [primaryUrl]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="w-full max-w-6xl flex items-center justify-between z-10 py-2 border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Return to project"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Back to Project</span>
            </button>
          )}

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-white uppercase tracking-wider">
            <ImageIcon className="size-3 text-zinc-300" />
            <span>STILL</span>
          </span>

          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-bold text-white font-heading truncate max-w-xs sm:max-w-md">
              {item.title}
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              {"category" in item && item.category ? item.category : "Photo Still"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {currentSrc && (
            <a
              href={currentSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Open full resolution in new tab"
            >
              <ExternalLink className="size-4" />
            </a>
          )}

          <button
            onClick={onClose}
            className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close image view"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 w-full max-w-6xl flex items-center justify-center p-2 sm:p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-h-[82vh] max-w-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black/60 min-w-[280px] min-h-[200px]">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 z-10">
              <Loader2 className="size-8 animate-spin text-[#f5551d]" />
              <span className="text-[11px] font-mono text-zinc-400">Loading high-resolution still...</span>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={item.title}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              const fallbackThumb = resolveMediaUrl(item.thumbnailUrl);
              if (currentSrc !== fallbackThumb && fallbackThumb) {
                setCurrentSrc(fallbackThumb);
              } else if (currentSrc !== fallbackUnsplash) {
                setCurrentSrc(fallbackUnsplash);
              } else {
                setHasError(true);
                setIsLoading(false);
              }
            }}
            className={`max-h-[82vh] max-w-full object-contain rounded-2xl select-none transition-opacity duration-200 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
          />

          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-zinc-400">
              <ImageIcon className="size-10 text-zinc-600" />
              <span className="text-xs">Unable to load image file.</span>
            </div>
          )}
        </div>
      </div>


      {/* Bottom Information Footer */}
      <div
        className="w-full max-w-6xl flex items-center justify-between text-xs text-zinc-500 font-mono py-2 border-t border-white/10 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <span>CUT High-Res Still Showcase</span>
        <span>Press ESC to exit</span>
      </div>
    </div>
  );
}

// ==========================================
// 2. FILM PLAYER MODAL (Video Playback Dialog)
// ==========================================
interface FilmPlayerModalProps {
  item: PortfolioItem | ProjectAsset | null;
  onClose: () => void;
  onBack?: () => void;
}

export function FilmPlayerModal({
  item,
  onClose,
  onBack,
}: FilmPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onBack) onBack();
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onBack]);

  if (!item) return null;

  const rawUrl =
    ("url" in item && item.url ? item.url : null) ||
    ("mediaUrl" in item && item.mediaUrl ? item.mediaUrl : null) ||
    "";
  const videoUrl = resolveMediaUrl(rawUrl);
  const posterUrl = resolveMediaUrl(item.thumbnailUrl);

  const isPlayableVideo =
    videoUrl &&
    (videoUrl.endsWith(".mp4") ||
      videoUrl.endsWith(".mov") ||
      videoUrl.endsWith(".webm") ||
      videoUrl.endsWith(".m4v") ||
      videoUrl.includes(".m3u8") ||
      videoUrl.startsWith("blob:") ||
      videoUrl.includes("cloudflarestream.com") ||
      videoUrl.includes("video") ||
      videoUrl.startsWith("/api/media/"));

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#121215]/95 border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-white relative"
        style={{
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Return to project"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">Back to Project</span>
              </button>
            )}

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f5551d]/20 border border-[#f5551d]/40 text-[10px] font-mono font-bold text-[#f5551d] uppercase tracking-wider">
              <Film className="size-3" />
              <span>FILM</span>
            </span>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-heading">
                {item.title}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                {"category" in item && item.category ? item.category : "Film Cut"} · 4K Stream
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close video player"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Video Stage */}
        <div className="aspect-video rounded-2xl bg-black overflow-hidden relative border border-white/10 shadow-2xl flex items-center justify-center">
          {isPlayableVideo ? (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={posterUrl}
              controls
              autoPlay
              playsInline
              className="size-full object-contain"
            />
          ) : (
            // Simulated Player for demo items or assets pending stream transcoding
            <div className="size-full relative flex flex-col justify-between p-5 sm:p-6 bg-gradient-to-br from-[#1a1412] via-[#0c0c0e] to-[#12161a]">
              {/* Poster image background */}
              {posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={posterUrl}
                  alt={item.title}
                  className="absolute inset-0 size-full object-cover opacity-35"
                />
              )}
              <div className="absolute inset-0 bg-black/40" />

              {/* Top Meta Badges */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-[#f5551d]">
                  4K 60FPS · HDR
                </span>
                <span className="text-xs font-mono text-zinc-300 bg-black/60 px-3 py-1 rounded-full border border-white/10">
                  {"duration" in item && item.duration ? item.duration : "00:47"}
                </span>
              </div>

              {/* Center Play/Pause Trigger */}
              <div
                onClick={togglePlay}
                className="relative z-10 self-center size-16 sm:size-20 rounded-full bg-[#f5551d] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl cursor-pointer transition-all"
              >
                {isPlaying ? (
                  <Pause className="size-7 sm:size-8 fill-current" />
                ) : (
                  <Play className="size-7 sm:size-8 fill-current ml-1" />
                )}
              </div>

              {/* Bottom Custom Playback Bar */}
              <div className="relative z-10 flex items-center justify-between text-xs font-mono text-zinc-300 bg-black/75 backdrop-blur-md p-3 rounded-xl border border-white/10 gap-4">
                <button
                  onClick={togglePlay}
                  className="hover:text-[#f5551d] transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
                </button>

                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden relative cursor-pointer">
                  <div
                    className={`h-full bg-gradient-to-r from-[#d25828] to-[#f5551d] rounded-full transition-all duration-300 ${
                      isPlaying ? "w-2/3" : "w-1/4"
                    }`}
                  />
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <span>{isPlaying ? "00:31" : "00:12"} / 00:47</span>
                  <button
                    onClick={toggleMute}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Details */}
        <div className="flex items-center justify-between pt-1 text-xs text-zinc-400 font-mono">
          <span>Cloudflare 4K Edge Delivery · CUT Player</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. PROJECT EXPLORER MODAL (Multi-Asset Container)
// ==========================================
interface ProjectExplorerModalProps {
  project: PortfolioItem | null;
  onClose: () => void;
  onSelectStill: (still: ProjectAsset) => void;
  onSelectFilm: (film: ProjectAsset) => void;
}

export function ProjectExplorerModal({
  project,
  onClose,
  onSelectStill,
  onSelectFilm,
}: ProjectExplorerModalProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "films" | "stills">("all");
  const [assets, setAssets] = useState<ProjectAsset[]>(project?.projectAssets || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // If assets not preloaded, fetch them dynamically from server
  useEffect(() => {
    if (!project) return;
    if (project.projectAssets && project.projectAssets.length > 0) {
      setAssets(project.projectAssets);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getProjectAssetsAction(project.id).then((res) => {
      if (isMounted) {
        if (res.success && res.assets) {
          setAssets(res.assets as ProjectAsset[]);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [project]);

  if (!project) return null;

  const filmCount = assets.filter((a) => a.type === "film").length;
  const stillCount = assets.filter((a) => a.type === "still").length;

  const filteredAssets = assets.filter((item) => {
    if (activeFilter === "films") return item.type === "film";
    if (activeFilter === "stills") return item.type === "still";
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#121215]/95 border border-white/15 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 text-white relative max-h-[92vh] overflow-y-auto"
        style={{
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 sm:top-7 sm:right-7 size-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20"
          title="Close project explorer"
        >
          <X className="size-5" />
        </button>

        {/* Project Header */}
        <div className="space-y-3 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f5551d]/15 border border-[#f5551d]/30 text-[10px] font-mono font-bold text-[#f5551d] uppercase tracking-wider">
              <FolderKanban className="size-3" />
              <span>PROJECT CONTAINER</span>
            </span>

            <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
              {assets.length} items · {filmCount} film{filmCount !== 1 ? "s" : ""}, {stillCount} still{stillCount !== 1 ? "s" : ""}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
            {project.title}
          </h2>

          {project.description && (
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl font-sans">
              {project.description}
            </p>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="inline-flex items-center bg-[#0c0c0e] p-1 rounded-full border border-white/10 gap-1">
            {(
              [
                { key: "all", label: `All (${assets.length})` },
                { key: "films", label: `Films (${filmCount})` },
                { key: "stills", label: `Stills (${stillCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === tab.key
                    ? "bg-[#f5551d] text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
            Click any still or video to view in full
          </span>
        </div>

        {/* Project Assets Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400 text-xs">
            <Loader2 className="size-6 animate-spin text-[#f5551d]" />
            <span>Loading project assets...</span>
          </div>
        ) : filteredAssets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredAssets.map((asset) => {
              const isVideo = asset.type === "film";

              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    if (isVideo) onSelectFilm(asset);
                    else onSelectStill(asset);
                  }}
                  className="group relative rounded-2xl bg-[#0c0c0e] border border-white/10 overflow-hidden hover:border-white/30 transition-all duration-200 cursor-pointer hover:shadow-xl shadow-black/40"
                >
                  {/* Thumbnail */}
                  <AppImage
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.title}
                    fallbackIcon={isVideo ? "film" : "image"}
                    containerClassName="aspect-video w-full relative"
                  />

                  {/* Top-Left Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/15 text-[9px] font-mono font-bold text-white uppercase tracking-wider">
                      {isVideo ? (
                        <>
                          <Film className="size-2.5 text-[#f5551d]" />
                          <span>FILM</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="size-2.5 text-zinc-300" />
                          <span>STILL</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Center Action Overlay Icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="size-11 rounded-full bg-[#f5551d] text-black flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                      {isVideo ? (
                        <Play className="size-5 fill-current ml-0.5" />
                      ) : (
                        <Maximize2 className="size-4.5 stroke-[2.5]" />
                      )}
                    </div>
                  </div>

                  {/* Bottom Title Bar */}
                  <div className="p-3 bg-[#0c0c0e] border-t border-white/5 space-y-0.5">
                    <h4 className="text-xs font-bold text-white truncate font-heading group-hover:text-[#f5551d] transition-colors">
                      {asset.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>{isVideo ? "Video Stream" : "Photo Still"}</span>
                      {asset.duration && <span>{asset.duration}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-zinc-500 text-xs italic bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            No {activeFilter === "all" ? "assets" : activeFilter} found inside this project container.
          </div>
        )}
      </div>
    </div>
  );
}

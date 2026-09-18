"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  type MediaPlayerInstance,
} from "@vidstack/react";
import "@vidstack/react/player/styles/base.css";

import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { formatTimecode, stepByFrames } from "@/lib/timecode";

export function isImageSource(url?: string): boolean {
  if (!url) return false;
  const clean = url.toLowerCase().split("?")[0];
  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".avif") ||
    clean.includes("unsplash.com")
  );
}

export interface CutCommentMarker {
  id: string;
  timestampSeconds?: number | null;
  authorName?: string;
  commentText?: string;
  isResolved?: boolean;
}

export interface CutReviewPlayerRef {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  stepFrame: (direction: 1 | -1) => void;
}

export interface CutReviewPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | string;
  fps?: number;
  isPhoto?: boolean;
  comments?: CutCommentMarker[];
  activeCommentId?: string | null;
  onCommentSelect?: (commentId: string, timestamp: number) => void;
  onTimeChange?: (time: number, timecode: string) => void;
  className?: string;
  autoPlay?: boolean;
}

export const CutReviewPlayer = forwardRef<CutReviewPlayerRef, CutReviewPlayerProps>(
  (
    {
      src,
      title,
      poster,
      aspectRatio = "16:9",
      fps = 24,
      isPhoto = false,
      comments = [],
      activeCommentId,
      onCommentSelect,
      onTimeChange,
      className = "",
      autoPlay = false,
    },
    ref
  ) => {
    const playerRef = useRef<MediaPlayerInstance>(null);
    const scrubberRef = useRef<HTMLDivElement>(null);

    const isImageCut = isPhoto || isImageSource(src) || isImageSource(poster);

    // Reliable video stream fallback ONLY if it is a video cut
    const videoStreamSrc = isImageCut
      ? ""
      : src || "https://files.vidstack.io/sprite-fight/hls/stream.m3u8";

    const [zoomLevel, setZoomLevel] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [hoveredComment, setHoveredComment] = useState<CutCommentMarker | null>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
    const [mediaError, setMediaError] = useState<string | null>(null);

    // Imperative Handle for parent components (seeking, stepping, etc.)
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current) {
          playerRef.current.currentTime = seconds;
          playerRef.current.pause();
        }
      },
      play: () => playerRef.current?.play(),
      pause: () => playerRef.current?.pause(),
      getCurrentTime: () => playerRef.current?.currentTime ?? currentTime,
      getDuration: () => playerRef.current?.duration ?? duration,
      stepFrame: (direction: 1 | -1) => {
        handleStepFrame(direction);
      },
    }));

    const handleStepFrame = useCallback(
      (direction: 1 | -1) => {
        if (!playerRef.current) return;
        playerRef.current.pause();
        const nextTime = stepByFrames(
          playerRef.current.currentTime || currentTime,
          direction,
          duration,
          fps
        );
        playerRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        onTimeChange?.(nextTime, formatTimecode(nextTime, fps));
      },
      [currentTime, duration, fps, onTimeChange]
    );

    const handleStepSeconds = useCallback(
      (secondsDelta: number) => {
        if (!playerRef.current) return;
        const current = playerRef.current.currentTime || currentTime;
        const nextTime = Math.min(Math.max(0, current + secondsDelta), duration);
        playerRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        onTimeChange?.(nextTime, formatTimecode(nextTime, fps));
      },
      [currentTime, duration, fps, onTimeChange]
    );

    // Keyboard Shortcuts for NLE-grade cut review
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore shortcuts if the user is typing in an input or textarea
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === "input" || activeTag === "textarea") return;

        if (e.code === "Space") {
          e.preventDefault();
          if (playerRef.current) {
            if (playerRef.current.paused) {
              playerRef.current.play();
            } else {
              playerRef.current.pause();
            }
          }
        } else if (e.code === "ArrowLeft") {
          e.preventDefault();
          if (e.shiftKey) {
            handleStepSeconds(-1);
          } else {
            handleStepFrame(-1);
          }
        } else if (e.code === "ArrowRight") {
          e.preventDefault();
          if (e.shiftKey) {
            handleStepSeconds(1);
          } else {
            handleStepFrame(1);
          }
        } else if (e.key === "j" || e.key === "J") {
          e.preventDefault();
          handleStepSeconds(-2);
        } else if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          playerRef.current?.pause();
        } else if (e.key === "l" || e.key === "L") {
          e.preventDefault();
          handleStepSeconds(2);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleStepFrame, handleStepSeconds]);

    // Scrubber interaction
    const getScrubTimeFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!scrubberRef.current || duration <= 0) return 0;
      const rect = scrubberRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = clickX / rect.width;
      return percentage * duration;
    };

    const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const targetTime = getScrubTimeFromEvent(e);
      if (playerRef.current) {
        playerRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        onTimeChange?.(targetTime, formatTimecode(targetTime, fps));
      }
    };

    const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const hoverSec = getScrubTimeFromEvent(e);
      setHoverTime(hoverSec);
    };

    const handleScrubberMouseLeave = () => {
      setHoverTime(null);
      setHoveredComment(null);
    };

    const togglePlay = () => {
      if (!playerRef.current) return;
      if (playerRef.current.paused) {
        playerRef.current.play();
      } else {
        playerRef.current.pause();
      }
    };

    const toggleMute = () => {
      if (!playerRef.current) return;
      playerRef.current.muted = !playerRef.current.muted;
      setIsMuted(playerRef.current.muted);
    };

    const toggleFullscreen = () => {
      if (!playerRef.current) return;
      if (isFullscreen) {
        playerRef.current.exitFullscreen();
        setIsFullscreen(false);
      } else {
        playerRef.current.enterFullscreen();
        setIsFullscreen(true);
      }
    };

    const handleRateChange = (rate: number) => {
      if (!playerRef.current) return;
      playerRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    };

    // Calculate progress percentage
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const hoverPercent =
      duration > 0 && hoverTime !== null ? (hoverTime / duration) * 100 : null;

    return (
      <div
        className={`group/player relative flex flex-col bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl select-none ${className}`}
      >
        {/* Video or Photo Display Core */}
        <div
          className={`relative w-full overflow-hidden bg-black flex items-center justify-center ${
            aspectRatio === "9:16"
              ? "aspect-[9/16] max-h-[72vh] mx-auto"
              : aspectRatio === "1:1"
              ? "aspect-square max-h-[72vh] mx-auto"
              : "aspect-video"
          }`}
        >
          {isImageCut ? (
            /* Dedicated High-Res Photo Still Review */
            <div
              className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden cursor-zoom-in"
              onDoubleClick={() => setZoomLevel((prev) => (prev > 1 ? 1 : 2))}
            >
              <img
                src={src || poster}
                alt={title || "Still Asset"}
                style={{
                  transform: `scale(${zoomLevel})`,
                  transition: "transform 200ms ease-out",
                }}
                className="max-w-full max-h-full object-contain pointer-events-none select-none"
              />
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md shadow-lg flex items-center gap-1.5">
                  <ImageIcon className="size-3.5" />
                  STILL ASSET
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-muted-foreground bg-black/60 border border-white/10 backdrop-blur-md">
                  {aspectRatio}
                </span>
              </div>
            </div>
          ) : (
            /* Video Review Core (Vidstack) */
            <>
              <MediaPlayer
                ref={playerRef}
                src={videoStreamSrc}
                title={title}
                autoPlay={autoPlay}
                playsInline
                className="w-full h-full object-contain"
                onTimeUpdate={(detail) => {
                  setCurrentTime(detail.currentTime);
                  onTimeChange?.(detail.currentTime, formatTimecode(detail.currentTime, fps));
                }}
                onDurationChange={(d) => setDuration(d)}
                onPlay={() => {
                  setIsPaused(false);
                  setMediaError(null);
                }}
                onPause={() => setIsPaused(true)}
                onError={() => {
                  setMediaError("Video stream failed to decode or is still processing.");
                }}
                onFullscreenChange={(fs) => setIsFullscreen(fs)}
              >
                <MediaProvider>
                  {poster && (
                    <Poster
                      src={poster}
                      alt={title || "Video thumbnail"}
                      className="w-full h-full object-contain"
                    />
                  )}
                </MediaProvider>
              </MediaPlayer>

              {/* Stream Error Recovery Overlay */}
              {mediaError && (
                <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in">
                  <div className="size-12 rounded-full bg-[#f5551d]/20 text-[#f5551d] flex items-center justify-center border border-[#f5551d]/40">
                    <AlertCircle className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-white">Stream Processing or Unavailable</h4>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {mediaError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaError(null);
                      if (playerRef.current) {
                        playerRef.current.currentTime = 0;
                        playerRef.current.play();
                      }
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] transition-colors cursor-pointer"
                  >
                    Reload Stream
                  </button>
                </div>
              )}

              {/* Center Play/Pause Overlay Indicator on Click */}
              <div
                onClick={togglePlay}
                className="absolute inset-0 cursor-pointer flex items-center justify-center"
              >
                {isPaused && !mediaError && (
                  <div className="w-16 h-16 rounded-full bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center text-[#f5551d] shadow-2xl scale-95 group-hover/player:scale-105 transition-transform">
                    <Play className="size-7 fill-current ml-1" />
                  </div>
                )}
              </div>

              {/* Floating Timecode Pill (Top Left) */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/80 text-white border border-white/15 backdrop-blur-md shadow-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f5551d] animate-pulse" />
                  {formatTimecode(currentTime, fps)}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-muted-foreground bg-black/60 border border-white/10 backdrop-blur-md">
                  {fps} FPS
                </span>
              </div>
            </>
          )}

          {/* Floating Title (Top Right) */}
          <div className="absolute top-4 right-4 z-20 pointer-events-none">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium text-white/80 bg-black/80 border border-white/10 backdrop-blur-md">
              {title || "Cut Preview"}
            </span>
          </div>
        </div>

        {/* Custom NLE HUD Review Controls & Scrubber */}
        <div className="bg-[#121215] border-t border-white/10 p-3.5 space-y-3">
          {isImageCut ? (
            <div className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] flex items-center gap-1.5 font-bold">
                  <ImageIcon className="size-3.5" />
                  Still Photography Cut
                </span>
                <span className="text-muted-foreground text-[11px] font-mono">
                  {aspectRatio} High-Resolution Asset
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center bg-black/60 border border-white/10 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.5))}
                    disabled={zoomLevel <= 1}
                    className="p-1 text-muted-foreground hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="size-3.5" />
                  </button>
                  <span className="px-2 text-[10px] font-mono text-white font-bold min-w-[38px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((prev) => Math.min(4, prev + 0.5))}
                    disabled={zoomLevel >= 4}
                    className="p-1 text-muted-foreground hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="size-3.5" />
                  </button>
                </div>

                {zoomLevel > 1 && (
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white cursor-pointer"
                  >
                    Reset Fit
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  title="Fullscreen"
                >
                  {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Scrubber Track with Comment Markers */}
              <div className="relative flex flex-col gap-1.5">
                <div
                  ref={scrubberRef}
                  onClick={handleScrubberClick}
                  onMouseMove={handleScrubberMouseMove}
                  onMouseLeave={handleScrubberMouseLeave}
                  className="relative w-full h-3 flex items-center cursor-pointer group/scrub"
                >
                  {/* Background Bar */}
                  <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden transition-all group-hover/scrub:h-2" />

                  {/* Played Progress Bar */}
                  <div
                    className="absolute left-0 h-1.5 bg-[#f5551d] rounded-full transition-all pointer-events-none group-hover/scrub:h-2"
                    style={{ width: `${progressPercent}%` }}
                  />

                  {/* Scrubber Playhead Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#f5551d] shadow-lg pointer-events-none transition-transform group-hover/scrub:scale-125"
                    style={{ left: `${progressPercent}%` }}
                  />

                  {/* Hover Preview Marker */}
                  {hoverPercent !== null && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3 bg-white/50 rounded-full pointer-events-none"
                      style={{ left: `${hoverPercent}%` }}
                    />
                  )}

                  {/* Comment Markers on Timeline */}
                  {duration > 0 &&
                    comments.map((comment) => {
                      if (
                        comment.timestampSeconds === undefined ||
                        comment.timestampSeconds === null
                      )
                        return null;
                      const markerPercent = (comment.timestampSeconds / duration) * 100;
                      const isActive = activeCommentId === comment.id;

                      return (
                        <div
                          key={comment.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (playerRef.current && comment.timestampSeconds !== undefined && comment.timestampSeconds !== null) {
                              playerRef.current.currentTime = comment.timestampSeconds;
                              playerRef.current.pause();
                              setCurrentTime(comment.timestampSeconds);
                              onCommentSelect?.(comment.id, comment.timestampSeconds);
                            }
                          }}
                          onMouseEnter={() => setHoveredComment(comment)}
                          onMouseLeave={() => setHoveredComment(null)}
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-2.5 h-2.5 rounded-full cursor-pointer transition-all hover:scale-150 ${
                            isActive
                              ? "bg-white ring-2 ring-[#f5551d] scale-125"
                              : comment.isResolved
                              ? "bg-emerald-400"
                              : "bg-[#f5551d]"
                          }`}
                          style={{ left: `${markerPercent}%` }}
                        />
                      );
                    })}
                </div>

                {/* Hover Tooltip (shows time or comment details) */}
                {hoveredComment && hoveredComment.timestampSeconds !== null && hoveredComment.timestampSeconds !== undefined && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-black/90 border border-white/20 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md shadow-2xl flex items-center gap-2 pointer-events-none animate-in fade-in">
                    <MessageSquare className="size-3 text-[#f5551d]" />
                    <span className="font-mono font-bold text-[#ff8a45]">
                      [{formatTimecode(hoveredComment.timestampSeconds, fps)}]
                    </span>
                    <span className="font-semibold text-white truncate max-w-[200px]">
                      {hoveredComment.authorName}:
                    </span>
                    <span className="text-white/80 truncate max-w-[260px]">
                      {hoveredComment.commentText}
                    </span>
                  </div>
                )}
                {!hoveredComment && hoverTime !== null && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/85 border border-white/15 px-2 py-0.5 rounded text-[11px] font-mono text-white pointer-events-none">
                    {formatTimecode(hoverTime, fps)}
                  </div>
                )}
              </div>

              {/* 2. Control Bar Buttons (Frame Step, Play, Timecode, Speed, Audio, Fullscreen) */}
              <div className="flex items-center justify-between gap-3 text-xs">
                {/* Left Group: Play/Pause, Frame Stepping, Timecode */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-lg bg-[#f5551d] text-black hover:bg-[#ff8a45] flex items-center justify-center cursor-pointer transition-all active:scale-95"
                    title={isPaused ? "Play (Space)" : "Pause (Space)"}
                  >
                    {isPaused ? (
                      <Play className="size-4 fill-current ml-0.5" />
                    ) : (
                      <Pause className="size-4 fill-current" />
                    )}
                  </button>

                  {/* Precision Frame Stepping */}
                  <div className="flex items-center bg-black/60 border border-white/10 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => handleStepFrame(-1)}
                      className="px-2 py-1 rounded text-[11px] font-mono text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-0.5 transition-colors cursor-pointer"
                      title="Step -1 Frame (←)"
                    >
                      <ChevronLeft className="size-3" />
                      <span>-1F</span>
                    </button>
                    <div className="w-[1px] h-3 bg-white/10" />
                    <button
                      type="button"
                      onClick={() => handleStepFrame(1)}
                      className="px-2 py-1 rounded text-[11px] font-mono text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-0.5 transition-colors cursor-pointer"
                      title="Step +1 Frame (→)"
                    >
                      <span>+1F</span>
                      <ChevronRight className="size-3" />
                    </button>
                  </div>

                  {/* Timecode Readout */}
                  <div className="font-mono text-xs text-white/90 px-2 py-1 bg-black/40 rounded-lg border border-white/5 flex items-center gap-1.5">
                    <span className="text-[#ff8a45] font-bold">
                      {formatTimecode(currentTime, fps)}
                    </span>
                    <span className="text-white/40">/</span>
                    <span className="text-white/60">{formatTimecode(duration, fps)}</span>
                  </div>
                </div>

                {/* Right Group: Speed, Volume, Fullscreen */}
                <div className="flex items-center gap-2 font-mono">
                  {/* Playback Rate Selector */}
                  <div className="flex items-center bg-black/60 border border-white/10 rounded-lg p-0.5 text-[10px]">
                    {([0.5, 1, 1.5, 2] as const).map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleRateChange(rate)}
                        className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                          playbackRate === rate
                            ? "bg-[#f5551d] text-black font-bold"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  {/* Volume / Mute */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                  </button>

                  {/* Fullscreen */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    title="Fullscreen"
                  >
                    {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

CutReviewPlayer.displayName = "CutReviewPlayer";

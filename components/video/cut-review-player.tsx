"use client";

import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import "@videojs/react/video/skin.css";
import { resolveAdapterType } from "@videojs/react";
import { Video, VideoPlayer, VideoSkin, usePlayer } from "@videojs/react/video";
import { HlsJsVideo } from "@videojs/react/media/hlsjs-video";
import { Image as ImageIcon } from "lucide-react";

import { formatTimecode, stepByFrames } from "@/lib/timecode";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import {
  getMediaBoundingStyles,
  detectAspectRatioFromDimensions,
} from "@/lib/media-ratios";
import { WatermarkOverlay } from "@/components/ui/watermark-overlay";
import { cn } from "@/lib/utils";

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
  iframeEmbedUrl?: string;
  comments?: CutCommentMarker[];
  activeCommentId?: string | null;
  onCommentSelect?: (commentId: string, timestamp: number) => void;
  onTimeChange?: (time: number, timecode: string) => void;
  className?: string;
  autoPlay?: boolean;
  showWatermark?: boolean;
  watermarkText?: string;
}

interface CutReviewPlayerInnerProps extends CutReviewPlayerProps {
  forwardedRef?: React.ForwardedRef<CutReviewPlayerRef>;
}

function CutReviewPlayerInner({
  src,
  title,
  poster,
  aspectRatio = "16:9",
  fps = 24,
  isPhoto = false,
  iframeEmbedUrl,
  comments = [],
  activeCommentId = null,
  onCommentSelect,
  onTimeChange,
  className = "",
  autoPlay = false,
  showWatermark = false,
  watermarkText,
  forwardedRef,
}: CutReviewPlayerInnerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [detectedRatio, setDetectedRatio] = useState<string | null>(null);
  const [sliderTrackEl, setSliderTrackEl] = useState<HTMLElement | null>(null);
  const [localDuration, setLocalDuration] = useState<number>(0);

  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const play = usePlayer((s) => s.play);
  const pause = usePlayer((s) => s.pause);
  const seek = usePlayer((s) => s.seek);

  // Discover and bind to the Video.js .media-time-slider element inside the container
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const updateSlider = () => {
      const el = root.querySelector(".media-time-slider") as HTMLElement | null;
      setSliderTrackEl((prev) => (prev === el ? prev : el));
    };

    updateSlider();

    const observer = new MutationObserver(() => {
      updateSlider();
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [src]);

  const effectiveDuration =
    duration && Number.isFinite(duration) && duration > 0
      ? duration
      : localDuration && Number.isFinite(localDuration) && localDuration > 0
      ? localDuration
      : videoRef.current &&
        Number.isFinite(videoRef.current.duration) &&
        videoRef.current.duration > 0
      ? videoRef.current.duration
      : 0;

  const validComments = comments.filter(
    (c): c is CutCommentMarker & { timestampSeconds: number } =>
      typeof c.timestampSeconds === "number" &&
      c.timestampSeconds >= 0 &&
      effectiveDuration > 0 &&
      c.timestampSeconds <= effectiveDuration
  );

  const resolvedVideoSrc = resolveMediaUrl(src);
  const resolvedPoster = resolveThumbnailUrl(poster, src, isPhoto);

  const isImageCut = Boolean(
    isPhoto || (resolvedVideoSrc && isImageSource(resolvedVideoSrc))
  );

  // If a raw Cloudflare Stream UID or videodelivery URL was provided without .m3u8, ensure it points to the HLS manifest
  let videoStreamSrc = isImageCut
    ? ""
    : resolvedVideoSrc || "https://files.vidstack.io/sprite-fight/hls/stream.m3u8";

  if (
    videoStreamSrc &&
    (videoStreamSrc.includes("cloudflarestream.com") || videoStreamSrc.includes("videodelivery.net")) &&
    !videoStreamSrc.includes(".m3u8") &&
    !videoStreamSrc.includes(".mp4")
  ) {
    const streamUidMatch = videoStreamSrc.match(
      /(?:cloudflarestream\.com|videodelivery\.net)\/([a-f0-9]{32})/i
    );
    if (streamUidMatch) {
      const streamHostMatch = videoStreamSrc.match(/https?:\/\/([^/]+)/);
      const streamDomain = streamHostMatch ? streamHostMatch[1] : "videodelivery.net";
      videoStreamSrc = `https://${streamDomain}/${streamUidMatch[1]}/manifest/video.m3u8`;
    }
  }

  const activeRatio = detectedRatio || aspectRatio || "16:9";
  const bounding = getMediaBoundingStyles(activeRatio);

  useImperativeHandle(forwardedRef, () => ({
    seekTo: (seconds: number) => {
      seek(seconds);
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
      }
      onTimeChange?.(seconds, formatTimecode(seconds, fps));
    },
    play: () => {
      play().catch(() => {});
    },
    pause: () => {
      pause();
    },
    getCurrentTime: () => {
      if (videoRef.current) return videoRef.current.currentTime;
      return currentTime ?? 0;
    },
    getDuration: () => {
      if (videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
        return videoRef.current.duration;
      }
      return duration ?? 0;
    },
    stepFrame: (direction: 1 | -1) => {
      const cur = videoRef.current ? videoRef.current.currentTime : (currentTime ?? 0);
      const dur =
        videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0
          ? videoRef.current.duration
          : (duration ?? 0);
      const nextTime = stepByFrames(cur, direction, dur, fps);
      seek(nextTime);
      if (videoRef.current) {
        videoRef.current.currentTime = nextTime;
      }
      onTimeChange?.(nextTime, formatTimecode(nextTime, fps));
    },
  }));

  if (isImageCut) {
    return (
      <div
        className={`group/player relative flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl select-none w-full h-full ${className}`}
        style={bounding.style}
      >
        <div
          className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden cursor-zoom-in"
          onContextMenu={(e) => {
            if (showWatermark) e.preventDefault();
          }}
          onDoubleClick={() => setZoomLevel((prev) => (prev > 1 ? 1 : 2))}
        >
          <img
            src={resolvedVideoSrc || resolvedPoster || src || poster}
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
                  setDetectedRatio(
                    detected.id === "custom" ? detected.cssRatio : detected.id
                  );
                }
              }
            }}
            style={{
              transform: `scale(${zoomLevel})`,
              transition: "transform 200ms ease-out",
            }}
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
          />
          {showWatermark && (
            <WatermarkOverlay text={watermarkText} variant="player" showBadge />
          )}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md shadow-lg flex items-center gap-1.5">
              <ImageIcon className="size-3.5" />
              STILL ASSET
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] text-muted-foreground bg-black/60 border border-white/10 backdrop-blur-md">
              {(bounding.parsed as any)?.shortLabel ||
                (bounding.parsed as any)?.label ||
                (typeof activeRatio === "string"
                  ? activeRatio
                  : bounding.parsed?.id || "16:9")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (iframeEmbedUrl) {
    return (
      <div
        className={`relative w-full h-full bg-black flex items-center justify-center rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${className}`}
        style={bounding.style}
      >
        <iframe
          src={iframeEmbedUrl}
          title={title || "Video Player"}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          className="w-full h-full border-0"
        />
        {showWatermark && (
          <WatermarkOverlay text={watermarkText} variant="player" showBadge />
        )}
      </div>
    );
  }

  const isHls =
    videoStreamSrc.includes(".m3u8") ||
    resolveAdapterType(videoStreamSrc) === "hls";

  const renderCommentMarkers = () => {
    if (validComments.length === 0 || effectiveDuration <= 0) return null;

    return (
      <div
        className="cut-comment-markers-layer pointer-events-none absolute inset-0 z-20 flex items-center"
        style={{ width: "100%", height: "100%" }}
        aria-label="Timeline comment markers"
      >
        {validComments.map((comment) => {
          const leftPercent = Math.min(
            100,
            Math.max(0, (comment.timestampSeconds / effectiveDuration) * 100)
          );
          const isActive = comment.id === activeCommentId;

          const tooltipPositionClass =
            leftPercent < 15
              ? "left-0 -translate-x-1"
              : leftPercent > 85
              ? "right-0 translate-x-1"
              : "left-1/2 -translate-x-1/2";

          return (
            <button
              key={comment.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                seek(comment.timestampSeconds);
                if (videoRef.current) {
                  videoRef.current.currentTime = comment.timestampSeconds;
                }
                onTimeChange?.(
                  comment.timestampSeconds,
                  formatTimecode(comment.timestampSeconds, fps)
                );
                onCommentSelect?.(comment.id, comment.timestampSeconds);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              style={{
                left: `${leftPercent}%`,
              }}
              className="pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group/marker z-30 flex items-center justify-center p-2 -m-2 focus:outline-none cursor-pointer"
              aria-label={`Comment by ${comment.authorName || "Reviewer"} at ${formatTimecode(comment.timestampSeconds, fps)}`}
            >
              {/* Timeline Marker Dot */}
              <span
                className={cn(
                  "block rounded-full transition-all duration-150",
                  isActive
                    ? "size-3.5 bg-amber-400 border-2 border-white ring-4 ring-amber-400/40 shadow-lg scale-125 z-40"
                    : comment.isResolved
                    ? "size-2.5 bg-emerald-400 border border-black/70 shadow-sm hover:scale-135 hover:bg-emerald-300"
                    : "size-2.5 bg-amber-400 border border-black/70 shadow-sm hover:scale-130 hover:bg-amber-300"
                )}
              />

              {/* Hover Tooltip Card */}
              <div
                className={cn(
                  "pointer-events-none absolute bottom-full mb-2.5 hidden group-hover/marker:flex flex-col items-start gap-1 p-2 rounded-lg bg-black/95 backdrop-blur-md border border-white/20 shadow-2xl text-left min-w-[140px] max-w-[240px] z-50 animate-in fade-in zoom-in-95 duration-100 select-none",
                  tooltipPositionClass
                )}
              >
                <div className="flex items-center gap-1.5 w-full justify-between">
                  <span className="font-mono text-[11px] font-bold text-amber-300">
                    {formatTimecode(comment.timestampSeconds, fps)}
                  </span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                      comment.isResolved
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    )}
                  >
                    {comment.isResolved ? "Resolved" : "Open"}
                  </span>
                </div>
                {comment.authorName && (
                  <span className="text-[11px] font-medium text-white truncate w-full">
                    {comment.authorName}
                  </span>
                )}
                {comment.commentText && (
                  <span className="text-[11px] text-zinc-300 line-clamp-2 leading-snug">
                    {comment.commentText}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`group/player relative flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl select-none w-full h-full ${className}`}
      style={bounding.style}
    >
      <VideoSkin
        style={{
          width: "100%",
          height: "100%",
          aspectRatio: bounding.parsed.cssRatio,
        }}
        className="w-full h-full"
      >
        {isHls ? (
          <HlsJsVideo
            key={videoStreamSrc}
            ref={videoRef}
            src={videoStreamSrc}
            autoPlay={autoPlay}
            playsInline
            onDurationChange={(e) => {
              if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
                setLocalDuration(e.currentTarget.duration);
              }
            }}
            onLoadedMetadata={(e) => {
              if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
                setLocalDuration(e.currentTarget.duration);
              }
            }}
            onTimeUpdate={(e) => {
              onTimeChange?.(
                e.currentTarget.currentTime,
                formatTimecode(e.currentTarget.currentTime, fps)
              );
            }}
          />
        ) : (
          <Video
            key={videoStreamSrc}
            ref={videoRef}
            src={videoStreamSrc}
            autoPlay={autoPlay}
            playsInline
            onDurationChange={(e) => {
              if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
                setLocalDuration(e.currentTarget.duration);
              }
            }}
            onLoadedMetadata={(e) => {
              if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
                setLocalDuration(e.currentTarget.duration);
              }
            }}
            onTimeUpdate={(e) => {
              onTimeChange?.(
                e.currentTarget.currentTime,
                formatTimecode(e.currentTarget.currentTime, fps)
              );
            }}
          />
        )}
        {showWatermark && (
          <WatermarkOverlay text={watermarkText} variant="player" showBadge />
        )}
        {sliderTrackEl
          ? createPortal(renderCommentMarkers(), sliderTrackEl)
          : validComments.length > 0 && (
              <div className="absolute inset-x-4 bottom-14 z-30 pointer-events-none">
                <div className="relative w-full h-2">
                  {renderCommentMarkers()}
                </div>
              </div>
            )}
      </VideoSkin>
    </div>
  );
}

export const CutReviewPlayer = forwardRef<CutReviewPlayerRef, CutReviewPlayerProps>(
  (props, ref) => {
    const resolvedPoster = resolveThumbnailUrl(props.poster, props.src, props.isPhoto);

    return (
      <VideoPlayer title={props.title} poster={resolvedPoster}>
        <CutReviewPlayerInner {...props} forwardedRef={ref} />
      </VideoPlayer>
    );
  }
);

CutReviewPlayer.displayName = "CutReviewPlayer";

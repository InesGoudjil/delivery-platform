"use client";

import {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
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
  onTimeChange,
  className = "",
  autoPlay = false,
  showWatermark = false,
  watermarkText,
  forwardedRef,
}: CutReviewPlayerInnerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [detectedRatio, setDetectedRatio] = useState<string | null>(null);

  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const play = usePlayer((s) => s.play);
  const pause = usePlayer((s) => s.pause);
  const seek = usePlayer((s) => s.seek);

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

  return (
    <div
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

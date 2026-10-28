/**
 * Client-Side Media Inspector
 * 
 * Safely extracts resolution, duration, and detected filmmaker aspect ratio
 * from video and still image File objects upon user drag-and-drop.
 */

import {
  detectAspectRatioFromDimensions,
  parseAspectRatio,
  type ParsedAspectRatio,
} from "./media-ratios";

export interface MediaInspectionResult {
  success: boolean;
  width: number;
  height: number;
  durationSeconds?: number;
  aspectRatio: ParsedAspectRatio;
  mediaType: "video" | "image";
  error?: string;
}

/**
 * Inspects a File (video or image) to extract its native pixel dimensions,
 * duration, and detected aspect ratio without modifying the file.
 */
export async function inspectMediaFile(file: File): Promise<MediaInspectionResult> {
  if (typeof window === "undefined") {
    return {
      success: false,
      width: 1920,
      height: 1080,
      aspectRatio: parseAspectRatio("16:9"),
      mediaType: "video",
      error: "Media inspection is only supported in browser environments.",
    };
  }

  const isImage =
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|avif|gif|tiff?|bmp|heic)$/i.test(file.name);

  if (isImage) {
    return inspectImageFile(file);
  }

  return inspectVideoFile(file);
}

/**
 * Extracts dimensions from an image File
 */
export async function inspectImageFile(file: File): Promise<MediaInspectionResult> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      img.onload = null;
      img.onerror = null;
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve({
        success: false,
        width: 1920,
        height: 1080,
        aspectRatio: parseAspectRatio("16:9"),
        mediaType: "image",
        error: "Image inspection timed out.",
      });
    }, 4000);

    img.onload = () => {
      clearTimeout(timeout);
      const width = img.naturalWidth || 1920;
      const height = img.naturalHeight || 1080;
      const detected = detectAspectRatioFromDimensions(width, height);
      cleanup();

      resolve({
        success: true,
        width,
        height,
        aspectRatio: detected,
        mediaType: "image",
      });
    };

    img.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve({
        success: false,
        width: 1920,
        height: 1080,
        aspectRatio: parseAspectRatio("16:9"),
        mediaType: "image",
        error: "Failed to read image dimensions.",
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Extracts dimensions and duration from a video File
 */
export async function inspectVideoFile(file: File): Promise<MediaInspectionResult> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.remove();
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve({
        success: false,
        width: 1920,
        height: 1080,
        durationSeconds: 0,
        aspectRatio: parseAspectRatio("16:9"),
        mediaType: "video",
        error: "Video metadata inspection timed out.",
      });
    }, 5000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const durationSeconds = isFinite(video.duration) ? video.duration : undefined;
      const detected = detectAspectRatioFromDimensions(width, height);
      cleanup();

      resolve({
        success: true,
        width,
        height,
        durationSeconds,
        aspectRatio: detected,
        mediaType: "video",
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve({
        success: false,
        width: 1920,
        height: 1080,
        aspectRatio: parseAspectRatio("16:9"),
        mediaType: "video",
        error: "Failed to load video metadata.",
      });
    };

    video.src = objectUrl;
  });
}

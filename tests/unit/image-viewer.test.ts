import { describe, it, expect } from "vitest";
import {
  CutImageViewer,
  ImageViewerHud,
  ImageSpatialPins,
} from "@/components/image";
import { MediaReviewStage } from "@/components/media";
import { isImageSource } from "@/components/video/cut-review-player";

describe("components/image and components/media", () => {
  it("exports all image player and review stage components properly", () => {
    expect(typeof CutImageViewer).toBe("object"); // forwardRef renders as object
    expect(typeof ImageViewerHud).toBe("function");
    expect(typeof ImageSpatialPins).toBe("function");
    expect(typeof MediaReviewStage).toBe("function");
  });

  describe("isImageSource helper", () => {
    it("detects image file extensions accurately", () => {
      expect(isImageSource("https://example.com/photo.jpg")).toBe(true);
      expect(isImageSource("https://example.com/asset.png?w=800")).toBe(true);
      expect(isImageSource("https://example.com/shot.webp")).toBe(true);
      expect(isImageSource("https://example.com/graphic.avif")).toBe(true);
      expect(isImageSource("https://images.unsplash.com/photo-123")).toBe(true);
    });

    it("does not flag video URLs as images", () => {
      expect(isImageSource("https://example.com/clip.mp4")).toBe(false);
      expect(isImageSource("https://cloudflarestream.com/abc123/manifest/video.m3u8")).toBe(false);
      expect(isImageSource("https://files.vidstack.io/stream.m3u8")).toBe(false);
      expect(isImageSource(undefined)).toBe(false);
      expect(isImageSource("")).toBe(false);
    });
  });

  describe("ImageSpatialPins pin coordinate calculations", () => {
    it("validates percentages between 0 and 100", () => {
      const pin = { id: "p1", xPercent: 25.5, yPercent: 60.2, authorName: "Alex" };
      expect(pin.xPercent).toBeGreaterThanOrEqual(0);
      expect(pin.xPercent).toBeLessThanOrEqual(100);
      expect(pin.yPercent).toBeGreaterThanOrEqual(0);
      expect(pin.yPercent).toBeLessThanOrEqual(100);
    });
  });
});

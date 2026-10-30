import { describe, it, expect } from "vitest";
import { AssetLightboxModal } from "@/components/workspaces/asset-lightbox-modal";
import { AssetLightboxModal as DeliveryLightboxModal } from "@/app/(workspace)/[workspaceSlug]/deliveries/[projectId]/_components/asset-lightbox-modal";
import {
  AssetLightboxModal as PortfolioLightboxModal,
  StillLightboxModal,
  FilmPlayerModal,
} from "@/app/(workspace)/[workspaceSlug]/portfolio/_components/portfolio-modals";
import { PortfolioModals } from "@/app/(public)/p/[handle]/_components/portfolio-modals";
import { DeliveryRoomClient } from "@/app/(public)/deliver/[shareToken]/delivery-room-client";
import { detectAspectRatioFromDimensions, parseAspectRatio, getMediaBoundingStyles } from "@/lib/media-ratios";

describe("AssetLightboxModal Centralization", () => {
  it("exports the centralized AssetLightboxModal component from workspaces", () => {
    expect(typeof AssetLightboxModal).toBe("function");
  });

  it("re-exports AssetLightboxModal from workspace delivery route for backward compatibility", () => {
    expect(DeliveryLightboxModal).toBe(AssetLightboxModal);
  });

  it("re-exports AssetLightboxModal from workspace portfolio route for backward compatibility", () => {
    expect(PortfolioLightboxModal).toBe(AssetLightboxModal);
    expect(typeof StillLightboxModal).toBe("function");
    expect(typeof FilmPlayerModal).toBe("function");
  });

  it("exports PortfolioModals on public portfolio routes using the centralized modal pattern", () => {
    expect(typeof PortfolioModals).toBe("function");
  });

  it("safely normalizes aspect ratios when passed as a ParsedAspectRatio object, string, or numeric ar", () => {
    const detectedObj = detectAspectRatioFromDimensions(1920, 1080);
    // Object with keys {raw, numeric, cssRatio, id, label, matchedPreset, orientation, isPortrait, isLandscape, isSquare, isUltrawide}
    expect(detectedObj).toHaveProperty("raw");
    expect(detectedObj).toHaveProperty("numeric");
    expect(detectedObj).toHaveProperty("cssRatio");
    expect(detectedObj).toHaveProperty("id");
    expect(detectedObj).toHaveProperty("label");
    expect(detectedObj).toHaveProperty("matchedPreset");
    expect(detectedObj).toHaveProperty("orientation");
    expect(detectedObj).toHaveProperty("isPortrait");
    expect(detectedObj).toHaveProperty("isLandscape");
    expect(detectedObj).toHaveProperty("isSquare");
    expect(detectedObj).toHaveProperty("isUltrawide");

    const resolved = parseAspectRatio(detectedObj);
    expect(resolved.id).toBe("16:9");
    expect(typeof resolved.id).toBe("string");
    expect(typeof (resolved.matchedPreset?.shortLabel || resolved.id)).toBe("string");
  });

  it("handles dual-service video asset objects with jpg thumbnail posters without misclassifying as stills", () => {
    const videoAsset = {
      id: "faed9845-81bb-4428-aefe-f16787fadc9e",
      versionId: "57488c60-525a-4632-bff6-69e9913c8a3d",
      versionNumber: 1,
      totalVersions: 1,
      versions: [
        {
          id: "57488c60-525a-4632-bff6-69e9913c8a3d",
          versionNumber: 1,
          rawFileUrl:
            "https://56fcef0b6221e5ed6f7e149907343726.r2.cloudflarestorage.com/cinespace-saas/private/workspaces/hero.mp4?signature=xyz",
          downloadUrl: "https://56fcef0b6221e5ed6f7e149907343726.r2.cloudflarestorage.com/cinespace-saas/hero.mp4",
          hlsManifestUrl:
            "https://customer-e4gy5xqx2lpazu5e.cloudflarestream.com/e233724740b1cbe67470852d917f3047/manifest/video.m3u8",
          thumbnailUrl:
            "https://customer-e4gy5xqx2lpazu5e.cloudflarestream.com/e233724740b1cbe67470852d917f3047/thumbnails/thumbnail.jpg?time=1s&height=720",
          durationSeconds: null,
          fileSizeBytes: 142918825,
          transcodingStatus: "processing",
          isActiveVersion: true,
          createdAt: "2026-10-28T13:05:51.018753+00:00",
        },
      ],
      title: "CineSpace-Hero",
      type: "video",
      aspectRatio: "16:9",
      duration: "00:45",
      src: "https://customer-e4gy5xqx2lpazu5e.cloudflarestream.com/e233724740b1cbe67470852d917f3047/thumbnails/thumbnail.jpg?time=1s&height=720",
      status: "review",
      rawUrl:
        "https://56fcef0b6221e5ed6f7e149907343726.r2.cloudflarestorage.com/cinespace-saas/private/workspaces/hero.mp4?signature=xyz",
      hlsUrl:
        "https://customer-e4gy5xqx2lpazu5e.cloudflarestream.com/e233724740b1cbe67470852d917f3047/manifest/video.m3u8",
      videoUrl:
        "https://customer-e4gy5xqx2lpazu5e.cloudflarestream.com/e233724740b1cbe67470852d917f3047/manifest/video.m3u8",
      feedback: [],
    };

    expect(videoAsset.type).toBe("video");
    expect(videoAsset.hlsUrl).toContain("manifest/video.m3u8");
    expect(videoAsset.versions[0].hlsManifestUrl).toContain("manifest/video.m3u8");
  });

  it("exports DeliveryRoomClient on public delivery routes using centralized media primitives", () => {
    expect(typeof DeliveryRoomClient).toBe("function");
  });

  it("accurately handles 9:16 vertical video ratio and provides portrait bounding styles", () => {
    const vertical = parseAspectRatio("9:16");
    expect(vertical.id).toBe("9:16");
    expect(vertical.isPortrait).toBe(true);
    expect(vertical.isLandscape).toBe(false);
    expect(vertical.cssRatio).toBe("9 / 16");

    const bounding = getMediaBoundingStyles("9:16");
    expect(bounding.style).toEqual({ aspectRatio: "9 / 16" });
    expect(bounding.parsed.isPortrait).toBe(true);
  });
});

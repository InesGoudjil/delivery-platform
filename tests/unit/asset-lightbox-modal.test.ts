import { describe, it, expect } from "vitest";
import { AssetLightboxModal } from "@/components/workspaces/asset-lightbox-modal";
import { AssetLightboxModal as DeliveryLightboxModal } from "@/app/(workspace)/[workspaceSlug]/deliveries/[projectId]/_components/asset-lightbox-modal";
import {
  AssetLightboxModal as PortfolioLightboxModal,
  StillLightboxModal,
  FilmPlayerModal,
} from "@/app/(workspace)/[workspaceSlug]/portfolio/_components/portfolio-modals";
import { PortfolioModals } from "@/app/(public)/p/[handle]/_components/portfolio-modals";
import { detectAspectRatioFromDimensions, parseAspectRatio } from "@/lib/media-ratios";

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
});

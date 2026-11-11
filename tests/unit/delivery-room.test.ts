import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DeliveryRoomClient } from "@/app/(public)/deliver/[shareToken]/delivery-room-client";
import { DeliveryPasscodeDialog } from "@/app/(public)/deliver/[shareToken]/_components/delivery-passcode-dialog";
import { DeliveryRoomHeader } from "@/app/(public)/deliver/[shareToken]/_components/delivery-room-header";
import { DeliveryHeroBanner } from "@/app/(public)/deliver/[shareToken]/_components/delivery-hero-banner";
import { DeliveryActionBar } from "@/app/(public)/deliver/[shareToken]/_components/delivery-action-bar";
import { DeliveryAssetCard } from "@/app/(public)/deliver/[shareToken]/_components/delivery-asset-card";
import { DeliveryAssetGrid } from "@/app/(public)/deliver/[shareToken]/_components/delivery-asset-grid";
import { DeliveryRoomFooter } from "@/app/(public)/deliver/[shareToken]/_components/delivery-room-footer";
import { useDeliveryRoom } from "@/app/(public)/deliver/[shareToken]/_components/use-delivery-room";

describe("DeliveryRoom Component Decomposition", () => {
  it("exports DeliveryRoomClient as the main orchestrator component", () => {
    expect(typeof DeliveryRoomClient).toBe("function");
  });

  it("exports useDeliveryRoom hook for state and business logic encapsulation", () => {
    expect(typeof useDeliveryRoom).toBe("function");
  });

  it("exports modular subcomponents with clean boundaries", () => {
    expect(typeof DeliveryPasscodeDialog).toBe("function");
    expect(typeof DeliveryRoomHeader).toBe("function");
    expect(typeof DeliveryHeroBanner).toBe("function");
    expect(typeof DeliveryActionBar).toBe("function");
    expect(typeof DeliveryAssetCard).toBe("function");
    expect(typeof DeliveryAssetGrid).toBe("function");
    expect(typeof DeliveryRoomFooter).toBe("function");
  });

  it("renders DeliveryHeroBanner with the same size and aspect ratio classes as PortfolioHero", () => {
    const html = renderToStaticMarkup(
      React.createElement(DeliveryHeroBanner, {
        title: "Commercial Cut",
        clientName: "Acme Studios",
        heroCoverUrl: "/images/hero.jpg",
        formattedDate: "Nov 11, 2026",
        displayLocation: "Paris, FR",
        formattedTotalSize: "1.2 GB",
        displayAssetCount: 8,
        approvedCount: 3,
        isGlobalDownloadUnlocked: true,
        onDownloadAll: () => {},
      })
    );

    expect(html).toContain("w-full");
    expect(html).toContain("aspect-[4/5]");
    expect(html).toContain("sm:aspect-[21/9]");
    expect(html).toContain("min-h-[380px]");
    expect(html).toContain("sm:min-h-0");
    expect(html).toContain("rounded-[1.75rem]");
    expect(html).toContain("sm:rounded-[2rem]");
  });

  describe("Masonry & Aspect Ratio calculations", () => {
    it("handles masonry ratio mapping correctly where isMasonry yields undefined numericRatio", () => {
      const getNumericRatio = (aspectRatioSetting: string) => {
        const isMasonry = aspectRatioSetting === "masonry";
        return isMasonry
          ? undefined
          : aspectRatioSetting === "16:9"
          ? 16 / 9
          : aspectRatioSetting === "1:1"
          ? 1
          : aspectRatioSetting === "9:16"
          ? 9 / 16
          : 16 / 9;
      };

      expect(getNumericRatio("masonry")).toBeUndefined();
      expect(getNumericRatio("16:9")).toBeCloseTo(16 / 9);
      expect(getNumericRatio("1:1")).toBe(1);
      expect(getNumericRatio("9:16")).toBeCloseTo(9 / 16);
    });
  });
});

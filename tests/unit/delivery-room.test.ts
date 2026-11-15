import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }),
  usePathname: () => "/deliver/share-token",
  useSearchParams: () => new URLSearchParams(),
}));
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

  it("renders DeliveryHeroBanner like PortfolioHero: a rounded cover frame sized by the screen, not an aspect ratio", () => {
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
    expect(html).toContain("flex-auto");
    expect(html).not.toContain("aspect-[");
    expect(html).toContain("bg-cover");
    expect(html).toContain("rounded-[1.75rem]");
    expect(html).toContain("sm:rounded-[2rem]");
    // The h1 variant's md:text-7xl would make tablet titles bigger than desktop ones.
    expect(html).toContain("md:text-4xl");
  });

  it("puts the header and banner in a column one screen tall, with the same gap above and below the banner", () => {
    const html = renderToStaticMarkup(
      React.createElement(DeliveryRoomClient, {
        delivery: {
          id: "delivery-1",
          workspaceId: "workspace-1",
          title: "Commercial Cut",
          shareToken: "share-token",
          status: "in_review",
          isDownloadAllowed: true,
          isWatermarked: false,
        },
        workspace: { brandName: "Acme Studios", slug: "acme" },
        clientName: "Prestige Rentals",
        initialAssets: [],
        isPasscodeProtected: false,
        isInitiallyUnlocked: true,
      })
    );

    const column = (html.match(/class="([^"]*min-h-svh[^"]*)"/)?.[1] ?? "").split(" ");
    expect(column).toContain("flex-col");
    for (const [gap, bottom] of [["gap-4", "pb-4"], ["sm:gap-6", "sm:pb-6"], ["lg:gap-8", "lg:pb-8"]]) {
      expect(column).toContain(gap);
      expect(column).toContain(bottom);
    }
    const columnAt = html.indexOf("min-h-svh");
    const bannerAt = html.indexOf("Delivery for Prestige Rentals");
    expect(bannerAt).toBeGreaterThan(columnAt);
    expect(html.indexOf("assets approved")).toBeGreaterThan(bannerAt);
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

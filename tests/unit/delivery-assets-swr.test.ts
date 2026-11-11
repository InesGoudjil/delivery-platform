import { describe, it, expect } from "vitest";
import {
  applyUploadComplete,
  applyToggleApproval,
  applyApproveAll,
  applyDeleteAsset,
  applyUpdateAsset,
  getDeliveryAssetsKey,
  DeliveryAssetsData,
} from "@/lib/swr/use-delivery-assets";
import type { GalleryItem } from "@/app/(workspace)/[workspaceSlug]/deliveries/[projectId]/_components/types";

describe("Delivery Assets SWR & State Helpers", () => {
  const mockItem1: GalleryItem = {
    id: "asset_1",
    versionId: "ver_1",
    versionNumber: 1,
    totalVersions: 1,
    title: "Commercial Cut 1",
    type: "video",
    aspectRatio: "16:9",
    duration: "00:30",
    src: "https://cdn.example.com/cut1.jpg",
    status: "review",
    versions: [
      {
        id: "ver_1",
        versionNumber: 1,
        rawFileUrl: "https://cdn.example.com/cut1.mp4",
        isActiveVersion: true,
        fileSizeBytes: 1048576,
        transcodingStatus: "ready",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };

  const initialData: DeliveryAssetsData = {
    items: [mockItem1],
    totalCount: 1,
    hasMore: false,
  };

  describe("applyUploadComplete", () => {
    it("adds a new asset and increments total count", () => {
      const next = applyUploadComplete(initialData, {
        uploadedAsset: { id: "asset_new", title: "Social Cut 9x16", aspectRatio: "9:16", type: "video" },
        uploadedVersion: { id: "ver_new", versionNumber: 1, rawFileUrl: "https://cdn.example.com/new.mp4" },
        durationStr: "00:15",
        resolvedSrc: "https://cdn.example.com/new.jpg",
        isPhoto: false,
      });

      expect(next.items).toHaveLength(2);
      expect(next.items[0].id).toBe("asset_new");
      expect(next.totalCount).toBe(2);
    });

    it("updates existing asset with a new version without incrementing total count", () => {
      const next = applyUploadComplete(initialData, {
        uploadedAsset: { id: "asset_1", title: "Commercial Cut 1 (V2)" },
        uploadedVersion: { id: "ver_2", versionNumber: 2, rawFileUrl: "https://cdn.example.com/cut1_v2.mp4" },
        durationStr: "00:30",
        resolvedSrc: "https://cdn.example.com/cut1_v2.jpg",
        isPhoto: false,
      });

      expect(next.items).toHaveLength(1);
      expect(next.items[0].totalVersions).toBe(2);
      expect(next.items[0].versionNumber).toBe(2);
      expect(next.totalCount).toBe(1);
    });
  });

  describe("applyToggleApproval", () => {
    it("toggles an asset approval state", () => {
      const next = applyToggleApproval(initialData, "asset_1", true);
      expect(next.items[0].status).toBe("approved");

      const unapproved = applyToggleApproval(next, "asset_1", false);
      expect(unapproved.items[0].status).toBe("review");
    });
  });

  describe("applyApproveAll", () => {
    it("marks all assets as approved or review", () => {
      const approved = applyApproveAll(initialData, true);
      expect(approved.items.every((i) => i.status === "approved")).toBe(true);

      const review = applyApproveAll(approved, false);
      expect(review.items.every((i) => i.status === "review")).toBe(true);
    });
  });

  describe("applyDeleteAsset", () => {
    it("removes the asset and decrements total count", () => {
      const next = applyDeleteAsset(initialData, "asset_1");
      expect(next.items).toHaveLength(0);
      expect(next.totalCount).toBe(0);
    });
  });

  describe("applyUpdateAsset", () => {
    it("updates title and aspect ratio", () => {
      const next = applyUpdateAsset(initialData, {
        id: "asset_1",
        title: "Brand Anthem Cut",
        aspectRatio: "2.39:1",
      });

      expect(next.items[0].title).toBe("Brand Anthem Cut");
      expect(next.items[0].aspectRatio).toBe("2.39:1");
    });
  });

  describe("getDeliveryAssetsKey", () => {
    it("formats the SWR cache key with filter parameter", () => {
      expect(getDeliveryAssetsKey("del_123")).toBe("/api/deliveries/del_123/assets");
      expect(getDeliveryAssetsKey("del_123", "VIDEOS")).toBe("/api/deliveries/del_123/assets?filter=VIDEOS");
      expect(getDeliveryAssetsKey("del_123", "ALL")).toBe("/api/deliveries/del_123/assets");
      expect(getDeliveryAssetsKey(undefined)).toBeNull();
    });
  });
});

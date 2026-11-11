import { describe, it, expect } from "vitest";
import {
  deriveAvailableCoverAssets,
  applyAddPortfolioItem,
  applyRemovePortfolioItem,
  applyRemoveProjectAsset,
  applyUpdatePortfolioItem,
  applyToggleFeaturedItem,
  getWorkspacePortfolioKey,
} from "@/lib/swr/use-workspace-portfolio";
import { PortfolioItem, ProjectAsset } from "@/core/entities/portfolio";
import { WorkspacePortfolioData } from "@/app/actions/portfolio";

describe("Workspace Portfolio SWR & State Helpers", () => {
  const mockAsset1: ProjectAsset = {
    id: "asset_1",
    title: "Scene 1 Cut",
    type: "film",
    url: "https://cdn.example.com/scene1.mp4",
    thumbnailUrl: "https://cdn.example.com/scene1.jpg",
    aspectRatio: "16:9",
    duration: "2:15",
    category: "Film Cut",
  };

  const mockProject: PortfolioItem = {
    id: "proj_1",
    title: "Commercial 2026",
    category: "Nike",
    type: "project",
    assetCount: 1,
    thumbnailUrl: "https://cdn.example.com/cover.jpg",
    description: "Autumn campaign cut.",
    isFeatured: true,
    projectAssets: [mockAsset1],
  };

  const mockStandalone: PortfolioItem = {
    id: "asset_standalone",
    title: "Mood Reel",
    category: "Film Cut",
    type: "film",
    assetCount: 1,
    thumbnailUrl: "https://cdn.example.com/reel.jpg",
    mediaUrl: "https://cdn.example.com/reel.mp4",
    aspectRatio: "2.39:1",
    isFeatured: false,
  };

  const initialData: WorkspacePortfolioData = {
    items: [mockProject, mockStandalone],
    featuredIds: ["proj_1"],
  };

  describe("deriveAvailableCoverAssets", () => {
    it("flattens nested project assets and standalone assets into selectable cover assets", () => {
      const coverAssets = deriveAvailableCoverAssets(initialData.items);
      expect(coverAssets).toHaveLength(2);

      const fromProject = coverAssets.find((a) => a.id === "asset_1");
      expect(fromProject?.projectName).toBe("Commercial 2026");
      expect(fromProject?.type).toBe("video");

      const fromStandalone = coverAssets.find((a) => a.id === "asset_standalone");
      expect(fromStandalone?.title).toBe("Mood Reel");
    });
  });

  describe("applyAddPortfolioItem", () => {
    it("prepends a new project or media item to the portfolio list", () => {
      const newItem: PortfolioItem = {
        id: "proj_new",
        title: "Fashion Film",
        category: "Vogue",
        type: "project",
        assetCount: 0,
        thumbnailUrl: "https://cdn.example.com/fashion.jpg",
      };

      const next = applyAddPortfolioItem(initialData, newItem);
      expect(next.items).toHaveLength(3);
      expect(next.items[0].id).toBe("proj_new");
    });

    it("replaces existing item if id already exists instead of duplicating", () => {
      const updatedExisting: PortfolioItem = {
        ...mockProject,
        title: "Updated Commercial",
      };

      const next = applyAddPortfolioItem(initialData, updatedExisting);
      expect(next.items).toHaveLength(2);
      expect(next.items[0].title).toBe("Updated Commercial");
    });
  });

  describe("applyRemovePortfolioItem", () => {
    it("removes item from items list and cleans up from featuredIds", () => {
      const next = applyRemovePortfolioItem(initialData, "proj_1");
      expect(next.items).toHaveLength(1);
      expect(next.items[0].id).toBe("asset_standalone");
      expect(next.featuredIds).toEqual([]);
    });
  });

  describe("applyRemoveProjectAsset", () => {
    it("removes child asset from inside matching project container and decrements count", () => {
      const next = applyRemoveProjectAsset(initialData, "proj_1", "asset_1");
      const targetProject = next.items.find((i) => i.id === "proj_1");
      expect(targetProject?.assetCount).toBe(0);
      expect(targetProject?.projectAssets).toHaveLength(0);
    });
  });

  describe("applyUpdatePortfolioItem", () => {
    it("updates top-level portfolio item fields cleanly", () => {
      const next = applyUpdatePortfolioItem(initialData, {
        id: "proj_1",
        title: "New Nike Commercial",
        category: "Brand Campaign",
      });

      const updated = next.items.find((i) => i.id === "proj_1");
      expect(updated?.title).toBe("New Nike Commercial");
      expect(updated?.category).toBe("Brand Campaign");
    });

    it("updates nested child asset inside a project container", () => {
      const next = applyUpdatePortfolioItem(initialData, {
        id: "asset_1",
        title: "Scene 1 Final Cut",
      });

      const parentProject = next.items.find((i) => i.id === "proj_1");
      const childAsset = parentProject?.projectAssets?.find((a) => a.id === "asset_1");
      expect(childAsset?.title).toBe("Scene 1 Final Cut");
    });
  });

  describe("applyToggleFeaturedItem", () => {
    it("pins an unpinned item and updates isFeatured flag", () => {
      const next = applyToggleFeaturedItem(initialData, "asset_standalone");
      expect(next.featuredIds).toContain("asset_standalone");
      const target = next.items.find((i) => i.id === "asset_standalone");
      expect(target?.isFeatured).toBe(true);
    });

    it("unpins an already pinned item", () => {
      const next = applyToggleFeaturedItem(initialData, "proj_1");
      expect(next.featuredIds).not.toContain("proj_1");
      const target = next.items.find((i) => i.id === "proj_1");
      expect(target?.isFeatured).toBe(false);
    });
  });

  describe("getWorkspacePortfolioKey", () => {
    it("formats the standard SWR cache key", () => {
      expect(getWorkspacePortfolioKey("cinema-studio")).toBe(
        "/api/workspaces/cinema-studio/portfolio"
      );
      expect(getWorkspacePortfolioKey(undefined)).toBeNull();
    });
  });
});

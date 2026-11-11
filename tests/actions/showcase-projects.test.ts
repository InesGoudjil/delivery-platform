import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createShowcaseProjectAction,
  attachAssetsToShowcaseProjectAction,
  updateShowcaseProjectCoverAction,
} from "@/app/actions/projects";
import * as guards from "@/core/security/guards";

describe("showcase project actions", () => {
  let services: any;

  const assets: Record<string, { id: string; workspaceId: string }> = {
    asset_own: { id: "asset_own", workspaceId: "ws_a" },
    asset_foreign: { id: "asset_foreign", workspaceId: "ws_b" },
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    services = {
      portfolio: {
        getPortfolioById: vi.fn(async (id: string) =>
          id === "pf_a" ? { id: "pf_a", workspaceId: "ws_a" } : id === "pf_b" ? { id: "pf_b", workspaceId: "ws_b" } : null
        ),
      },
      asset: { getAssetById: vi.fn(async (id: string) => assets[id] || null) },
      project: {
        createProject: vi.fn(async (dto: any) => ({ id: "proj_new", ...dto })),
        attachAssetToProject: vi.fn().mockResolvedValue(undefined),
        getProjectById: vi.fn(async (id: string) =>
          id === "proj_a" ? { id: "proj_a", workspaceId: "ws_a" } : null
        ),
        updateProject: vi.fn(async (id: string, data: any) => ({ id, ...data })),
      },
    };

    vi.spyOn(guards, "requireUser").mockResolvedValue({ user: { id: "user_1" }, services } as any);
    vi.spyOn(guards, "requireWorkspaceMember").mockResolvedValue({
      user: { id: "user_1" },
      services,
      workspace: { id: "ws_a" },
      role: "editor",
    } as any);
  });

  describe("createShowcaseProjectAction", () => {
    it("requires editor access to the workspace", async () => {
      vi.mocked(guards.requireWorkspaceMember).mockRejectedValue(
        new Error("Forbidden: You do not have access to this workspace.")
      );

      const result = await createShowcaseProjectAction("ws_a", "pf_a", { title: "Reel" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Forbidden");
      expect(services.project.createProject).not.toHaveBeenCalled();
    });

    it("refuses a portfolio that belongs to another workspace", async () => {
      const result = await createShowcaseProjectAction("ws_a", "pf_b", { title: "Inject" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Portfolio not found");
      expect(services.project.createProject).not.toHaveBeenCalled();
    });

    it("refuses assets from another workspace", async () => {
      const result = await createShowcaseProjectAction("ws_a", "pf_a", {
        title: "Reel",
        assetIds: ["asset_own", "asset_foreign"],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("do not belong");
      expect(services.project.createProject).not.toHaveBeenCalled();
      expect(services.project.attachAssetToProject).not.toHaveBeenCalled();
    });

    it("creates the project and attaches own assets", async () => {
      const result = await createShowcaseProjectAction("ws_a", "pf_a", {
        title: "Reel",
        assetIds: ["asset_own"],
      });

      expect(result.success).toBe(true);
      expect(guards.requireWorkspaceMember).toHaveBeenCalledWith("ws_a", "editor");
      expect(services.project.createProject).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: "ws_a", portfolioId: "pf_a" })
      );
      expect(services.project.attachAssetToProject).toHaveBeenCalledWith("proj_new", "asset_own", 0);
    });
  });

  describe("attachAssetsToShowcaseProjectAction", () => {
    it("requires a signed-in user", async () => {
      vi.mocked(guards.requireUser).mockRejectedValue(new Error("Unauthorized: Active user session required."));

      const result = await attachAssetsToShowcaseProjectAction("proj_a", ["asset_own"]);

      expect(result.success).toBe(false);
      expect(services.project.attachAssetToProject).not.toHaveBeenCalled();
    });

    it("authorizes against the project's own workspace", async () => {
      const result = await attachAssetsToShowcaseProjectAction("proj_a", ["asset_own"]);

      expect(result.success).toBe(true);
      expect(guards.requireWorkspaceMember).toHaveBeenCalledWith("ws_a", "editor");
      expect(services.project.attachAssetToProject).toHaveBeenCalledWith("proj_a", "asset_own", 0);
    });

    it("refuses unknown projects", async () => {
      const result = await attachAssetsToShowcaseProjectAction("proj_unknown", ["asset_own"]);

      expect(result.success).toBe(false);
      expect(services.project.attachAssetToProject).not.toHaveBeenCalled();
    });

    it("refuses assets from another workspace", async () => {
      const result = await attachAssetsToShowcaseProjectAction("proj_a", ["asset_foreign"]);

      expect(result.success).toBe(false);
      expect(services.project.attachAssetToProject).not.toHaveBeenCalled();
    });
  });

  describe("updateShowcaseProjectCoverAction", () => {
    it("requires editor access to the project's workspace", async () => {
      vi.mocked(guards.requireWorkspaceMember).mockRejectedValue(
        new Error("Forbidden: You do not have access to this workspace.")
      );

      const result = await updateShowcaseProjectCoverAction("proj_a", "https://cdn.test/cover.jpg");

      expect(result.success).toBe(false);
      expect(services.project.updateProject).not.toHaveBeenCalled();
    });

    it("rejects an empty cover URL", async () => {
      const result = await updateShowcaseProjectCoverAction("proj_a", "   ");

      expect(result.success).toBe(false);
      expect(services.project.updateProject).not.toHaveBeenCalled();
    });

    it("updates the cover for an editor", async () => {
      const result = await updateShowcaseProjectCoverAction("proj_a", "https://cdn.test/cover.jpg");

      expect(result.success).toBe(true);
      expect(services.project.updateProject).toHaveBeenCalledWith("proj_a", {
        coverAssetUrl: "https://cdn.test/cover.jpg",
      });
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  getWorkspaceKey,
  applyUpdateWorkspaceBranding,
} from "@/lib/swr/use-workspace";
import type { WorkspaceData } from "@/app/actions/workspaces";

describe("Workspace SWR & State Helpers", () => {
  const mockWorkspace: WorkspaceData = {
    id: "ws_123",
    brandName: "Acme Films",
    slug: "acme-films",
    logoUrl: "https://cdn.example.com/logo.png",
    accentColor: "#F5551D",
    accountType: "studio",
    ownerId: "user_1",
    storageUsedBytes: 52428800,
  };

  describe("getWorkspaceKey", () => {
    it("formats the standard SWR cache key", () => {
      expect(getWorkspaceKey("acme-films")).toBe("/api/workspaces/acme-films");
      expect(getWorkspaceKey(undefined)).toBeNull();
    });
  });

  describe("applyUpdateWorkspaceBranding", () => {
    it("optimistically updates brandName and accentColor without mutating original object", () => {
      const updated = applyUpdateWorkspaceBranding(mockWorkspace, {
        brandName: "Acme Studios Worldwide",
        accentColor: "#3B82F6",
      });

      expect(updated.brandName).toBe("Acme Studios Worldwide");
      expect(updated.accentColor).toBe("#3B82F6");
      expect(updated.id).toBe("ws_123");
      expect(mockWorkspace.brandName).toBe("Acme Films");
    });

    it("optimistically updates logoUrl to a new value or null", () => {
      const updated = applyUpdateWorkspaceBranding(mockWorkspace, {
        logoUrl: null,
      });

      expect(updated.logoUrl).toBeNull();
      expect(mockWorkspace.logoUrl).toBe("https://cdn.example.com/logo.png");
    });
  });
});

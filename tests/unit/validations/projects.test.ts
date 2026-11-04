import { describe, it, expect } from "vitest";
import {
  createWorkspaceProjectSchema,
  createShowcaseProjectSchema,
} from "@/lib/validations/projects";

describe("lib/validations/projects", () => {
  describe("createWorkspaceProjectSchema", () => {
    it("validates basic workspace project inputs", () => {
      const valid = {
        workspaceId: "ws_123",
        title: "Client Delivery Cut",
        description: "Commercial version",
      };
      const res = createWorkspaceProjectSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("defaults title to 'Untitled Delivery' if empty string is not provided", () => {
      const res = createWorkspaceProjectSchema.safeParse({ workspaceId: "ws_1" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.title).toBe("Untitled Delivery");
      }
    });

    it("rejects when workspaceId is missing", () => {
      const res = createWorkspaceProjectSchema.safeParse({ workspaceId: "  " });
      expect(res.success).toBe(false);
    });
  });

  describe("createShowcaseProjectSchema", () => {
    it("validates portfolio showcase project inputs", () => {
      const valid = {
        workspaceId: "ws_1",
        portfolioId: "port_1",
        title: "Apple TV Teaser",
        clientName: "Apple Inc.",
        category: "Commercial",
        assetIds: ["asset_1", "asset_2"],
      };
      const res = createShowcaseProjectSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("requires both workspaceId and portfolioId", () => {
      expect(
        createShowcaseProjectSchema.safeParse({
          workspaceId: "ws_1",
          portfolioId: "",
          title: "Test",
        }).success
      ).toBe(false);

      expect(
        createShowcaseProjectSchema.safeParse({
          workspaceId: "",
          portfolioId: "port_1",
          title: "Test",
        }).success
      ).toBe(false);
    });
  });
});

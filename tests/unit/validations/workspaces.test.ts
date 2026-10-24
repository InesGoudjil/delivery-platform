import { describe, it, expect } from "vitest";
import {
  createTeamWorkspaceSchema,
  switchWorkspacePlanSchema,
} from "@/lib/validations/workspaces";

describe("lib/validations/workspaces", () => {
  describe("createTeamWorkspaceSchema", () => {
    it("validates a standard workspace creation input", () => {
      const valid = {
        brandName: "Lunar Film Studio",
        slug: "lunar-film-studio",
        accentColor: "#3b82f6",
        defaultLanguage: "en",
      };

      const result = createTeamWorkspaceSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.brandName).toBe("Lunar Film Studio");
        expect(result.data.slug).toBe("lunar-film-studio");
      }
    });

    it("enforces brandName minimum length of 2", () => {
      expect(createTeamWorkspaceSchema.safeParse({ brandName: "A" }).success).toBe(false);
      expect(createTeamWorkspaceSchema.safeParse({ brandName: "AB" }).success).toBe(true);
    });

    it("rejects invalid slugs with uppercase or special characters", () => {
      expect(
        createTeamWorkspaceSchema.safeParse({ brandName: "Studio", slug: "Invalid_Slug!" }).success
      ).toBe(false);
      expect(
        createTeamWorkspaceSchema.safeParse({ brandName: "Studio", slug: "valid-slug-123" }).success
      ).toBe(true);
    });

    it("rejects invalid hex color codes", () => {
      expect(
        createTeamWorkspaceSchema.safeParse({ brandName: "Studio", accentColor: "not-a-color" }).success
      ).toBe(false);
      expect(
        createTeamWorkspaceSchema.safeParse({ brandName: "Studio", accentColor: "#ff00aa" }).success
      ).toBe(true);
    });
  });

  describe("switchWorkspacePlanSchema", () => {
    it("validates required workspaceId and planSlug", () => {
      expect(switchWorkspacePlanSchema.safeParse({ workspaceId: "ws_1", planSlug: "pro" }).success).toBe(true);
      expect(switchWorkspacePlanSchema.safeParse({ workspaceId: "", planSlug: "pro" }).success).toBe(false);
      expect(switchWorkspacePlanSchema.safeParse({ workspaceId: "ws_1", planSlug: "" }).success).toBe(false);
    });
  });
});

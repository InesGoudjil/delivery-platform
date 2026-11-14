import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireUser,
  requireWorkspaceMember,
  requireDeliveryAccess,
  requirePlatformAdmin,
} from "@/core/security/guards";
import * as serverModule from "@/core/server";

describe("core/security/guards", () => {
  const mockUser = { id: "user_123", email: "editor@example.com" };
  const mockWorkspace = { id: "ws_456", name: "Studio A", ownerId: "user_owner" };
  const mockDelivery = { id: "del_789", workspaceId: "ws_456", title: "Cut 1" };

  let mockServices: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockServices = {
      auth: {
        getCurrentUser: vi.fn().mockResolvedValue(mockUser),
        getAssuranceLevel: vi.fn().mockResolvedValue("aal2"),
      },
      workspace: {
        getWorkspaceById: vi.fn().mockResolvedValue(mockWorkspace),
      },
      member: {
        getMember: vi.fn().mockResolvedValue({
          userId: mockUser.id,
          workspaceId: mockWorkspace.id,
          role: "editor",
        }),
      },
      delivery: {
        getDeliveryById: vi.fn().mockResolvedValue(mockDelivery),
      },
    };

    vi.spyOn(serverModule, "getServerServices").mockResolvedValue(mockServices);
  });

  describe("requirePlatformAdmin", () => {
    it("rejects signed-in users without the admin platform role", async () => {
      mockServices.profile = { getProfile: vi.fn().mockResolvedValue({ platformRole: "user" }) };
      await expect(requirePlatformAdmin()).rejects.toThrow("Forbidden: Platform admin privileges required.");
    });

    it("rejects anonymous callers", async () => {
      mockServices.auth.getCurrentUser.mockResolvedValue(null);
      mockServices.profile = { getProfile: vi.fn() };
      await expect(requirePlatformAdmin()).rejects.toThrow("Unauthorized");
      expect(mockServices.profile.getProfile).not.toHaveBeenCalled();
    });

    it("returns the context for platform admins with a two-factor session", async () => {
      mockServices.profile = { getProfile: vi.fn().mockResolvedValue({ platformRole: "admin" }) };
      const ctx = await requirePlatformAdmin();
      expect(ctx.user.id).toBe("user_123");
      expect(ctx.profile.platformRole).toBe("admin");
      expect(mockServices.profile.getProfile).toHaveBeenCalledWith("user_123");
    });

    it("rejects platform admins whose session hasn't passed a two-factor check", async () => {
      mockServices.profile = { getProfile: vi.fn().mockResolvedValue({ platformRole: "admin" }) };
      mockServices.auth.getAssuranceLevel.mockResolvedValue("aal1");
      await expect(requirePlatformAdmin()).rejects.toThrow("Two-factor verification is required");
    });

    it("lets ADMIN_MFA_OPTIONAL switch the two-factor check off outside production only", async () => {
      mockServices.profile = { getProfile: vi.fn().mockResolvedValue({ platformRole: "admin" }) };
      mockServices.auth.getAssuranceLevel.mockResolvedValue("aal1");
      vi.stubEnv("ADMIN_MFA_OPTIONAL", "true");
      try {
        await expect(requirePlatformAdmin()).resolves.toMatchObject({ user: { id: "user_123" } });
        vi.stubEnv("NODE_ENV", "production");
        await expect(requirePlatformAdmin()).rejects.toThrow("Two-factor verification is required");
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("never asks non-admins for a two-factor check", async () => {
      mockServices.profile = { getProfile: vi.fn().mockResolvedValue({ platformRole: "user" }) };
      await expect(requirePlatformAdmin()).rejects.toThrow("Platform admin privileges required");
      expect(mockServices.auth.getAssuranceLevel).not.toHaveBeenCalled();
    });
  });

  describe("requireUser", () => {
    it("returns user and services when session is active", async () => {
      const ctx = await requireUser();
      expect(ctx.user.id).toBe("user_123");
      expect(ctx.services).toBeDefined();
    });

    it("throws Unauthorized error when user is not logged in", async () => {
      mockServices.auth.getCurrentUser.mockResolvedValue(null);

      await expect(requireUser()).rejects.toThrow(
        "Unauthorized: Active user session required."
      );
    });
  });

  describe("requireWorkspaceMember", () => {
    it("makes a suspended workspace read-only: viewer-level reads pass, changes are refused", async () => {
      mockServices.workspace.getWorkspaceById.mockResolvedValue({ ...mockWorkspace, suspendedAt: "2026-11-13T10:00:00Z" });
      await expect(requireWorkspaceMember("ws_456", "viewer")).resolves.toMatchObject({ role: "editor" });
      await expect(requireWorkspaceMember("ws_456", "editor")).rejects.toThrow("suspended");
    });

    it("allows access when member has required role (editor for editor)", async () => {
      const ctx = await requireWorkspaceMember("ws_456", "editor");
      expect(ctx.workspace.id).toBe("ws_456");
      expect(ctx.role).toBe("editor");
    });

    it("treats a co-owner (a membership row with role owner) as owner, like has_workspace_role()", async () => {
      // user_123 isn't workspaces.owner_id ("user_owner"): only owners can create such a row.
      mockServices.member.getMember.mockResolvedValue({
        userId: mockUser.id,
        workspaceId: mockWorkspace.id,
        role: "owner",
      });

      const ctx = await requireWorkspaceMember("ws_456", "admin");
      expect(ctx.role).toBe("owner");
      await expect(requireWorkspaceMember("ws_456", "owner")).resolves.toMatchObject({ role: "owner" });
    });

    // has_workspace_role(ws, min_role): array_position(['viewer','editor','admin','owner'], role) >= ... of min_role
    const ROLES = ["viewer", "editor", "admin", "owner"] as const;
    const matrix = ROLES.flatMap((role, rank) =>
      ROLES.map((minRole, minRank) => [role, minRole, rank >= minRank] as const)
    );

    it.each(matrix)("ranks %s against a required %s like the database (allowed: %s)", async (role, minRole, allowed) => {
      mockServices.member.getMember.mockResolvedValue({
        userId: mockUser.id,
        workspaceId: mockWorkspace.id,
        role,
      });

      const result = requireWorkspaceMember("ws_456", minRole);
      if (allowed) {
        await expect(result).resolves.toMatchObject({ role });
      } else {
        await expect(result).rejects.toThrow(`Forbidden: Requires at least "${minRole}" role permissions.`);
      }
    });

    it("fails closed on a role it doesn't know", async () => {
      mockServices.member.getMember.mockResolvedValue({
        userId: mockUser.id,
        workspaceId: mockWorkspace.id,
        role: "superadmin",
      });

      await expect(requireWorkspaceMember("ws_456", "viewer")).rejects.toThrow("Forbidden");
    });

    it("fails closed on a required role it doesn't know", async () => {
      mockServices.member.getMember.mockResolvedValue({
        userId: mockUser.id,
        workspaceId: mockWorkspace.id,
        role: "owner",
      });

      await expect(requireWorkspaceMember("ws_456", "superadmin" as any)).rejects.toThrow("Forbidden");
    });

    it("throws Forbidden when user has lower role than required (viewer for editor)", async () => {
      mockServices.member.getMember.mockResolvedValue({
        userId: mockUser.id,
        workspaceId: mockWorkspace.id,
        role: "viewer",
      });

      await expect(requireWorkspaceMember("ws_456", "editor")).rejects.toThrow(
        'Forbidden: Requires at least "editor" role permissions.'
      );
    });

    it("throws when workspace does not exist", async () => {
      mockServices.workspace.getWorkspaceById.mockResolvedValue(null);

      await expect(requireWorkspaceMember("non_existent_ws", "editor")).rejects.toThrow(
        "Workspace not found."
      );
    });

    it("throws Forbidden when user is not a member of the workspace (BOLA protection)", async () => {
      mockServices.member.getMember.mockResolvedValue(null);

      await expect(requireWorkspaceMember("ws_456", "viewer")).rejects.toThrow(
        "Forbidden: You do not have access to this workspace."
      );
    });
  });

  describe("requireDeliveryAccess", () => {
    it("resolves delivery and validates workspace membership", async () => {
      const ctx = await requireDeliveryAccess("del_789", "editor");
      expect(ctx.delivery.id).toBe("del_789");
      expect(ctx.workspace.id).toBe("ws_456");
      expect(ctx.role).toBe("editor");
    });

    it("throws when delivery is not found", async () => {
      mockServices.delivery.getDeliveryById.mockResolvedValue(null);

      await expect(requireDeliveryAccess("del_missing")).rejects.toThrow(
        "Delivery cut not found."
      );
    });
  });
});

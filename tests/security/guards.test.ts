import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireUser,
  requireWorkspaceMember,
  requireDeliveryAccess,
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
    it("allows access when member has required role (editor for editor)", async () => {
      const ctx = await requireWorkspaceMember("ws_456", "editor");
      expect(ctx.workspace.id).toBe("ws_456");
      expect(ctx.role).toBe("editor");
    });

    it("allows access when member has higher role (owner for admin/editor)", async () => {
      mockServices.member.getMember.mockResolvedValue({
        userId: mockUser.id,
        workspaceId: mockWorkspace.id,
        role: "owner",
      });

      const ctx = await requireWorkspaceMember("ws_456", "admin");
      expect(ctx.role).toBe("owner");
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

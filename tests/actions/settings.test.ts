import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getWorkspaceSettingsAction,
  updateWorkspaceNotificationSettingsAction,
  updateWorkspaceSecuritySettingsAction,
  getWorkspaceNotificationLogsAction,
} from "@/app/actions/settings";
import * as guards from "@/core/security/guards";
import * as serverModule from "@/core/server";

describe("app/actions/settings", () => {
  const mockWorkspace = {
    id: "ws_1",
    ownerId: "user_owner",
    brandName: "CineSpace Studios",
    slug: "cinespace",
    accountType: "studio",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockSettings = {
    workspaceId: "ws_1",
    notifyApprovals: true,
    notifyComments: true,
    notifyDownloads: true,
    weeklyDigest: false,
    whatsappNumber: "+971501234567",
    whatsappEnabled: true,
    defaultLinkExpirationDays: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockLogs = [
    {
      id: "log_1",
      workspaceId: "ws_1",
      channel: "email" as const,
      recipientEmail: "client@example.com",
      subject: "🎬 New Cut for Review",
      status: "delivered" as const,
      createdAt: new Date().toISOString(),
    },
  ];

  let mockServices: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockServices = {
      workspace: {
        getWorkspaceBySlug: vi.fn().mockImplementation((slug: string) => {
          if (slug === "cinespace") return Promise.resolve(mockWorkspace);
          return Promise.resolve(null);
        }),
      },
      settings: {
        getOrCreate: vi.fn().mockResolvedValue(mockSettings),
        upsert: vi.fn().mockImplementation((_wsId, dto) =>
          Promise.resolve({ ...mockSettings, ...dto })
        ),
      },
      notification: {
        listWorkspaceLogs: vi.fn().mockResolvedValue(mockLogs),
      },
    };

    vi.spyOn(serverModule, "getServerServices").mockResolvedValue(mockServices);
    vi.spyOn(guards, "requireWorkspaceMember").mockResolvedValue({
      user: { id: "user_owner" } as any,
      workspace: mockWorkspace as any,
      role: "owner",
      services: mockServices,
    });
  });

  describe("getWorkspaceSettingsAction", () => {
    it("successfully loads workspace settings for valid workspace", async () => {
      const res = await getWorkspaceSettingsAction("cinespace");
      expect(res.success).toBe(true);
      expect(res.data?.notifyApprovals).toBe(true);
      expect(res.data?.defaultLinkExpirationDays).toBe(30);
      expect(mockServices.settings.getOrCreate).toHaveBeenCalledWith("ws_1");
    });

    it("returns error if workspace does not exist", async () => {
      const res = await getWorkspaceSettingsAction("unknown-workspace");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Workspace not found.");
    });
  });

  describe("updateWorkspaceNotificationSettingsAction", () => {
    it("updates notification toggles and WhatsApp number", async () => {
      const res = await updateWorkspaceNotificationSettingsAction("cinespace", {
        notifyComments: false,
        whatsappNumber: "+971509999999",
      });

      expect(res.success).toBe(true);
      expect(mockServices.settings.upsert).toHaveBeenCalledWith("ws_1", {
        notifyApprovals: undefined,
        notifyComments: false,
        notifyDownloads: undefined,
        weeklyDigest: undefined,
        whatsappNumber: "+971509999999",
        whatsappEnabled: undefined,
      });
    });

    it("requires admin permission", async () => {
      vi.spyOn(guards, "requireWorkspaceMember").mockRejectedValueOnce(
        new Error('Forbidden: Requires at least "admin" role permissions.')
      );

      const res = await updateWorkspaceNotificationSettingsAction("cinespace", {
        notifyApprovals: false,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Forbidden");
    });
  });

  describe("updateWorkspaceSecuritySettingsAction", () => {
    it("updates default link expiration days", async () => {
      const res = await updateWorkspaceSecuritySettingsAction("cinespace", {
        defaultLinkExpirationDays: 14,
      });

      expect(res.success).toBe(true);
      expect(mockServices.settings.upsert).toHaveBeenCalledWith("ws_1", {
        defaultLinkExpirationDays: 14,
      });
    });
  });

  describe("getWorkspaceNotificationLogsAction", () => {
    it("retrieves real notification audit logs", async () => {
      const res = await getWorkspaceNotificationLogsAction("cinespace");
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0].recipientEmail).toBe("client@example.com");
      expect(mockServices.notification.listWorkspaceLogs).toHaveBeenCalledWith("ws_1");
    });
  });
});

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
    whatsappNumber: "971501234567",
    whatsappEnabled: true,
    whatsappVerifiedAt: new Date().toISOString(),
    whatsappPendingNumber: "971502222222",
    whatsappCodeHash: "a1b2c3",
    whatsappCodeExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    whatsappCodeAttempts: 1,
    whatsappNotifyApprovals: true,
    whatsappNotifyComments: true,
    whatsappNotifyDownloads: true,
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
      subscription: {
        isDownloadNotificationAllowed: vi.fn().mockResolvedValue(true),
        canDeliverWhatsApp: vi.fn().mockResolvedValue(true),
      },
      whatsapp: {
        isConfigured: vi.fn().mockReturnValue(true),
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

    it("never sends the verification code hash or the full WhatsApp number to the browser", async () => {
      const res = await getWorkspaceSettingsAction("cinespace");
      const json = JSON.stringify(res.data);
      expect(json).not.toContain("a1b2c3");
      expect(json).not.toContain("971501234567");
      expect(json).not.toContain("971502222222");
      expect(res.data?.whatsapp).toMatchObject({
        available: true,
        canManage: true,
        verifiedNumber: "+971 ••• ••4567",
        pendingNumber: "+971 ••• ••2222",
        unverifiedNumber: null,
      });
    });

    it("shows a number saved before verification existed as unverified", async () => {
      mockServices.settings.getOrCreate.mockResolvedValueOnce({ ...mockSettings, whatsappVerifiedAt: null });
      const res = await getWorkspaceSettingsAction("cinespace");
      expect(res.data?.whatsapp).toMatchObject({ verifiedNumber: null, unverifiedNumber: "+971 ••• ••4567" });
    });

    it("lets only admins and owners manage the number", async () => {
      vi.spyOn(guards, "requireWorkspaceMember").mockResolvedValueOnce({
        user: { id: "user_viewer" } as any,
        workspace: mockWorkspace as any,
        role: "viewer",
        services: mockServices,
      });
      const res = await getWorkspaceSettingsAction("cinespace");
      expect(res.data?.whatsapp.canManage).toBe(false);
    });

    it("returns error if workspace does not exist", async () => {
      const res = await getWorkspaceSettingsAction("unknown-workspace");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Workspace not found.");
    });
  });

  describe("updateWorkspaceNotificationSettingsAction", () => {
    it("updates the email and WhatsApp alert switches, never the number", async () => {
      const res = await updateWorkspaceNotificationSettingsAction("cinespace", {
        notifyComments: false,
        whatsappNotifyDownloads: false,
        ...({ whatsappNumber: "+971509999999" } as object),
      });

      expect(res.success).toBe(true);
      expect(mockServices.settings.upsert).toHaveBeenCalledWith("ws_1", {
        notifyApprovals: undefined,
        notifyComments: false,
        notifyDownloads: undefined,
        weeklyDigest: undefined,
        whatsappEnabled: undefined,
        whatsappNotifyApprovals: undefined,
        whatsappNotifyComments: undefined,
        whatsappNotifyDownloads: false,
      });
    });

    it("blocks turning on a WhatsApp alert when the plan doesn't include WhatsApp", async () => {
      mockServices.subscription.canDeliverWhatsApp.mockResolvedValueOnce(false);
      const res = await updateWorkspaceNotificationSettingsAction("cinespace", { whatsappNotifyComments: true });
      expect(res.success).toBe(false);
      expect(mockServices.settings.upsert).not.toHaveBeenCalled();
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

    it("blocks enabling download notifications when plan does not include the feature", async () => {
      mockServices.subscription.isDownloadNotificationAllowed.mockResolvedValueOnce(false);

      const res = await updateWorkspaceNotificationSettingsAction("cinespace", {
        notifyDownloads: true,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Pro and Studio");
      expect(mockServices.settings.upsert).not.toHaveBeenCalled();
    });

    it("blocks enabling WhatsApp delivery when plan does not include the feature", async () => {
      mockServices.subscription.canDeliverWhatsApp.mockResolvedValueOnce(false);

      const res = await updateWorkspaceNotificationSettingsAction("cinespace", {
        whatsappEnabled: true,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Basic, Pro, and Studio");
      expect(mockServices.settings.upsert).not.toHaveBeenCalled();
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

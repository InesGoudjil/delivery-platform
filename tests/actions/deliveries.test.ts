import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createDeliveryAction,
  verifyDeliveryPasscodeAction,
  checkDeliveryAccessAction,
  updateDeliverySecurityAction,
  archiveDeliveryAction,
} from "@/app/actions/deliveries";
import * as guards from "@/core/security/guards";
import * as serverModule from "@/core/server";
import { createHash } from "crypto";
import { cookies } from "next/headers";

describe("app/actions/deliveries", () => {
  const mockDelivery = {
    id: "del_101",
    workspaceId: "ws_test",
    title: "Commercial Delivery",
    shareToken: "token_abc123",
    passcodeHash: createHash("sha256").update("secret123").digest("hex"),
    status: "in_review",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let mockAdminServices: any;
  let mockUserServices: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockAdminServices = {
      delivery: {
        getDeliveryByShareToken: vi.fn().mockResolvedValue(mockDelivery),
        getDeliveryWithFullDetails: vi.fn().mockResolvedValue({
          ...mockDelivery,
          assets: [],
        }),
      },
      auth: {
        getCurrentUser: vi.fn().mockResolvedValue(null),
      },
      member: {
        isMember: vi.fn().mockResolvedValue(false),
      },
    };

    mockUserServices = {
      workspace: {
        getWorkspaceById: vi.fn().mockResolvedValue({ id: "ws_test", slug: "ws-test" }),
      },
      delivery: {
        createDelivery: vi.fn().mockImplementation((dto) =>
          Promise.resolve({ id: "del_created", ...dto })
        ),
      },
      client: {
        listClients: vi.fn().mockResolvedValue([]),
        createClient: vi.fn().mockImplementation((dto) =>
          Promise.resolve({ id: "client_new", ...dto })
        ),
      },
      subscription: {
        canCreateProject: vi.fn().mockResolvedValue({ allowed: true, currentCount: 0, maxAllowed: 1 }),
      },
    };

    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(mockAdminServices);
    vi.spyOn(serverModule, "getServerServices").mockResolvedValue(mockUserServices);
  });

  describe("createDeliveryAction", () => {
    it("returns validation error when title or workspaceId is missing", async () => {
      const result = await createDeliveryAction("   ", "My Video");
      expect(result.error).toBeDefined();
    });

    it("returns error when user lacks workspace permissions", async () => {
      vi.spyOn(guards, "requireWorkspaceMember").mockRejectedValue(
        new Error("Forbidden: Requires at least editor role permissions.")
      );

      const result = await createDeliveryAction("ws_test", "My Video");
      expect(result.error).toContain("Forbidden");
    });

    it("creates delivery and client successfully when authorized", async () => {
      vi.spyOn(guards, "requireWorkspaceMember").mockResolvedValue({
        workspace: { id: "ws_test" },
        role: "editor",
        services: mockUserServices,
        user: { id: "user_1" },
      } as any);

      const result = await createDeliveryAction(
        "ws_test",
        "Summer Commercial",
        "Initial Cut",
        "Acme Media",
        "client@acme.com"
      );

      expect(result.delivery).toBeDefined();
      expect(result.delivery?.id).toBe("del_created");
      expect(result.delivery?.title).toBe("Summer Commercial");
      expect(mockUserServices.client.createClient).toHaveBeenCalledOnce();
      expect(mockUserServices.delivery.createDelivery).toHaveBeenCalledOnce();
    });

    it("blocks delivery creation when active client link limit is reached", async () => {
      vi.spyOn(guards, "requireWorkspaceMember").mockResolvedValue({
        workspace: { id: "ws_test" },
        role: "editor",
        services: mockUserServices,
        user: { id: "user_1" },
      } as any);

      mockUserServices.subscription.canCreateProject.mockResolvedValueOnce({
        allowed: false,
        reason: "Your current plan allows up to 1 active project link(s). Upgrade to Pro or Studio for unlimited client projects.",
      });

      const result = await createDeliveryAction(
        "ws_test",
        "Second Video",
        "Cut 2"
      );

      expect(result.error).toContain("active project link(s)");
      expect(mockUserServices.delivery.createDelivery).not.toHaveBeenCalled();
    });
  });

  describe("verifyDeliveryPasscodeAction", () => {
    it("fails when passcode is missing for protected cut", async () => {
      const result = await verifyDeliveryPasscodeAction("token_abc123", "");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Please enter the client passcode.");
    });

    it("fails when passcode does not match", async () => {
      const result = await verifyDeliveryPasscodeAction("token_abc123", "wrong_code");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Incorrect passcode");
    });

    it("succeeds when passcode matches and sets access cookie", async () => {
      const result = await verifyDeliveryPasscodeAction("token_abc123", "secret123");
      expect(result.success).toBe(true);

      const cookieStore = await cookies();
      expect(cookieStore.set).toHaveBeenCalledWith(
        "delivery_access_token_abc123",
        expect.stringMatching(/^v1:\d+:[a-f0-9]{64}$/),
        expect.any(Object)
      );
    });

    it("returns error when delivery share token is invalid or not found", async () => {
      mockAdminServices.delivery.getDeliveryByShareToken.mockResolvedValue(null);

      const result = await verifyDeliveryPasscodeAction("invalid_token", "secret123");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Delivery not found");
    });
  });

  describe("checkDeliveryAccessAction", () => {
    it("returns hasAccess: false when cookie is missing", async () => {
      const cookieStore = await cookies();
      vi.mocked(cookieStore.get).mockReturnValue(undefined);

      const result = await checkDeliveryAccessAction("token_abc123");
      expect(result.hasAccess).toBe(false);
    });

    it("returns hasAccess: true when cookie is verified with valid signature", async () => {
      const { generateDeliveryAccessToken } = await import("@/lib/security/delivery-token");
      const validToken = generateDeliveryAccessToken("token_abc123");
      const cookieStore = await cookies();
      vi.mocked(cookieStore.get).mockReturnValue({ name: "delivery_access_token_abc123", value: validToken });

      const result = await checkDeliveryAccessAction("token_abc123");
      expect(result.hasAccess).toBe(true);
    });

    it("returns hasAccess: false when cookie is forged static 'verified'", async () => {
      const cookieStore = await cookies();
      vi.mocked(cookieStore.get).mockReturnValue({ name: "delivery_access_token_abc123", value: "verified" });

      const result = await checkDeliveryAccessAction("token_abc123");
      expect(result.hasAccess).toBe(false);
    });
  });

  describe("updateDeliverySecurityAction", () => {
    it("updates isCommentAllowed and isDownloadAllowed permissions", async () => {
      const mockServices = {
        delivery: {
          updateDelivery: vi.fn().mockImplementation((id, data) =>
            Promise.resolve({
              ...mockDelivery,
              ...data,
            })
          ),
        },
        subscription: {
          isPasswordProtectionAllowed: vi.fn().mockResolvedValue(true),
          isDownloadNotificationAllowed: vi.fn().mockResolvedValue(true),
        },
      };

      vi.spyOn(guards, "requireDeliveryAccess").mockResolvedValue({
        services: mockServices as any,
        delivery: mockDelivery as any,
        workspace: { id: "ws_test" } as any,
        role: "admin",
        user: { id: "user_1" } as any,
      });

      const result = await updateDeliverySecurityAction("del_101", {
        isCommentAllowed: false,
        isDownloadAllowed: false,
      });

      expect(result.success).toBe(true);
      expect(result.isCommentAllowed).toBe(false);
      expect(result.isDownloadAllowed).toBe(false);
      expect(mockServices.delivery.updateDelivery).toHaveBeenCalledWith(
        "del_101",
        expect.objectContaining({
          isCommentAllowed: false,
          isDownloadAllowed: false,
        })
      );
    });
  });

  describe("archiveDeliveryAction", () => {
    it("rejects Silo archiving if workspace plan does not allow silo archive", async () => {
      const mockServices = {
        subscription: {
          isSiloArchiveAllowed: vi.fn().mockResolvedValue(false),
        },
        silo: {
          archiveDelivery: vi.fn(),
        },
      };

      vi.spyOn(guards, "requireDeliveryAccess").mockResolvedValue({
        services: mockServices as any,
        delivery: mockDelivery as any,
        workspace: { id: "ws_test" } as any,
        role: "admin",
        user: { id: "user_1" } as any,
      });

      const result = await archiveDeliveryAction("del_101");
      expect(result.error).toContain("The Silo Glacier Cold Storage archive requires a Studio or Enterprise plan");
      expect(mockServices.silo.archiveDelivery).not.toHaveBeenCalled();
    });
  });
});

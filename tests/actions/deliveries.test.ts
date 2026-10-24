import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createDeliveryAction,
  verifyDeliveryPasscodeAction,
  checkDeliveryAccessAction,
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
        "verified",
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

    it("returns hasAccess: true when cookie is verified", async () => {
      const cookieStore = await cookies();
      vi.mocked(cookieStore.get).mockReturnValue({ name: "delivery_access_token_abc123", value: "verified" });

      const result = await checkDeliveryAccessAction("token_abc123");
      expect(result.hasAccess).toBe(true);
    });
  });
});

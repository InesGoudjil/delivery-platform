import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createDeliveryAction,
  verifyDeliveryPasscodeAction,
  updateDeliverySecurityAction,
  archiveDeliveryAction,
} from "@/app/actions/deliveries";
import * as guards from "@/core/security/guards";
import * as serverModule from "@/core/server";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { verifyDeliveryPasscode } from "@/lib/security/passcode";
import { createRoomAccessToken, roomAccessCookieName, verifyRoomAccessToken } from "@/lib/security/delivery-token";

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
      workspace: {
        getWorkspaceById: vi.fn().mockResolvedValue({ id: "ws_test", slug: "ws-test", suspendedAt: null }),
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
    it("asks for the passcode when none is given", async () => {
      const result = await verifyDeliveryPasscodeAction("token_abc123", "");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Please enter the passcode.");
    });

    it("fails when passcode does not match", async () => {
      const result = await verifyDeliveryPasscodeAction("token_abc123", "wrong_code");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Incorrect passcode");
    });

    it("succeeds when the passcode matches and sets an unlock cookie bound to the room", async () => {
      const result = await verifyDeliveryPasscodeAction("token_abc123", "secret123");
      expect(result.success).toBe(true);

      const cookieStore = await cookies();
      expect(cookieStore.set).toHaveBeenCalledWith(
        roomAccessCookieName("token_abc123"),
        expect.stringMatching(/^v2\.\d+\.[A-Za-z0-9_-]+$/),
        expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" })
      );
      expect(roomAccessCookieName("token_abc123")).not.toContain("token_abc123");
    });

    it("rejects the stored hash when it is submitted as the passcode", async () => {
      const result = await verifyDeliveryPasscodeAction("token_abc123", mockDelivery.passcodeHash);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Incorrect passcode");
    });

    it("returns an error for an unknown share token", async () => {
      mockAdminServices.delivery.getDeliveryByShareToken.mockResolvedValue(null);

      const result = await verifyDeliveryPasscodeAction("invalid_token", "secret123");
      expect(result.success).toBe(false);
      expect(result.error).toContain("isn't valid");
    });

    it("refuses expired links, even with the right passcode", async () => {
      mockAdminServices.delivery.getDeliveryByShareToken.mockResolvedValue({
        ...mockDelivery,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      });
      const result = await verifyDeliveryPasscodeAction("token_abc123", "secret123");
      expect(result.success).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("opens the room without a passcode only for a member of the studio (checked on the server)", async () => {
      const stranger = await verifyDeliveryPasscodeAction("token_abc123", "");
      expect(stranger.success).toBe(false);

      mockUserServices.auth = { getCurrentUser: vi.fn().mockResolvedValue({ id: "user_1", email: "o@s.test" }) };
      mockUserServices.member = { getMember: vi.fn().mockResolvedValue({ role: "editor" }) };
      const member = await verifyDeliveryPasscodeAction("token_abc123", "");
      expect(member.success).toBe(true);
    });
  });

  describe("client-room unlock cookie", () => {
    const subject = { id: "del_101", shareToken: "token_abc123", passcodeHash: "scrypt$hash" };

    it("rejects a missing, forged or tampered cookie", () => {
      const valid = createRoomAccessToken(subject);
      expect(verifyRoomAccessToken(undefined, subject)).toBe(false);
      expect(verifyRoomAccessToken("verified", subject)).toBe(false);
      expect(verifyRoomAccessToken(valid.slice(0, -4) + "AAAA", subject)).toBe(false);
      expect(verifyRoomAccessToken(valid, subject)).toBe(true);
    });

    it("stops working when the passcode or the share link changes, or it expires", () => {
      const valid = createRoomAccessToken(subject);
      expect(verifyRoomAccessToken(valid, { ...subject, passcodeHash: "scrypt$other" })).toBe(false);
      expect(verifyRoomAccessToken(valid, { ...subject, shareToken: "token_rotated" })).toBe(false);
      expect(verifyRoomAccessToken(createRoomAccessToken(subject, 60), subject, Date.now() + 61_000)).toBe(false);
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

    it("stores a new passcode as a salted scrypt hash", async () => {
      const mockServices = {
        delivery: {
          updateDelivery: vi.fn().mockImplementation((id, data) =>
            Promise.resolve({ ...mockDelivery, ...data })
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

      const result = await updateDeliverySecurityAction("del_101", { passphrase: "new-code-42" });

      expect(result.success).toBe(true);
      const stored = mockServices.delivery.updateDelivery.mock.calls[0][1].passcodeHash;
      expect(stored).toMatch(/^scrypt\$/);
      expect(await verifyDeliveryPasscode("new-code-42", stored)).toBe(true);
      expect(await verifyDeliveryPasscode(stored, stored)).toBe(false);
    });
  });

  describe("link expiry plan rule (lib/security/link-expiry.ts)", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();
    const daysFromNow = (iso: string | null) => (iso === null ? null : Math.round((Date.parse(iso) - Date.now()) / DAY));

    describe("updateDeliverySecurityAction", () => {
      function setup(extended: boolean, delivery: Record<string, unknown> = mockDelivery) {
        const services = {
          delivery: {
            updateDelivery: vi.fn().mockImplementation((_id, data) => Promise.resolve({ ...delivery, ...data })),
          },
          subscription: {
            isPasswordProtectionAllowed: vi.fn().mockResolvedValue(true),
            isDownloadNotificationAllowed: vi.fn().mockResolvedValue(true),
            isExtendedLinkExpiryAllowed: vi.fn().mockResolvedValue(extended),
          },
        };
        vi.spyOn(guards, "requireDeliveryAccess").mockResolvedValue({
          services: services as any,
          delivery: delivery as any,
          workspace: { id: "ws_test" } as any,
          role: "admin",
          user: { id: "user_1" } as any,
        });
        return services;
      }

      it("lets every plan pick up to 30 days", async () => {
        const services = setup(false);
        const result = await updateDeliverySecurityAction("del_101", { expiresAt: inDays(30) });
        expect(result.success).toBe(true);
        expect(services.subscription.isExtendedLinkExpiryAllowed).not.toHaveBeenCalled();
      });

      it("refuses never, or more than 30 days, without extended link expiry", async () => {
        const services = setup(false, { ...mockDelivery, expiresAt: inDays(7) });
        for (const expiresAt of [null, inDays(90)]) {
          const result = await updateDeliverySecurityAction("del_101", { expiresAt });
          expect(result.error).toContain("Pro and Studio");
        }
        expect(services.delivery.updateDelivery).not.toHaveBeenCalled();
      });

      it("lets plans with extended link expiry make the link never expire", async () => {
        const services = setup(true, { ...mockDelivery, expiresAt: inDays(7) });
        const result = await updateDeliverySecurityAction("del_101", { expiresAt: null });
        expect(result.success).toBe(true);
        expect(services.delivery.updateDelivery).toHaveBeenCalledWith(
          "del_101",
          expect.objectContaining({ expiresAt: null })
        );
      });

      it("keeps the expiry a link already has, even one the plan couldn't set today", async () => {
        // mockDelivery never expires, like a link made before a downgrade.
        const services = setup(false);
        const result = await updateDeliverySecurityAction("del_101", { expiresAt: null, isCommentAllowed: false });
        expect(result.success).toBe(true);
        expect(services.subscription.isExtendedLinkExpiryAllowed).not.toHaveBeenCalled();
      });

      it("refuses an expiry in the past", async () => {
        const services = setup(true);
        const result = await updateDeliverySecurityAction("del_101", { expiresAt: inDays(-1) });
        expect(result.error).toContain("future");
        expect(services.delivery.updateDelivery).not.toHaveBeenCalled();
      });
    });

    describe("createDeliveryAction", () => {
      function setup(defaultLinkExpirationDays: number | null | undefined, extended: boolean) {
        mockUserServices.settings = {
          findByWorkspaceId: vi
            .fn()
            .mockResolvedValue(defaultLinkExpirationDays === undefined ? null : { defaultLinkExpirationDays }),
        };
        mockUserServices.subscription.isExtendedLinkExpiryAllowed = vi.fn().mockResolvedValue(extended);
        vi.spyOn(guards, "requireWorkspaceMember").mockResolvedValue({
          workspace: { id: "ws_test" },
          role: "editor",
          services: mockUserServices,
          user: { id: "user_1" },
        } as any);
      }

      const createdExpiry = () => mockUserServices.delivery.createDelivery.mock.calls[0][0].expiresAt;

      it("gives a new link the workspace's default lifetime", async () => {
        setup(14, false);
        await createDeliveryAction("ws_test", "Teaser");
        expect(daysFromNow(createdExpiry())).toBe(14);
        expect(mockUserServices.subscription.isExtendedLinkExpiryAllowed).not.toHaveBeenCalled();
      });

      it("makes new links never expire when that's the default and the plan allows it", async () => {
        setup(null, true);
        await createDeliveryAction("ws_test", "Teaser");
        expect(createdExpiry()).toBeNull();
      });

      it("holds never and long defaults to 30 days on plans without extended link expiry", async () => {
        for (const days of [null, 90]) {
          mockUserServices.delivery.createDelivery.mockClear();
          setup(days, false);
          await createDeliveryAction("ws_test", "Teaser");
          expect(daysFromNow(createdExpiry())).toBe(30);
        }
      });

      it("gives 30 days, not no expiry, when the settings can't be read", async () => {
        setup(undefined, true);
        mockUserServices.settings.findByWorkspaceId.mockRejectedValue(new Error("db down"));
        await createDeliveryAction("ws_test", "Teaser");
        expect(daysFromNow(createdExpiry())).toBe(30);
      });
    });
  });

  describe("archiveDeliveryAction", () => {
    const withSilo = async (enabled: boolean, run: () => Promise<void>) => {
      const { env } = await import("@/lib/env");
      const previous = env.isSiloEnabled;
      env.isSiloEnabled = enabled;
      try {
        await run();
      } finally {
        env.isSiloEnabled = previous;
      }
    };

    it("refuses while The Silo kill switch is off, before any access check", async () => {
      const { SILO_UNAVAILABLE_MESSAGE } = await import("@/core/providers/storage/silo-glacier.provider");
      const accessCheck = vi.spyOn(guards, "requireDeliveryAccess");

      await withSilo(false, async () => {
        const result = await archiveDeliveryAction("del_101");
        expect(result.error).toBe(SILO_UNAVAILABLE_MESSAGE);
      });
      expect(accessCheck).not.toHaveBeenCalled();
    });

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

      await withSilo(true, async () => {
        const result = await archiveDeliveryAction("del_101");
        expect(result.error).toContain("The Silo Glacier Cold Storage archive requires a Studio or Enterprise plan");
      });
      expect(mockServices.silo.archiveDelivery).not.toHaveBeenCalled();
    });
  });
});

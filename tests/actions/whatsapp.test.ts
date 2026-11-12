import { beforeEach, describe, expect, it, vi } from "vitest";
import * as serverModule from "@/core/server";
import * as guards from "@/core/security/guards";
import { InMemoryRatelimit } from "@/lib/upstash";
import {
  confirmWhatsAppVerificationAction,
  removeWhatsAppNumberAction,
  startWhatsAppVerificationAction,
} from "@/app/actions/whatsapp";
import { sendDeliveryWhatsAppAction } from "@/app/actions/deliveries/whatsapp";

const WS = "10000000-0000-4000-8000-00000000000a";
const DEL = "30000000-0000-4000-8000-00000000000a";
const workspace = { id: WS, slug: "studio-a", brandName: "Studio A" };

let user: any;
let admin: any;
let delivery: any;

beforeEach(() => {
  vi.restoreAllMocks();
  InMemoryRatelimit.reset();
  delivery = { id: DEL, workspaceId: WS, title: "Wedding film", shareToken: "tok", clientId: "c-1", expiresAt: null };
  user = {
    workspace: { getWorkspaceBySlug: vi.fn(async (slug: string) => (slug === "studio-a" ? workspace : null)) },
    subscription: { canDeliverWhatsApp: vi.fn(async () => true) },
    settings: { upsert: vi.fn(async () => ({})) },
    client: { updateClient: vi.fn(async () => ({})) },
  };
  admin = {
    whatsapp: {
      isConfigured: vi.fn(() => true),
      startVerification: vi.fn(async () => ({ ok: true, maskedNumber: "+971 ••• ••4567" })),
      confirmVerification: vi.fn(async () => ({ ok: true, number: "971501234567" })),
      removeNumber: vi.fn(async () => undefined),
      sendDeliveryToClient: vi.fn(async () => ({ success: true, messageId: "m-1" })),
    },
  };
  vi.spyOn(serverModule, "getServerServices").mockResolvedValue(user);
  vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(admin);
  vi.spyOn(guards, "requireWorkspaceMember").mockResolvedValue({ user: { id: "u-admin" }, services: user, workspace, role: "admin" } as any);
  vi.spyOn(guards, "requireDeliveryAccess").mockImplementation(
    async () => ({ user: { id: "u-editor" }, services: user, workspace, delivery, role: "editor" }) as any
  );
});

describe("the studio's WhatsApp number", () => {
  it("is changed only by admins and owners", async () => {
    vi.mocked(guards.requireWorkspaceMember).mockRejectedValue(new Error('Forbidden: Requires at least "admin" role permissions.'));
    expect((await startWhatsAppVerificationAction("studio-a", "+971501234567")).error).toMatch(/Forbidden/);
    expect((await confirmWhatsAppVerificationAction("studio-a", "123456")).error).toMatch(/Forbidden/);
    expect((await removeWhatsAppNumberAction("studio-a")).error).toMatch(/Forbidden/);
    expect(guards.requireWorkspaceMember).toHaveBeenCalledWith(WS, "admin");
    expect(admin.whatsapp.startVerification).not.toHaveBeenCalled();
    expect(admin.whatsapp.confirmVerification).not.toHaveBeenCalled();
    expect(admin.whatsapp.removeNumber).not.toHaveBeenCalled();
  });

  it("gets a code once the number reads right and the plan includes WhatsApp", async () => {
    expect((await startWhatsAppVerificationAction("studio-a", "call me")).success).toBe(false);
    user.subscription.canDeliverWhatsApp.mockResolvedValueOnce(false);
    expect((await startWhatsAppVerificationAction("studio-a", "+971 50 123 4567")).error).toMatch(/plans/);
    expect(admin.whatsapp.startVerification).not.toHaveBeenCalled();

    const result = await startWhatsAppVerificationAction("studio-a", "+971 50 123 4567");
    expect(result).toEqual({ success: true, pendingNumber: "+971 ••• ••4567", expiresInMinutes: 10 });
    expect(admin.whatsapp.startVerification).toHaveBeenCalledWith(WS, "971501234567");
  });

  it("limits how many codes a workspace can request", async () => {
    for (let i = 0; i < 5; i++) expect((await startWhatsAppVerificationAction("studio-a", "+971501234567")).success).toBe(true);
    expect((await startWhatsAppVerificationAction("studio-a", "+971501234567")).error).toMatch(/Too many codes/);
    expect(admin.whatsapp.startVerification).toHaveBeenCalledTimes(5);
  });

  it("is saved, and its alerts switched on, when the code is right", async () => {
    expect(await confirmWhatsAppVerificationAction("studio-a", "123456")).toEqual({ success: true, verifiedNumber: "+971 ••• ••4567" });
    expect(user.settings.upsert).toHaveBeenCalledWith(WS, { whatsappEnabled: true });

    admin.whatsapp.confirmVerification.mockResolvedValueOnce({ ok: false, error: "That code isn't right." });
    expect(await confirmWhatsAppVerificationAction("studio-a", "000000")).toEqual({ success: false, error: "That code isn't right." });
  });

  it("can be removed", async () => {
    expect(await removeWhatsAppNumberAction("studio-a")).toEqual({ success: true });
    expect(admin.whatsapp.removeNumber).toHaveBeenCalledWith(WS);
  });
});

describe("sending the review link on WhatsApp", () => {
  const send = (input: Partial<{ phone: string; clientConsent: boolean }> = {}) =>
    sendDeliveryWhatsAppAction(DEL, { phone: "+971 50 123 4567", clientConsent: true, ...input } as any);

  it("needs an editor of the delivery's workspace", async () => {
    vi.mocked(guards.requireDeliveryAccess).mockRejectedValueOnce(new Error('Forbidden: Requires at least "editor" role permissions.'));
    expect((await send()).error).toMatch(/Forbidden/);
    expect(guards.requireDeliveryAccess).toHaveBeenCalledWith(DEL, "editor");
    expect(admin.whatsapp.sendDeliveryToClient).not.toHaveBeenCalled();
  });

  it("needs the client's consent, a readable number, the plan and a live link", async () => {
    expect((await send({ clientConsent: false })).error).toMatch(/agreed/);
    expect((await send({ phone: "nope" })).error).toMatch(/number/);
    user.subscription.canDeliverWhatsApp.mockResolvedValueOnce(false);
    expect((await send()).error).toMatch(/plans/);
    delivery.expiresAt = new Date(Date.now() - 60_000).toISOString();
    expect((await send()).error).toMatch(/expired/);
    expect(admin.whatsapp.sendDeliveryToClient).not.toHaveBeenCalled();
  });

  it("says so when WhatsApp isn't set up, instead of pretending", async () => {
    admin.whatsapp.isConfigured.mockReturnValue(false);
    expect((await send()).error).toMatch(/isn't set up/);
    expect(admin.whatsapp.sendDeliveryToClient).not.toHaveBeenCalled();
  });

  it("sends the link and records who confirmed the client's consent", async () => {
    expect(await send()).toEqual({ success: true, sentTo: "+971 ••• ••4567" });
    expect(admin.whatsapp.sendDeliveryToClient).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryId: DEL, phone: "971501234567", clientId: "c-1" })
    );
    expect(user.client.updateClient).toHaveBeenCalledWith("c-1", { whatsappConsentAt: expect.any(String), whatsappConsentBy: "u-editor" });
  });

  it("doesn't record consent when the message didn't go out", async () => {
    admin.whatsapp.sendDeliveryToClient.mockResolvedValueOnce({ success: false, error: "Template is not approved" });
    expect(await send()).toEqual({ success: false, error: "Template is not approved" });
    expect(user.client.updateClient).not.toHaveBeenCalled();
  });

  it("limits how often one delivery's link is sent", async () => {
    for (let i = 0; i < 5; i++) expect((await send()).success).toBe(true);
    expect((await send()).error).toMatch(/several times/);
  });
});

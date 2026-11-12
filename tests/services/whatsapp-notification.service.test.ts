import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockWhatsAppProvider, type IWhatsAppProvider } from "@/core/providers/whatsapp";
import {
  MAX_VERIFICATION_ATTEMPTS,
  WhatsAppNotificationService,
} from "@/core/services/whatsapp-notification.service";
import { templateEnvName, type WhatsAppMessageType } from "@/core/notifications/whatsapp-templates";

const WS = "10000000-0000-4000-8000-00000000000a";
const DEL = "30000000-0000-4000-8000-00000000000a";
const STUDIO_NUMBER = "971500000099";
const ORIGIN = "https://app.test";

const TEMPLATE_KEYS: Partial<Record<string, string>> = {};
for (const type of [
  "verification_code",
  "studio_cut_approved",
  "studio_new_comments",
  "studio_client_download",
  "client_delivery_ready",
] as WhatsAppMessageType[]) {
  TEMPLATE_KEYS[templateEnvName(type, "en")] = `tpl-${type}-en`;
}

let settings: any;
let workspace: any;
let delivery: any;
let provider: IWhatsAppProvider & { sent?: any[] };
let deps: any;
let service: WhatsAppNotificationService;

function build(p: IWhatsAppProvider = new MockWhatsAppProvider()) {
  provider = p;
  deps = {
    provider,
    settingsRepo: {
      findByWorkspaceId: vi.fn(async () => settings),
      updateWhatsAppNumberState: vi.fn(async (_ws: string, state: any) => Object.assign(settings, state)),
    },
    workspaceRepo: { findById: vi.fn(async (id: string) => (id === WS ? workspace : null)) },
    deliveryRepo: { findById: vi.fn(async (id: string) => (id === DEL ? delivery : null)) },
    notificationRepo: { create: vi.fn(async (dto: any) => dto) },
    subscriptionService: { canDeliverWhatsApp: vi.fn(async () => true) },
    supabase: { rpc: vi.fn() },
  };
  service = new WhatsAppNotificationService(deps);
}

beforeEach(() => {
  Object.assign(process.env, TEMPLATE_KEYS);
  settings = {
    workspaceId: WS,
    whatsappEnabled: true,
    whatsappNumber: STUDIO_NUMBER,
    whatsappVerifiedAt: "2026-11-01T10:00:00.000Z",
    whatsappNotifyApprovals: true,
    whatsappNotifyComments: true,
    whatsappNotifyDownloads: true,
    whatsappCodeAttempts: 0,
  };
  workspace = { id: WS, slug: "studio-a", brandName: "Studio A", defaultLanguage: "en" };
  delivery = { id: DEL, workspaceId: WS, title: "Wedding film", shareToken: "share-token-a" };
  build();
});

afterEach(() => {
  for (const name of Object.keys(TEMPLATE_KEYS)) delete process.env[name];
  delete process.env[templateEnvName("studio_client_download", "ar")];
});

const sent = () => (provider as MockWhatsAppProvider).sent;

describe("studio alerts", () => {
  it("go to the verified studio number, with a link to the delivery in the studio, and are logged", async () => {
    const result = await service.notifyCutApproved({ deliveryId: DEL, approvedByName: "Sara", origin: ORIGIN });

    expect(result?.success).toBe(true);
    expect(sent()).toEqual([
      {
        to: STUDIO_NUMBER,
        templateKey: "tpl-studio_cut_approved-en",
        variables: {
          client_name: "Sara",
          delivery_title: "Wedding film",
          link: "https://app.test/studio-a/deliveries/30000000-0000-4000-8000-00000000000a",
        },
      },
    ]);
    expect(deps.notificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WS, projectId: DEL, channel: "whatsapp", recipientPhone: STUDIO_NUMBER, status: "sent" })
    );
  });

  it("are never sent to a number that wasn't verified", async () => {
    settings.whatsappVerifiedAt = null;
    expect(await service.notifyCutApproved({ deliveryId: DEL, approvedByName: "Sara", origin: ORIGIN })).toBeNull();
    expect(sent()).toEqual([]);
  });

  it("respect the alert's own switch, the pause switch and the plan", async () => {
    settings.whatsappNotifyApprovals = false;
    expect(await service.studioNumberFor(WS, "approvals")).toBeNull();
    expect(await service.studioNumberFor(WS, "downloads")).toBe(STUDIO_NUMBER);

    settings.whatsappEnabled = false;
    expect(await service.studioNumberFor(WS, "downloads")).toBeNull();

    settings.whatsappEnabled = true;
    deps.subscriptionService.canDeliverWhatsApp.mockResolvedValue(false);
    expect(await service.studioNumberFor(WS, "downloads")).toBeNull();
  });

  it("are skipped entirely while WhatsApp isn't configured", async () => {
    build({ name: "off", isConfigured: () => false, sendTemplate: vi.fn() });
    expect(await service.studioNumberFor(WS, "approvals")).toBeNull();
    expect(provider.sendTemplate).not.toHaveBeenCalled();
  });

  it("are written in English, with the English template, when the Arabic template isn't set up", async () => {
    workspace.defaultLanguage = "ar";
    await service.notifyClientDownload({ deliveryId: DEL, downloadedCount: 3, origin: ORIGIN });
    expect(sent()[0]).toMatchObject({
      templateKey: "tpl-studio_client_download-en",
      variables: { item_description: "3 files" },
    });
  });

  it("are written in Arabic when the studio works in Arabic and the template exists", async () => {
    workspace.defaultLanguage = "ar";
    process.env[templateEnvName("studio_client_download", "ar")] = "tpl-download-ar";
    await service.notifyClientDownload({ deliveryId: DEL, downloadedCount: 1, assetTitle: "Final cut", origin: ORIGIN });
    expect(sent()[0]).toMatchObject({ templateKey: "tpl-download-ar", variables: { item_description: "«Final cut»" } });
  });

  it("are logged as failed, with the reason, when the template isn't set up", async () => {
    build({ name: "zoho-cpaas", isConfigured: () => true, sendTemplate: vi.fn(async () => ({ success: true })) });
    delete process.env[templateEnvName("studio_cut_approved", "en")];
    const result = await service.notifyCutApproved({ deliveryId: DEL, origin: ORIGIN });
    expect(result).toMatchObject({ success: false, error: expect.stringMatching(/isn't set up/) });
    expect(provider.sendTemplate).not.toHaveBeenCalled();
    expect(deps.notificationRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });

  it("need no approved templates with the development mock", async () => {
    delete process.env[templateEnvName("studio_cut_approved", "en")];
    expect((await service.notifyCutApproved({ deliveryId: DEL, origin: ORIGIN }))?.success).toBe(true);
    expect(sent()[0].templateKey).toBe("mock:studio_cut_approved");
  });
});

describe("grouped comment alerts", () => {
  it("alert the studio when the database says it's time, with the count and the latest comment", async () => {
    deps.supabase.rpc.mockResolvedValueOnce({
      data: [{ send_now: true, comment_count: 1, author: "Sara", excerpt: "Trim the intro" }],
      error: null,
    });
    await service.recordClientComment({ deliveryId: DEL, authorName: "Sara", commentText: "Trim the intro\nplease", origin: ORIGIN });

    expect(deps.supabase.rpc).toHaveBeenCalledWith("record_whatsapp_comment", {
      p_delivery_id: DEL,
      p_workspace_id: WS,
      p_author: "Sara",
      p_excerpt: "Trim the intro please",
      p_gap_seconds: 900,
    });
    expect(sent()[0]).toMatchObject({
      templateKey: "tpl-studio_new_comments-en",
      variables: { client_name: "Sara", comment_count: "1", excerpt: "Trim the intro" },
    });
  });

  it("only count the comment while the studio was alerted recently", async () => {
    deps.supabase.rpc.mockResolvedValueOnce({
      data: [{ send_now: false, comment_count: 3, author: "Sara", excerpt: "x" }],
      error: null,
    });
    expect(await service.recordClientComment({ deliveryId: DEL, authorName: "Sara", commentText: "x", origin: ORIGIN })).toBeNull();
    expect(sent()).toEqual([]);
  });

  it("aren't counted at all for studios without a verified number", async () => {
    settings.whatsappVerifiedAt = null;
    await service.recordClientComment({ deliveryId: DEL, authorName: "Sara", commentText: "x", origin: ORIGIN });
    expect(deps.supabase.rpc).not.toHaveBeenCalled();
  });

  it("go out for every review session that went quiet", async () => {
    deps.supabase.rpc.mockResolvedValueOnce({
      data: [
        { delivery_id: DEL, workspace_id: WS, comment_count: 4, author: "", excerpt: "Last note" },
        { delivery_id: "30000000-0000-4000-8000-0000000000ff", workspace_id: WS, comment_count: 2, author: "X", excerpt: "y" },
      ],
      error: null,
    });
    expect(await service.flushQuietCommentBatches(ORIGIN)).toEqual({ sent: 1, failed: 0 });
    expect(deps.supabase.rpc).toHaveBeenCalledWith("claim_due_whatsapp_comment_batches", {
      p_quiet_seconds: 600,
      p_gap_seconds: 900,
      p_limit: 100,
    });
    expect(sent()[0].variables).toMatchObject({ client_name: "Your client", comment_count: "4", excerpt: "Last note" });
  });
});

describe("the review link, to a client", () => {
  it("links to the client room of that delivery and names the studio", async () => {
    const result = await service.sendDeliveryToClient({ deliveryId: DEL, phone: "+971 50 123 4567", clientId: "c-1", origin: ORIGIN });
    expect(result.success).toBe(true);
    expect(sent()[0]).toEqual({
      to: "971501234567",
      templateKey: "tpl-client_delivery_ready-en",
      variables: { studio_name: "Studio A", delivery_title: "Wedding film", link: "https://app.test/deliver/share-token-a" },
    });
    expect(deps.notificationRepo.create).toHaveBeenCalledWith(expect.objectContaining({ clientId: "c-1", recipientPhone: "971501234567" }));
  });
});

describe("verifying the studio number", () => {
  async function requestCode(number = "+971 50 999 8888") {
    const started = await service.startVerification(WS, number);
    expect(started).toEqual({ ok: true, maskedNumber: "+971 ••• ••8888" });
    return sent().at(-1)!.variables.code as string;
  }

  it("saves the number only after the code sent to it on WhatsApp comes back", async () => {
    const code = await requestCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(sent().at(-1)).toMatchObject({ to: "971509998888", templateKey: "tpl-verification_code-en" });
    expect(settings.whatsappNumber).toBe(STUDIO_NUMBER);
    expect(settings.whatsappPendingNumber).toBe("971509998888");
    expect(settings.whatsappCodeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(settings.whatsappCodeHash).not.toContain(code);

    expect(await service.confirmVerification(WS, code)).toEqual({ ok: true, number: "971509998888" });
    expect(settings).toMatchObject({
      whatsappNumber: "971509998888",
      whatsappPendingNumber: null,
      whatsappCodeHash: null,
      whatsappCodeAttempts: 0,
    });
    expect(settings.whatsappVerifiedAt).toEqual(expect.any(String));
  });

  it("counts wrong codes and locks after too many", async () => {
    const code = await requestCode();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < MAX_VERIFICATION_ATTEMPTS; i++) {
      expect(await service.confirmVerification(WS, wrong)).toEqual({ ok: false, error: "That code isn't right." });
    }
    expect(settings.whatsappCodeAttempts).toBe(MAX_VERIFICATION_ATTEMPTS);
    expect(await service.confirmVerification(WS, code)).toMatchObject({ ok: false, error: expect.stringMatching(/Too many/) });
    expect(settings.whatsappNumber).toBe(STUDIO_NUMBER);
  });

  it("refuses an expired code, and a code with nothing pending", async () => {
    const code = await requestCode();
    settings.whatsappCodeExpiresAt = new Date(Date.now() - 1000).toISOString();
    expect(await service.confirmVerification(WS, code)).toMatchObject({ ok: false, error: expect.stringMatching(/expired/) });

    settings.whatsappPendingNumber = null;
    expect(await service.confirmVerification(WS, code)).toMatchObject({ ok: false, error: "Request a new code first." });
  });

  it("ties the code to the number it was sent to", async () => {
    const code = await requestCode();
    settings.whatsappPendingNumber = "971501111111";
    expect(await service.confirmVerification(WS, code)).toMatchObject({ ok: false });
  });

  it("forgets the pending code when it couldn't be sent", async () => {
    build({ name: "failing", isConfigured: () => true, sendTemplate: vi.fn(async () => ({ success: false, error: "Zoho said no" })) });
    expect(await service.startVerification(WS, "+971 50 999 8888")).toEqual({ ok: false, error: "Zoho said no" });
    expect(settings).toMatchObject({ whatsappPendingNumber: null, whatsappCodeHash: null, whatsappCodeExpiresAt: null });
  });

  it("refuses numbers it can't read", async () => {
    expect(await service.startVerification(WS, "call me")).toMatchObject({ ok: false });
    expect(sent()).toEqual([]);
  });

  it("removes the number and anything pending", async () => {
    await service.removeNumber(WS);
    expect(settings).toMatchObject({ whatsappNumber: null, whatsappVerifiedAt: null, whatsappPendingNumber: null });
  });
});

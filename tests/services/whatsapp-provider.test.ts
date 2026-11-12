import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MockWhatsAppProvider,
  UnavailableWhatsAppProvider,
  ZohoCpaasWhatsAppProvider,
  createWhatsAppProvider,
} from "@/core/providers/whatsapp";
import { env } from "@/lib/env";

const CONFIG = { apiUrl: "https://cpaas.zoho.com/", token: "secret-token", from: "971500000001" };
const MESSAGE = { to: "971501234567", templateKey: "tpl-1", variables: { code: "123456" } };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("ZohoCpaasWhatsAppProvider", () => {
  it("sends the template and its merge fields with the Zoho token", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { data: [{ message_id: "m-1" }], message: "OK" }));
    const provider = new ZohoCpaasWhatsAppProvider(CONFIG, fetchImpl);

    const result = await provider.sendTemplate(MESSAGE);

    expect(result).toEqual({ success: true, messageId: "m-1" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://cpaas.zoho.com/v1.1/whatsapp");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Zoho-encztoken secret-token");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "971500000001",
      to: "971501234567",
      template_key: "tpl-1",
      merge_info: { code: "123456" },
    });
  });

  it("doesn't add the prefix twice to a token pasted with it", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { request_id: "r-1" }));
    const provider = new ZohoCpaasWhatsAppProvider({ ...CONFIG, token: "Zoho-encztoken abc" }, fetchImpl);
    expect(await provider.sendTemplate(MESSAGE)).toEqual({ success: true, messageId: "r-1" });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Zoho-encztoken abc");
  });

  it("returns Zoho's reason when it refuses a message", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(400, { error: { message: "Invalid request", details: [{ message: "Template is not approved" }] } })
    );
    const result = await new ZohoCpaasWhatsAppProvider(CONFIG, fetchImpl).sendTemplate(MESSAGE);
    expect(result).toEqual({ success: false, error: "Template is not approved" });
  });

  it("fails cleanly when Zoho can't be reached", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const result = await new ZohoCpaasWhatsAppProvider(CONFIG, fetchImpl).sendTemplate(MESSAGE);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Couldn't reach/);
  });

  it("refuses bad numbers and missing templates without calling Zoho", async () => {
    const fetchImpl = vi.fn();
    const provider = new ZohoCpaasWhatsAppProvider(CONFIG, fetchImpl);
    expect((await provider.sendTemplate({ ...MESSAGE, to: "+971 50" })).success).toBe(false);
    expect((await provider.sendTemplate({ ...MESSAGE, templateKey: "" })).success).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("is configured only with a token and a valid sender number", () => {
    expect(new ZohoCpaasWhatsAppProvider(CONFIG).isConfigured()).toBe(true);
    expect(new ZohoCpaasWhatsAppProvider({ ...CONFIG, token: " " }).isConfigured()).toBe(false);
    expect(new ZohoCpaasWhatsAppProvider({ ...CONFIG, from: "+971 50" }).isConfigured()).toBe(false);
  });
});

describe("createWhatsAppProvider", () => {
  const saved = { configured: env.isWhatsAppConfigured, provider: process.env.WHATSAPP_PROVIDER };

  afterEach(() => {
    (env as { isWhatsAppConfigured: boolean }).isWhatsAppConfigured = saved.configured;
    process.env.WHATSAPP_PROVIDER = saved.provider;
  });

  it("never pretends to send when WhatsApp isn't configured", async () => {
    (env as { isWhatsAppConfigured: boolean }).isWhatsAppConfigured = false;
    delete process.env.WHATSAPP_PROVIDER;
    const provider = createWhatsAppProvider();
    expect(provider).toBeInstanceOf(UnavailableWhatsAppProvider);
    expect(provider.isConfigured()).toBe(false);
    expect((await provider.sendTemplate(MESSAGE)).success).toBe(false);
  });

  it("uses the logging mock only outside production, and only when asked", () => {
    (env as { isWhatsAppConfigured: boolean }).isWhatsAppConfigured = false;
    process.env.WHATSAPP_PROVIDER = "mock";
    expect(createWhatsAppProvider()).toBeInstanceOf(MockWhatsAppProvider);
  });
});

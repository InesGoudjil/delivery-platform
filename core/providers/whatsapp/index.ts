import { env } from "@/lib/env";
import { createScopedLogger } from "@/lib/logger";

/**
 * WhatsApp messages through Zoho CPaaS (ZeptoMail's new name), from the CineSpace WhatsApp
 * Business number. Business-initiated WhatsApp messages must use a template approved by
 * Meta, so every message here is a template plus its merge fields (see
 * core/notifications/whatsapp-templates.ts and docs/notifications.md).
 *
 * The provider is an interface so another gateway (Meta's Cloud API, Twilio, …) can replace
 * Zoho in one file.
 */

const log = createScopedLogger({ provider: "WhatsApp" });

export interface WhatsAppTemplateMessage {
  /** International number, digits only ("971501234567"). */
  to: string;
  /** The template's key in Zoho CPaaS (one per message type and language). */
  templateKey: string;
  /** Merge fields, by the names the template uses. */
  variables: Record<string, string>;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IWhatsAppProvider {
  readonly name: string;
  isConfigured(): boolean;
  sendTemplate(message: WhatsAppTemplateMessage): Promise<WhatsAppSendResult>;
}

export interface ZohoCpaasConfig {
  apiUrl: string;
  token: string;
  /** The sender number registered under the WhatsApp Business Account, digits only. */
  from: string;
  timeoutMs?: number;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

function describeZohoError(data: unknown): string | undefined {
  const body = data as { error?: { message?: string; details?: { message?: string }[] }; message?: string } | null;
  const detail = body?.error?.details?.find((d) => d?.message)?.message;
  return detail || body?.error?.message || (typeof body?.message === "string" && body.message !== "OK" ? body.message : undefined);
}

export class ZohoCpaasWhatsAppProvider implements IWhatsAppProvider {
  readonly name = "zoho-cpaas";

  constructor(
    private readonly config: ZohoCpaasConfig,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init)
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.token.trim()) && /^\d{8,15}$/.test(this.config.from);
  }

  private authorization(): string {
    const token = this.config.token.trim();
    // Zoho tokens are sent as "Zoho-encztoken <key>", like ZeptoMail email.
    return /^Zoho-enc/i.test(token) ? token : `Zoho-encztoken ${token}`;
  }

  async sendTemplate(message: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) return { success: false, error: "WhatsApp isn't set up for CineSpace yet." };
    if (!/^\d{8,15}$/.test(message.to)) return { success: false, error: "That isn't a valid WhatsApp number." };
    if (!message.templateKey) return { success: false, error: "This WhatsApp message has no approved template yet." };

    const url = `${this.config.apiUrl.replace(/\/+$/, "")}/v1.1/whatsapp`;
    try {
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: this.authorization(),
        },
        body: JSON.stringify({
          from: this.config.from,
          to: message.to,
          template_key: message.templateKey,
          merge_info: message.variables,
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 10_000),
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        // Non-JSON body: the status code is all there is.
      }

      if (!response.ok) {
        const error = describeZohoError(data) || `Zoho CPaaS answered ${response.status}`;
        log.warn({ status: response.status, templateKey: message.templateKey }, "WhatsApp send refused");
        return { success: false, error };
      }

      const body = data as { request_id?: string; data?: { message_id?: string; request_id?: string }[] } | null;
      return {
        success: true,
        messageId: body?.data?.[0]?.message_id || body?.data?.[0]?.request_id || body?.request_id,
      };
    } catch (err) {
      log.warn({ err, templateKey: message.templateKey }, "WhatsApp send failed");
      return { success: false, error: "Couldn't reach the WhatsApp service. Please try again." };
    }
  }
}

/** Development only, and only when asked for (WHATSAPP_PROVIDER=mock): logs instead of sending. */
export class MockWhatsAppProvider implements IWhatsAppProvider {
  readonly name = "mock";
  readonly sent: WhatsAppTemplateMessage[] = [];

  isConfigured(): boolean {
    return true;
  }

  async sendTemplate(message: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
    this.sent.push(message);
    log.info({ to: `…${message.to.slice(-4)}`, templateKey: message.templateKey, variables: message.variables }, "[mock] WhatsApp message");
    return { success: true, messageId: `mock-${this.sent.length}` };
  }
}

/** WhatsApp isn't configured: every send fails with a clear reason (nothing pretends to work). */
export class UnavailableWhatsAppProvider implements IWhatsAppProvider {
  readonly name = "unavailable";

  isConfigured(): boolean {
    return false;
  }

  async sendTemplate(): Promise<WhatsAppSendResult> {
    return { success: false, error: "WhatsApp isn't set up for CineSpace yet." };
  }
}

export function createWhatsAppProvider(): IWhatsAppProvider {
  if (env.isWhatsAppConfigured) {
    return new ZohoCpaasWhatsAppProvider({
      apiUrl: env.ZOHO_CPAAS_API_URL || "https://cpaas.zoho.com",
      token: env.ZOHO_CPAAS_WHATSAPP_TOKEN,
      from: env.ZOHO_CPAAS_WHATSAPP_FROM.replace(/\D/g, ""),
    });
  }
  if (process.env.NODE_ENV !== "production" && process.env.WHATSAPP_PROVIDER === "mock") {
    return new MockWhatsAppProvider();
  }
  return new UnavailableWhatsAppProvider();
}

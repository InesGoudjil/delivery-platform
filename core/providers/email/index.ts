import { Resend } from "resend";
import { env } from "@/lib/env";
import {
  renderWaitlistWelcomeEmail,
  renderWaitlistInviteEmail,
} from "./templates";

export * from "./templates";

export interface SendWaitlistWelcomeParams {
  to: string;
  referralCode: string;
  position: number;
  referralLink: string;
  totalWaiting?: number;
}

export interface SendWaitlistInviteParams {
  to: string;
  inviteToken: string;
  inviteLink: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  bounceAddress?: string;
}

export interface IEmailProvider {
  sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendWaitlistWelcome(params: SendWaitlistWelcomeParams): Promise<{ success: boolean; error?: string }>;
  sendWaitlistInvite(params: SendWaitlistInviteParams): Promise<{ success: boolean; error?: string }>;
}

/**
 * Helper to parse email address strings such as:
 * - "hello@example.com"
 * - "Sarah Jenkins <sarah@example.com>"
 * - '"Sarah Jenkins" <sarah@example.com>'
 */
export function parseEmailAddress(input: string): { address: string; name?: string } {
  const trimmed = input.trim();
  const match = trimmed.match(
    /^(?:["']?([^"']+)["']?\s+)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?$/
  );
  if (match && match[2]) {
    const name = match[1]?.trim();
    const address = match[2].trim();
    return { address, ...(name ? { name } : {}) };
  }
  return { address: trimmed };
}

/**
 * Zoho ZeptoMail Email Provider
 * Delivers transactional emails via Zoho ZeptoMail REST API (v1.1) with
 * automatic token prefixing, structured error extraction, and mock fallback.
 */
export class ZeptoMailEmailProvider implements IEmailProvider {
  private apiToken: string;
  private apiUrl: string;
  private fromEmail: string;
  private fromName: string;
  private bounceAddress?: string;
  private resendFallback: Resend | null = null;
  private resendFrom: string;

  constructor(options?: {
    apiToken?: string;
    apiUrl?: string;
    fromEmail?: string;
    fromName?: string;
    bounceAddress?: string;
  }) {
    this.apiToken =
      options?.apiToken ||
      env.ZEPTOMAIL_API_TOKEN ||
      process.env.ZEPTOMAIL_API_TOKEN ||
      "";
    this.apiUrl =
      options?.apiUrl ||
      env.ZEPTOMAIL_API_URL ||
      process.env.ZEPTOMAIL_API_URL ||
      "https://api.zeptomail.com/v1.1/email";
    this.fromEmail =
      options?.fromEmail ||
      env.ZEPTOMAIL_FROM_EMAIL ||
      process.env.ZEPTOMAIL_FROM_EMAIL ||
      "noreply@cinespace.film";
    this.fromName =
      options?.fromName ||
      env.ZEPTOMAIL_FROM_NAME ||
      process.env.ZEPTOMAIL_FROM_NAME ||
      "CineSpace";
    this.bounceAddress =
      options?.bounceAddress ||
      env.ZEPTOMAIL_BOUNCE_ADDRESS ||
      process.env.ZEPTOMAIL_BOUNCE_ADDRESS ||
      undefined;

    // Resend fallback during migration if ZeptoMail token is not yet provided
    const resendKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    this.resendFrom =
      env.RESEND_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      "onboarding@resend.dev";
    if (resendKey && resendKey !== "your-resend-api-key" && resendKey.trim() !== "") {
      this.resendFallback = new Resend(resendKey);
    }
  }

  async sendEmail(
    params: SendEmailParams
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];

    // Format recipients for ZeptoMail: [{ email_address: { address, name? } }]
    const toList = recipients.map((r) => {
      const parsed = parseEmailAddress(r);
      return {
        email_address: {
          address: parsed.address,
          ...(parsed.name ? { name: parsed.name } : {}),
        },
      };
    });

    // Parse 'from' address & display name
    const parsedFrom = params.from ? parseEmailAddress(params.from) : null;
    const fromAddress = parsedFrom?.address || this.fromEmail;
    const fromName = parsedFrom?.name || this.fromName;

    // 1. Primary: If ZeptoMail API token is configured, send via ZeptoMail v1.1 REST API
    if (
      this.apiToken &&
      this.apiToken.trim() !== "" &&
      this.apiToken !== "your-zeptomail-token"
    ) {
      try {
        let authHeader = this.apiToken.trim();
        if (
          !authHeader.startsWith("Zoho-encztoken ") &&
          !authHeader.startsWith("Zoho-enczpttoken ")
        ) {
          authHeader = `Zoho-encztoken ${authHeader}`;
        }

        const payload: Record<string, any> = {
          from: {
            address: fromAddress,
            ...(fromName ? { name: fromName } : {}),
          },
          to: toList,
          subject: params.subject,
          htmlbody: params.html,
        };

        if (params.text) {
          payload.textbody = params.text;
        }

        if (params.replyTo) {
          const parsedReply = parseEmailAddress(params.replyTo);
          payload.reply_to = [
            {
              address: parsedReply.address,
              ...(parsedReply.name ? { name: parsedReply.name } : {}),
            },
          ];
        }

        const bounce = params.bounceAddress || this.bounceAddress;
        if (bounce) {
          payload.bounce_address = bounce;
        }

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify(payload),
        });

        let data: any = null;
        try {
          data = await response.json();
        } catch {
          // ignore non-JSON parse errors
        }

        if (!response.ok) {
          let errorMsg = `ZeptoMail error (${response.status}): ${response.statusText}`;
          if (data?.error) {
            const err = data.error;
            const details = Array.isArray(err.details)
              ? err.details
                  .map((d: any) => d.message || d.code)
                  .filter(Boolean)
                  .join("; ")
              : "";
            errorMsg = err.message
              ? details
                ? `${err.message} (${details})`
                : err.message
              : details || errorMsg;
          } else if (data?.message) {
            errorMsg = data.message;
          }
          console.error("[ZeptoMailEmailProvider] Failed to send email:", {
            status: response.status,
            error: errorMsg,
            response: data,
          });
          return { success: false, error: errorMsg };
        }

        const messageId =
          data?.data?.[0]?.additional_info?.[0]?.message_id ||
          data?.request_id ||
          `zepto_${Date.now()}`;

        return { success: true, messageId };
      } catch (err: any) {
        console.error("[ZeptoMailEmailProvider] Unexpected error during send:", err);
        return {
          success: false,
          error: err?.message || "Failed to send email via Zoho ZeptoMail",
        };
      }
    }

    // 2. Migration fallback: If ZeptoMail token is not set, use Resend if available
    if (this.resendFallback) {
      console.warn(
        "[ZeptoMailEmailProvider] ZEPTOMAIL_API_TOKEN is not set. Temporarily dispatching via Resend fallback."
      );
      try {
        const fromStr = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
        const { data, error } = await this.resendFallback.emails.send({
          from: fromStr || this.resendFrom,
          to: recipients,
          subject: params.subject,
          html: params.html,
          text: params.text,
          replyTo: params.replyTo,
        });

        if (error) {
          console.error(
            "[ZeptoMailEmailProvider:ResendFallback] Error from Resend API:",
            error
          );
          return { success: false, error: error.message };
        }

        return { success: true, messageId: data?.id };
      } catch (err: any) {
        console.error(
          "[ZeptoMailEmailProvider:ResendFallback] Unexpected error:",
          err
        );
        return {
          success: false,
          error: err?.message || "Failed to send email via Resend fallback",
        };
      }
    }

    // 3. Mock mode: If neither ZeptoMail nor Resend credentials are set
    const mockId = `mock_zepto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(
      `[ZeptoMailEmailProvider:Mock] Sent email:\n  To: ${toList.map((t) => t.email_address.address).join(", ")}\n  From: ${fromName ? `${fromName} <${fromAddress}>` : fromAddress}\n  Subject: ${params.subject}\n  MessageId: ${mockId}`
    );
    return { success: true, messageId: mockId };
  }

  async sendWaitlistWelcome({
    to,
    referralCode,
    position,
    referralLink,
    totalWaiting,
  }: SendWaitlistWelcomeParams): Promise<{ success: boolean; error?: string }> {
    const { subject, html } = renderWaitlistWelcomeEmail({
      position,
      referralCode,
      referralLink,
      totalWaiting,
    });

    return this.sendEmail({
      to,
      subject,
      html,
    });
  }

  async sendWaitlistInvite({
    to,
    inviteLink,
  }: SendWaitlistInviteParams): Promise<{ success: boolean; error?: string }> {
    const { subject, html } = renderWaitlistInviteEmail({
      inviteLink,
    });

    return this.sendEmail({
      to,
      subject,
      html,
    });
  }
}

// Backward compatibility alias and standard export
export { ZeptoMailEmailProvider as ResendEmailProvider };
export { ZeptoMailEmailProvider as EmailProvider };

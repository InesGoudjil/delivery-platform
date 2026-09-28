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
}

export interface IEmailProvider {
  sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendWaitlistWelcome(params: SendWaitlistWelcomeParams): Promise<{ success: boolean; error?: string }>;
  sendWaitlistInvite(params: SendWaitlistInviteParams): Promise<{ success: boolean; error?: string }>;
}

export class ResendEmailProvider implements IEmailProvider {
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor() {
    const apiKey = env.RESEND_API_KEY;
    this.fromEmail = env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (apiKey && apiKey !== "your-resend-api-key" && apiKey.trim() !== "") {
      this.resend = new Resend(apiKey);
    }
  }

  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    const from = params.from || this.fromEmail;

    if (!this.resend) {
      const mockId = `mock_email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      console.log(
        `[EmailProvider:Mock] Sent email:\n  To: ${recipients.join(", ")}\n  From: ${from}\n  Subject: ${params.subject}\n  MessageId: ${mockId}`
      );
      return { success: true, messageId: mockId };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from,
        to: recipients,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
      });

      if (error) {
        console.error("[ResendEmailProvider] Error from Resend API:", error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (err: any) {
      console.error("[ResendEmailProvider] Unexpected error sending email:", err);
      return { success: false, error: err?.message || "Failed to send email" };
    }
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


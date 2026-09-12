import { Resend } from "resend";
import { env } from "@/lib/env";

export interface SendWaitlistWelcomeParams {
  to: string;
  referralCode: string;
  position: number;
  referralLink: string;
}

export interface SendWaitlistInviteParams {
  to: string;
  inviteToken: string;
  inviteLink: string;
}

export interface IEmailProvider {
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

  async sendWaitlistWelcome({
    to,
    referralCode,
    position,
    referralLink,
  }: SendWaitlistWelcomeParams): Promise<{ success: boolean; error?: string }> {
    if (!this.resend) {
      console.log(`[EmailProvider:Mock] Welcome sent to ${to}. Position: #${position}, Code: ${referralCode}, Link: ${referralLink}`);
      return { success: true };
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `You're on the waitlist! (Position #${position})`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
            <h2>You're in line! 🎉</h2>
            <p>Thank you for joining our waitlist. Your current position is <strong>#${position}</strong>.</p>
            <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">Move up the queue by inviting friends or colleagues:</p>
              <p style="margin: 0; font-family: monospace; font-size: 16px; font-weight: bold; color: #09090b;">${referralLink}</p>
            </div>
            <p>Each person who signs up with your link bumps you higher up the list!</p>
            <p style="margin-top: 32px; font-size: 12px; color: #a1a1aa;">Cut Delivery Platform</p>
          </div>
        `,
      });
      return { success: true };
    } catch (err: any) {
      console.error("[ResendEmailProvider] Error sending welcome email:", err);
      return { success: false, error: err?.message || "Failed to send email" };
    }
  }

  async sendWaitlistInvite({
    to,
    inviteLink,
  }: SendWaitlistInviteParams): Promise<{ success: boolean; error?: string }> {
    if (!this.resend) {
      console.log(`[EmailProvider:Mock] Invite sent to ${to}. Link: ${inviteLink}`);
      return { success: true };
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `You're invited! Get access now 🚀`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
            <h2>Your spot is ready! 🚀</h2>
            <p>Great news! You have made it to the front of the waitlist.</p>
            <p>Click below to complete your registration and unlock early access:</p>
            <div style="margin: 32px 0;">
              <a href="${inviteLink}" style="background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                Claim Your Access &rarr;
              </a>
            </div>
            <p style="font-size: 13px; color: #71717a;">Or open this link directly: <br/>${inviteLink}</p>
            <p style="margin-top: 32px; font-size: 12px; color: #a1a1aa;">Cut Delivery Platform</p>
          </div>
        `,
      });
      return { success: true };
    } catch (err: any) {
      console.error("[ResendEmailProvider] Error sending invite email:", err);
      return { success: false, error: err?.message || "Failed to send email" };
    }
  }
}

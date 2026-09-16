import { NotificationLog, NotificationChannel, NotificationStatus } from "@/core/entities/notification";
import { INotificationLogRepository } from "@/core/repositories/notification.repository";
import { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import { IWorkspaceRepository } from "@/core/repositories/workspace.repository";
import { IEmailProvider } from "@/core/providers/email";

export interface DispatchWhatsAppParams {
  workspaceId: string;
  deliveryId: string;
  clientId?: string | null;
  recipientPhone: string;
  customMessage?: string;
  origin?: string;
}

export interface SendDeliveryEmailParams {
  deliveryId: string;
  recipientEmail: string;
  clientId?: string | null;
  customMessage?: string;
  origin?: string;
}

export interface NotifyCutApprovedParams {
  deliveryId: string;
  approvedByName?: string;
  recipientEmails: string | string[];
  origin?: string;
}

export interface NotifyNewFeedbackParams {
  deliveryId: string;
  recipientEmails: string | string[];
  authorName: string;
  commentText: string;
  timestampSeconds?: number | null;
  assetTitle?: string;
  origin?: string;
}

export interface SendMemberInvitationParams {
  workspaceId: string;
  recipientEmail: string;
  inviterName: string;
  inviteToken: string;
  role: string;
  origin?: string;
}

function formatSecondsToTimecode(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return "General Note";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export class NotificationService {
  constructor(
    private readonly notificationRepo: INotificationLogRepository,
    private readonly deliveryRepo: IDeliveryRepository,
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly emailProvider: IEmailProvider
  ) {}

  /**
   * Dispatches WhatsApp share URL and creates a notification audit log.
   */
  async dispatchWhatsAppDelivery(params: DispatchWhatsAppParams): Promise<{
    log: NotificationLog;
    whatsappShareUrl: string;
    messageText: string;
  }> {
    const delivery = await this.deliveryRepo.findById(params.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    const workspace = await this.workspaceRepo.findById(params.workspaceId);
    const brandName = workspace?.brandName || "Studio";

    const baseUrl = params.origin || "https://cut.app";
    const reviewLink = `${baseUrl}/deliver/${delivery.shareToken}`;

    const defaultMessage = `🎬 *${brandName}* shared a new video cut for review:\n\n*${delivery.title}*\n\n👉 Watch & leave timecoded feedback here (no login required):\n${reviewLink}`;
    const finalMessage = params.customMessage || defaultMessage;

    const cleanPhone = params.recipientPhone.replace(/[^0-9]/g, "");
    const whatsappShareUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}`;

    const log = await this.notificationRepo.create({
      workspaceId: params.workspaceId,
      projectId: params.deliveryId,
      clientId: params.clientId,
      channel: "whatsapp",
      recipientPhone: params.recipientPhone,
      status: "delivered",
    });

    return {
      log,
      whatsappShareUrl,
      messageText: finalMessage,
    };
  }

  /**
   * Sends branded video delivery review email to client via Resend.
   */
  async sendDeliveryEmail(params: SendDeliveryEmailParams): Promise<{
    success: boolean;
    log: NotificationLog;
    error?: string;
  }> {
    const delivery = await this.deliveryRepo.findById(params.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    const workspace = await this.workspaceRepo.findById(delivery.workspaceId);
    const brandName = workspace?.brandName || "Video Studio";

    const baseUrl = params.origin || "https://cut.app";
    const reviewUrl = `${baseUrl}/deliver/${delivery.shareToken}`;
    const subject = `🎬 Review: ${delivery.title} (${brandName})`;

    const customMsgHtml = params.customMessage
      ? `<div style="background-color: #18181b; border-left: 3px solid #f5551d; padding: 14px 18px; border-radius: 6px; margin: 20px 0; color: #e4e4e7; font-size: 14px; line-height: 1.5;">${params.customMessage.replace(/\n/g, "<br/>")}</div>`
      : "";

    const passcodeNotice = delivery.passcodeHash
      ? `<div style="margin: 16px 0; padding: 10px 14px; background-color: #27272a; border-radius: 6px; font-size: 13px; color: #a1a1aa;">
           🔒 <strong>Passcode Protected:</strong> This delivery requires the passcode provided by ${brandName}.
         </div>`
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"/></head>
        <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
          <div style="max-width: 580px; margin: 40px auto; background-color: #121214; border: 1px solid #27272a; border-radius: 12px; overflow: hidden;">
            <div style="padding: 24px 32px; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">${brandName}</span>
              <span style="font-size: 11px; font-family: monospace; background: #27272a; color: #a1a1aa; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">Review Cut</span>
            </div>
            <div style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff;">Your video cut is ready for review</h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #a1a1aa; line-height: 1.5;">
                <strong style="color: #f4f4f5;">${brandName}</strong> has prepared a new version for you to review and approve.
              </p>

              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; text-transform: uppercase; color: #71717a; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Project</div>
                <div style="font-size: 17px; font-weight: 600; color: #ffffff;">${delivery.title}</div>
                ${delivery.description ? `<div style="font-size: 13px; color: #a1a1aa; margin-top: 6px;">${delivery.description}</div>` : ""}
              </div>

              ${customMsgHtml}
              ${passcodeNotice}

              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${reviewUrl}" style="background-color: #f5551d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block;">
                  Watch &amp; Leave Feedback &rarr;
                </a>
              </div>

              <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">
                No login required. Click directly on the video player to pin timecoded comments.
              </p>
            </div>
            <div style="padding: 16px 32px; background-color: #0d0d0f; border-top: 1px solid #1f1f23; text-align: center;">
              <span style="font-size: 11px; color: #52525b;">Powered by Cut Delivery Platform</span>
            </div>
          </div>
        </body>
      </html>
    `;

    const sendRes = await this.emailProvider.sendEmail({
      to: params.recipientEmail,
      subject,
      html,
    });

    const log = await this.notificationRepo.create({
      workspaceId: delivery.workspaceId,
      projectId: delivery.id,
      clientId: params.clientId || delivery.clientId,
      channel: "email",
      recipientEmail: params.recipientEmail,
      subject,
      status: sendRes.success ? "sent" : "failed",
      providerMessageId: sendRes.messageId,
      errorMessage: sendRes.error,
    });

    return {
      success: sendRes.success,
      log,
      error: sendRes.error,
    };
  }

  /**
   * Notifies workspace creator/team that a client has approved the cut.
   */
  async notifyCutApproved(params: NotifyCutApprovedParams): Promise<{
    success: boolean;
    logs: NotificationLog[];
  }> {
    const delivery = await this.deliveryRepo.findById(params.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    const workspace = await this.workspaceRepo.findById(delivery.workspaceId);
    const brandName = workspace?.brandName || "Studio";
    const clientName = params.approvedByName || "Client";

    const baseUrl = params.origin || "https://cut.app";
    const dashboardUrl = `${baseUrl}/${workspace?.slug || "workspace"}/deliveries/${delivery.id}`;
    const subject = `✅ Cut Approved: "${delivery.title}" by ${clientName}`;

    const recipients = Array.isArray(params.recipientEmails)
      ? params.recipientEmails
      : [params.recipientEmails];

    if (recipients.length === 0) {
      return { success: true, logs: [] };
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"/></head>
        <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
          <div style="max-width: 580px; margin: 40px auto; background-color: #121214; border: 1px solid #27272a; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #064e3b; border-bottom: 1px solid #059669; padding: 18px 32px; color: #6ee7b7; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              ✨ Client Cut Approved
            </div>
            <div style="padding: 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                ${clientName} approved "${delivery.title}"!
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.5;">
                Congratulations! The client has officially reviewed and signed off on this cut.
              </p>

              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 12px; color: #71717a; text-transform: uppercase; font-weight: 600;">Delivery</span>
                  <span style="font-size: 12px; color: #34d399; font-weight: 600; text-transform: uppercase;">Status: Approved</span>
                </div>
                <div style="font-size: 16px; font-weight: 600; color: #ffffff;">${delivery.title}</div>
                <div style="font-size: 13px; color: #a1a1aa; margin-top: 4px;">Approved by: ${clientName}</div>
              </div>

              <div style="text-align: center; margin: 32px 0 20px 0;">
                <a href="${dashboardUrl}" style="background-color: #10b981; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block;">
                  View Delivery in Dashboard &rarr;
                </a>
              </div>
            </div>
            <div style="padding: 16px 32px; background-color: #0d0d0f; border-top: 1px solid #1f1f23; text-align: center;">
              <span style="font-size: 11px; color: #52525b;">${brandName} &bull; Cut Delivery Platform</span>
            </div>
          </div>
        </body>
      </html>
    `;

    const logs: NotificationLog[] = [];
    for (const email of recipients) {
      const sendRes = await this.emailProvider.sendEmail({
        to: email,
        subject,
        html,
      });

      const log = await this.notificationRepo.create({
        workspaceId: delivery.workspaceId,
        projectId: delivery.id,
        clientId: delivery.clientId,
        channel: "email",
        recipientEmail: email,
        subject,
        status: sendRes.success ? "sent" : "failed",
        providerMessageId: sendRes.messageId,
        errorMessage: sendRes.error,
      });
      logs.push(log);
    }

    return { success: true, logs };
  }

  /**
   * Notifies workspace team when a client leaves a timecoded comment or feedback.
   */
  async notifyNewFeedback(params: NotifyNewFeedbackParams): Promise<{
    success: boolean;
    logs: NotificationLog[];
  }> {
    const delivery = await this.deliveryRepo.findById(params.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    const workspace = await this.workspaceRepo.findById(delivery.workspaceId);
    const brandName = workspace?.brandName || "Studio";

    const baseUrl = params.origin || "https://cut.app";
    const reviewUrl = `${baseUrl}/deliver/${delivery.shareToken}`;
    const timecode = formatSecondsToTimecode(params.timestampSeconds);

    const subject = `💬 Feedback from ${params.authorName} on "${delivery.title}" [${timecode}]`;

    const recipients = Array.isArray(params.recipientEmails)
      ? params.recipientEmails
      : [params.recipientEmails];

    if (recipients.length === 0) {
      return { success: true, logs: [] };
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"/></head>
        <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
          <div style="max-width: 580px; margin: 40px auto; background-color: #121214; border: 1px solid #27272a; border-radius: 12px; overflow: hidden;">
            <div style="padding: 24px 32px; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 16px; font-weight: 700; color: #ffffff;">${delivery.title}</span>
              <span style="font-size: 12px; font-family: monospace; background: #27272a; color: #f5551d; font-weight: 700; padding: 3px 8px; border-radius: 4px;">${timecode}</span>
            </div>
            <div style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                ${params.authorName} left a new comment
              </h2>

              <div style="background-color: #18181b; border: 1px solid #27272a; border-left: 3px solid #f5551d; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                <div style="font-size: 13px; color: #a1a1aa; margin-bottom: 6px;">
                  Comment at <strong style="color: #f4f4f5;">${timecode}</strong>:
                </div>
                <div style="font-size: 15px; color: #ffffff; font-style: italic; line-height: 1.5;">
                  &ldquo;${params.commentText}&rdquo;
                </div>
              </div>

              <div style="text-align: center; margin: 32px 0 20px 0;">
                <a href="${reviewUrl}" style="background-color: #f5551d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block;">
                  Open Cut &amp; Reply &rarr;
                </a>
              </div>
            </div>
            <div style="padding: 16px 32px; background-color: #0d0d0f; border-top: 1px solid #1f1f23; text-align: center;">
              <span style="font-size: 11px; color: #52525b;">${brandName} &bull; Cut Delivery Platform</span>
            </div>
          </div>
        </body>
      </html>
    `;

    const logs: NotificationLog[] = [];
    for (const email of recipients) {
      const sendRes = await this.emailProvider.sendEmail({
        to: email,
        subject,
        html,
      });

      const log = await this.notificationRepo.create({
        workspaceId: delivery.workspaceId,
        projectId: delivery.id,
        clientId: delivery.clientId,
        channel: "email",
        recipientEmail: email,
        subject,
        status: sendRes.success ? "sent" : "failed",
        providerMessageId: sendRes.messageId,
        errorMessage: sendRes.error,
      });
      logs.push(log);
    }

    return { success: true, logs };
  }

  /**
   * Dispatches workspace collaborator invitation email with join token link.
   */
  async sendMemberInvitationEmail(params: SendMemberInvitationParams): Promise<{
    success: boolean;
    log: NotificationLog;
    error?: string;
  }> {
    const workspace = await this.workspaceRepo.findById(params.workspaceId);
    const brandName = workspace?.brandName || "Workspace";

    const baseUrl = params.origin || "https://cut.app";
    const inviteLink = `${baseUrl}/invite/${params.inviteToken}`;
    const subject = `Join ${brandName} on Cut`;

    const roleFormatted =
      params.role.charAt(0).toUpperCase() + params.role.slice(1);

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"/></head>
        <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
          <div style="max-width: 580px; margin: 40px auto; background-color: #121214; border: 1px solid #27272a; border-radius: 12px; overflow: hidden;">
            <div style="padding: 24px 32px; border-bottom: 1px solid #27272a;">
              <span style="font-size: 18px; font-weight: 700; color: #ffffff;">${brandName}</span>
            </div>
            <div style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                You've been invited to collaborate
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #a1a1aa; line-height: 1.5;">
                <strong style="color: #ffffff;">${params.inviterName}</strong> invited you to join the team on <strong style="color: #ffffff;">${brandName}</strong> as a <strong>${roleFormatted}</strong>.
              </p>

              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; text-transform: uppercase; color: #71717a; font-weight: 600; margin-bottom: 4px;">Role &amp; Permissions</div>
                <div style="font-size: 16px; font-weight: 600; color: #ffffff;">${roleFormatted}</div>
                <div style="font-size: 13px; color: #a1a1aa; margin-top: 4px;">Access client delivery reviews, video assets, and team collaboration.</div>
              </div>

              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${inviteLink}" style="background-color: #f5551d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block;">
                  Accept Invitation &rarr;
                </a>
              </div>

              <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">
                If you were not expecting this invitation, you can safely ignore this email.
              </p>
            </div>
            <div style="padding: 16px 32px; background-color: #0d0d0f; border-top: 1px solid #1f1f23; text-align: center;">
              <span style="font-size: 11px; color: #52525b;">Powered by Cut Delivery Platform</span>
            </div>
          </div>
        </body>
      </html>
    `;

    const sendRes = await this.emailProvider.sendEmail({
      to: params.recipientEmail,
      subject,
      html,
    });

    const log = await this.notificationRepo.create({
      workspaceId: params.workspaceId,
      channel: "email",
      recipientEmail: params.recipientEmail,
      subject,
      status: sendRes.success ? "sent" : "failed",
      providerMessageId: sendRes.messageId,
      errorMessage: sendRes.error,
    });

    return {
      success: sendRes.success,
      log,
      error: sendRes.error,
    };
  }

  async listWorkspaceLogs(workspaceId: string): Promise<NotificationLog[]> {
    return this.notificationRepo.listByWorkspaceId(workspaceId);
  }

  async updateLogStatus(
    id: string,
    status: NotificationStatus,
    providerMessageId?: string,
    errorMessage?: string
  ): Promise<NotificationLog> {
    return this.notificationRepo.updateStatus(id, status, providerMessageId, errorMessage);
  }
}

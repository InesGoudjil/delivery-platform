import { NotificationLog, NotificationChannel, NotificationStatus } from "@/core/entities/notification";
import { INotificationLogRepository } from "@/core/repositories/notification.repository";
import { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import { IWorkspaceRepository } from "@/core/repositories/workspace.repository";
import {
  IEmailProvider,
  renderDeliveryReviewEmail,
  renderCutApprovedEmail,
  renderNewFeedbackEmail,
  renderMemberInvitationEmail,
  renderSiloRestoreCompletedEmail,
} from "@/core/providers/email";

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

    const { subject, html } = renderDeliveryReviewEmail({
      brandName,
      projectTitle: delivery.title,
      projectDescription: delivery.description,
      reviewUrl,
      customMessage: params.customMessage,
      isPasscodeProtected: Boolean(delivery.passcodeHash),
    });

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

    const { subject, html } = renderCutApprovedEmail({
      brandName,
      projectTitle: delivery.title,
      approvedByName: clientName,
      dashboardUrl,
    });

    const recipients = Array.isArray(params.recipientEmails)
      ? params.recipientEmails
      : [params.recipientEmails];

    if (recipients.length === 0) {
      return { success: true, logs: [] };
    }

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

    const { subject, html } = renderNewFeedbackEmail({
      brandName,
      projectTitle: delivery.title,
      authorName: params.authorName,
      commentText: params.commentText,
      timecode,
      reviewUrl,
    });

    const recipients = Array.isArray(params.recipientEmails)
      ? params.recipientEmails
      : [params.recipientEmails];

    if (recipients.length === 0) {
      return { success: true, logs: [] };
    }

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

    const { subject, html } = renderMemberInvitationEmail({
      inviterName: params.inviterName,
      workspaceName: brandName,
      role: params.role,
      inviteLink,
    });

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

  /**
   * Notifies workspace creator/team that AWS S3 Glacier thawing has completed for a project.
   */
  async notifySiloRestoreCompleted(params: {
    deliveryId: string;
    recipientEmails: string | string[];
    origin?: string;
    thawedDays?: number;
  }): Promise<{
    success: boolean;
    logs: NotificationLog[];
  }> {
    const delivery = await this.deliveryRepo.findById(params.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    const workspace = await this.workspaceRepo.findById(delivery.workspaceId);
    const brandName = workspace?.brandName || "Studio";

    const baseUrl = params.origin || "https://cut.app";
    const manageUrl = `${baseUrl}/${workspace?.slug || "workspace"}/deliveries/${delivery.id}`;

    const { subject, html } = renderSiloRestoreCompletedEmail({
      projectTitle: delivery.title,
      manageUrl,
      brandName,
      thawedDays: params.thawedDays || 7,
    });

    const recipients = Array.isArray(params.recipientEmails)
      ? params.recipientEmails
      : [params.recipientEmails];

    if (recipients.length === 0) {
      return { success: true, logs: [] };
    }

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

    return {
      success: logs.some((l) => l.status === "sent"),
      logs,
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

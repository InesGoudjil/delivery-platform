import { NotificationLog, NotificationStatus } from "@/core/entities/notification";
import type { Client } from "@/core/entities/client";
import type { Delivery } from "@/core/entities/delivery";
import type { Workspace } from "@/core/entities/workspace";
import { INotificationLogRepository } from "@/core/repositories/notification.repository";
import { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import { IWorkspaceRepository } from "@/core/repositories/workspace.repository";
import type { IClientRepository } from "@/core/repositories/client.repository";
import type { IAuthEmailLookup } from "@/core/repositories/auth-user-email.repository";
import {
  IEmailProvider,
  renderSiloRestoreCompletedEmail,
  renderClientDownloadEmail,
} from "@/core/providers/email";
import { renderLibraryEmail, type EmailLayout, type EmailValues } from "@/core/notifications/render-email";
import type { LibraryEmailId } from "@/core/notifications/email-library";
import type { SubscriptionService } from "./subscription.service";
import { env } from "@/lib/env";
import { oneLine } from "@/lib/security/html";

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
  /** The filmmaker who sent the link: where the client's replies go. Defaults to the owner. */
  replyTo?: string | null;
}

/** Someone who gets a studio alert: the address to write to, and their first name for the greeting. */
export interface NotificationRecipient {
  userId: string;
  email: string;
  firstName: string | null;
}

export interface NotifyCutApprovedParams {
  deliveryId: string;
  approvedByName?: string;
  recipients: NotificationRecipient[];
  /** The delivery's current version: the highest active version of its files. */
  versionNumber: number;
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

/** What the library emails need beyond the repositories above: clients, plans and addresses. */
export interface NotificationLibraryDeps {
  clients: IClientRepository;
  subscriptions: Pick<SubscriptionService, "getCurrentPlan" | "getPlanBySlug">;
  authEmails: IAuthEmailLookup;
}

/** One library email, before it's rendered. */
export interface LibrarySend {
  emailId: LibraryEmailId;
  to: string;
  values: EmailValues;
  layout: EmailLayout;
  fromName: string;
  replyTo?: string | null;
  workspaceId: string;
  deliveryId?: string | null;
  clientId?: string | null;
}

/** Whether a client email went out, and why not when it didn't. */
export interface EmailOutcome {
  sent: boolean;
  reason?: string;
  error?: string;
  log?: NotificationLog;
}

interface ClientContext {
  delivery: Delivery;
  workspace: Workspace;
  client: Client;
  studio: string;
  deliveryLink: string;
}

/** Emails from Pedro to a filmmaker. */
const PEDRO_SENDER = "Pedro from CineSpace";
const APP_FALLBACK = "https://cut.app";
const CUSTOM_MESSAGE_MAX = 1000;
const REPLY_PREVIEW_MAX = 300;
const PREMIUM_PLANS = new Set(["pro", "studio", "enterprise"]);
/** Approval times are shown in UAE time, where the studios are. */
const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dubai",
  dateStyle: "medium",
  timeStyle: "short",
});
const DOLLARS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function appOrigin(origin?: string): string {
  return (origin || APP_FALLBACK).replace(/\/+$/, "");
}

function studioName(workspace: Pick<Workspace, "brandName"> | null | undefined): string {
  return oneLine(workspace?.brandName ?? "", 80) || "CineSpace";
}

/** "Studio Name via CineSpace": the sender name on a filmmaker's client emails. */
function clientSender(studio: string): string {
  return `${oneLine(studio.replace(/["<>]/g, ""), 60) || "CineSpace"} via CineSpace`;
}

/** Pro, Studio and Enterprise show the filmmaker's logo and colours; Starter and Basic get the footer. */
function clientLayout(workspace: Workspace, planSlug: string | null | undefined): EmailLayout {
  const premium = PREMIUM_PLANS.has(planSlug ?? "");
  return {
    kind: "client",
    brandName: studioName(workspace),
    logoUrl: premium ? (workspace.logoUrl ?? null) : null,
    accentColor: premium ? (workspace.accentColor ?? null) : null,
    footer: premium ? "none" : "delivered-with-cinespace",
  };
}

function formatTime(iso?: string | null): string {
  return TIME_FORMAT.format(iso ? new Date(iso) : new Date());
}

function clip(text: string, max: number): string {
  return Array.from(text.trim()).slice(0, max).join("");
}

export class NotificationService {
  constructor(
    private readonly notificationRepo: INotificationLogRepository,
    private readonly deliveryRepo: IDeliveryRepository,
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly emailProvider: IEmailProvider,
    private readonly library?: NotificationLibraryDeps
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
   * Sends one email from the library and logs it. Throws when a value the email needs is missing.
   */
  async sendLibraryEmail(send: LibrarySend): Promise<{ success: boolean; error?: string; log: NotificationLog }> {
    const to = send.to.trim().toLowerCase();
    const rendered = renderLibraryEmail(send.emailId, send.values, send.layout);

    const res = await this.emailProvider.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      fromName: send.fromName,
      replyTo: send.replyTo ?? undefined,
    });

    const log = await this.notificationRepo.create({
      workspaceId: send.workspaceId,
      projectId: send.deliveryId ?? null,
      clientId: send.clientId ?? null,
      channel: "email",
      recipientEmail: to,
      subject: rendered.subject,
      status: res.success ? "sent" : "failed",
      providerMessageId: res.messageId,
      errorMessage: res.error,
    });

    return { success: res.success, error: res.error, log };
  }

  /**
   * Emails the review link to a client (library email 30), from the filmmaker "via CineSpace".
   */
  async sendDeliveryEmail(params: SendDeliveryEmailParams): Promise<{
    success: boolean;
    log: NotificationLog;
    error?: string;
  }> {
    const delivery = await this.deliveryRepo.findById(params.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    const workspace = await this.workspaceRepo.findById(delivery.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const clientId = params.clientId || delivery.clientId || null;
    const client = clientId && this.library ? await this.library.clients.findById(clientId) : null;
    const plan = this.library ? await this.library.subscriptions.getCurrentPlan(workspace.id) : null;
    const studio = studioName(workspace);

    const sent = await this.sendLibraryEmail({
      emailId: "client-review-link",
      to: params.recipientEmail,
      values: {
        client_name: client?.name || "there",
        project_name: delivery.title,
        delivery_link: `${appOrigin(params.origin)}/deliver/${delivery.shareToken}`,
        filmmaker_name: studio,
        custom_message: clip(params.customMessage ?? "", CUSTOM_MESSAGE_MAX),
        passcode_required: delivery.passcodeHash ? "yes" : "",
      },
      layout: clientLayout(workspace, plan?.slug),
      fromName: clientSender(studio),
      replyTo: params.replyTo || (await this.ownerEmail(workspace)),
      workspaceId: workspace.id,
      deliveryId: delivery.id,
      clientId,
    });

    return { success: sent.success, log: sent.log, error: sent.error };
  }

  /**
   * Tells each owner and admin that a client approved the cut (library email 27), from Pedro.
   */
  async notifyCutApproved(params: NotifyCutApprovedParams): Promise<{
    success: boolean;
    logs: NotificationLog[];
  }> {
    const delivery = await this.deliveryRepo.findById(params.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    const workspace = await this.workspaceRepo.findById(delivery.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const logs: NotificationLog[] = [];
    for (const recipient of params.recipients) {
      const sent = await this.sendLibraryEmail({
        emailId: "cut-approved",
        to: recipient.email,
        values: {
          first_name: recipient.firstName || "there",
          client_name: oneLine(params.approvedByName || "", 80) || "Client",
          version_number: params.versionNumber,
          project_name: delivery.title,
          approval_timestamp: formatTime(delivery.approvedAt),
          project_link: `${appOrigin(params.origin)}/${workspace.slug}/deliveries/${delivery.id}`,
        },
        layout: { kind: "cinespace" },
        fromName: PEDRO_SENDER,
        replyTo: this.pedroReplyTo(),
        workspaceId: workspace.id,
        deliveryId: delivery.id,
        clientId: delivery.clientId ?? null,
      });
      logs.push(sent.log);
    }

    return { success: true, logs };
  }

  /**
   * Tells the studio that a client downloaded files from a delivery room.
   * `itemDescription` comes from the database (file titles), never from the browser.
   */
  async notifyClientDownload(params: {
    deliveryId: string;
    recipientEmails: string[];
    itemDescription: string;
    origin?: string;
  }): Promise<{ success: boolean; logs: NotificationLog[] }> {
    const delivery = await this.deliveryRepo.findById(params.deliveryId);
    if (!delivery) throw new Error("Delivery not found");
    if (params.recipientEmails.length === 0) return { success: true, logs: [] };

    const workspace = await this.workspaceRepo.findById(delivery.workspaceId);
    const baseUrl = params.origin || "https://cut.app";
    const { subject, html } = renderClientDownloadEmail({
      brandName: workspace?.brandName || "Studio",
      accentColor: workspace?.accentColor,
      deliveryTitle: delivery.title,
      itemDescription: params.itemDescription,
      dashboardUrl: `${baseUrl}/${workspace?.slug || "workspace"}/deliveries/${delivery.id}`,
    });

    const logs: NotificationLog[] = [];
    for (const email of params.recipientEmails) {
      const sendRes = await this.emailProvider.sendEmail({ to: email, subject, html });
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
   * Library email 26: a client commented (or replied). One email per batch, to each owner and admin,
   * from Pedro. Returns what happened for each recipient, so one failure doesn't hide the others.
   */
  async sendClientCommentsEmail(params: {
    deliveryId: string;
    recipients: NotificationRecipient[];
    clientName: string;
    commentCount: number;
    preview: string;
    versionNumber: number;
    origin?: string;
  }): Promise<Array<{ sent: boolean; error?: string }>> {
    const delivery = await this.deliveryRepo.findById(params.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    const workspace = await this.workspaceRepo.findById(delivery.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const outcomes: Array<{ sent: boolean; error?: string }> = [];
    for (const recipient of params.recipients) {
      try {
        const sent = await this.sendLibraryEmail({
          emailId: "client-comment",
          to: recipient.email,
          values: {
            first_name: recipient.firstName || "there",
            client_name: oneLine(params.clientName, 80) || "Client",
            comment_count: Math.max(1, Math.floor(params.commentCount)),
            project_name: delivery.title,
            version_number: Math.max(1, Math.floor(params.versionNumber)),
            comment_preview: oneLine(params.preview, 300) || "New comment",
            project_link: `${appOrigin(params.origin)}/${workspace.slug}/deliveries/${delivery.id}`,
          },
          layout: { kind: "cinespace" },
          fromName: PEDRO_SENDER,
          replyTo: this.pedroReplyTo(),
          workspaceId: workspace.id,
          deliveryId: delivery.id,
          clientId: delivery.clientId ?? null,
        });
        outcomes.push({ sent: sent.success, error: sent.error });
      } catch (err) {
        outcomes.push({ sent: false, error: err instanceof Error ? err.message : "Couldn't send the email." });
      }
    }
    return outcomes;
  }

  /**
   * Sends a studio invitation (library email 29) with the join link.
   */
  async sendMemberInvitationEmail(params: SendMemberInvitationParams): Promise<{
    success: boolean;
    log: NotificationLog;
    error?: string;
  }> {
    const workspace = await this.workspaceRepo.findById(params.workspaceId);

    const sent = await this.sendLibraryEmail({
      emailId: "team-invite",
      to: params.recipientEmail,
      values: {
        inviter_name: oneLine(params.inviterName, 80) || "Someone",
        studio_name: studioName(workspace),
        accept_invite_link: `${appOrigin(params.origin)}/invite/${params.inviteToken}`,
      },
      layout: { kind: "cinespace" },
      fromName: PEDRO_SENDER,
      replyTo: this.pedroReplyTo(),
      workspaceId: params.workspaceId,
    });

    return { success: sent.success, log: sent.log, error: sent.error };
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

  /** Library email 33: the client's confirmation of what they approved. */
  async notifyClientOfApproval(params: {
    deliveryId: string;
    versionNumber: number;
    origin?: string;
  }): Promise<EmailOutcome> {
    return this.sendToClient(params.deliveryId, "client-approval", { origin: params.origin }, ({ delivery }) => ({
      version_number: params.versionNumber,
      approval_timestamp: formatTime(delivery.approvedAt),
    }));
  }

  /** Library email 32: a studio reply to the client's comment. */
  async notifyClientOfReply(params: {
    deliveryId: string;
    replyPreview: string;
    origin?: string;
  }): Promise<EmailOutcome> {
    return this.sendToClient(params.deliveryId, "client-reply", { origin: params.origin }, () => ({
      reply_preview: oneLine(params.replyPreview, REPLY_PREVIEW_MAX),
    }));
  }

  /**
   * Library email 31: a new version is on the client's link. Sent only to a client who was already
   * emailed the link, so a filmmaker who is still working on the first cut doesn't alert anyone.
   */
  async notifyClientOfNewVersion(params: {
    deliveryId: string;
    versionNumber: number;
    origin?: string;
    replyTo?: string | null;
  }): Promise<EmailOutcome> {
    return this.sendToClient(
      params.deliveryId,
      "client-new-version",
      { origin: params.origin, replyTo: params.replyTo, requireLinkSent: true },
      () => ({ version_number: params.versionNumber })
    );
  }

  /**
   * Library email 14: the Free plan's one client link is in use and the filmmaker tried to add another.
   * The price comes from the Basic plan, so a price change doesn't need an edit here.
   */
  async notifyFilmmakerOfDeliveryLimit(params: {
    workspaceId: string;
    recipientEmail: string;
    firstName?: string | null;
    origin?: string;
  }): Promise<EmailOutcome> {
    const library = this.library;
    if (!library) return { sent: false, reason: "Plan emails aren't configured." };

    const workspace = await this.workspaceRepo.findById(params.workspaceId);
    if (!workspace) return { sent: false, reason: "The workspace wasn't found." };

    const basic = await library.subscriptions.getPlanBySlug("basic");
    if (!basic) return { sent: false, reason: "The Basic plan isn't set up." };

    const deliveries = await this.deliveryRepo.listByWorkspaceId(workspace.id);
    const active = deliveries.find((d) => d.status !== "archived" && d.clientId);
    const activeClient = active?.clientId ? await library.clients.findById(active.clientId) : null;

    const sent = await this.sendLibraryEmail({
      emailId: "second-client-link",
      to: params.recipientEmail,
      values: {
        first_name: params.firstName || "there",
        client_name: activeClient?.name || "a client",
        basic_price: DOLLARS.format(basic.priceCents / 100),
        upgrade_link: `${appOrigin(params.origin)}/${workspace.slug}/subscription`,
      },
      layout: { kind: "cinespace" },
      fromName: PEDRO_SENDER,
      replyTo: this.pedroReplyTo(),
      workspaceId: workspace.id,
    });

    return { sent: sent.success, error: sent.error, log: sent.log };
  }

  /** Whether an email about this delivery already went to this address: the client has the link. */
  async clientHasLinkBy(deliveryId: string, email: string): Promise<boolean> {
    return this.notificationRepo.hasSentEmailForDelivery(deliveryId, email);
  }

  /**
   * The library emails a filmmaker's client gets. Nothing is sent when the delivery has no client
   * or the client has no email address on file.
   */
  private async sendToClient(
    deliveryId: string,
    emailId: "client-approval" | "client-reply" | "client-new-version",
    options: { origin?: string; replyTo?: string | null; requireLinkSent?: boolean },
    values: (ctx: ClientContext) => EmailValues
  ): Promise<EmailOutcome> {
    const library = this.library;
    if (!library) return { sent: false, reason: "Client emails aren't configured." };

    const delivery = await this.deliveryRepo.findById(deliveryId);
    if (!delivery?.clientId) return { sent: false, reason: "The delivery has no client." };

    const client = await library.clients.findById(delivery.clientId);
    if (!client?.email) return { sent: false, reason: "The client has no email address on file." };

    if (options.requireLinkSent && !(await this.clientHasLinkBy(delivery.id, client.email))) {
      return { sent: false, reason: "The client hasn't been sent the link by email yet." };
    }

    const workspace = await this.workspaceRepo.findById(delivery.workspaceId);
    if (!workspace) return { sent: false, reason: "The workspace wasn't found." };

    const plan = await library.subscriptions.getCurrentPlan(workspace.id);
    const studio = studioName(workspace);
    const ctx: ClientContext = {
      delivery,
      workspace,
      client,
      studio,
      deliveryLink: `${appOrigin(options.origin)}/deliver/${delivery.shareToken}`,
    };

    const sent = await this.sendLibraryEmail({
      emailId,
      to: client.email,
      values: {
        client_name: client.name || "there",
        filmmaker_name: studio,
        project_name: delivery.title,
        delivery_link: ctx.deliveryLink,
        ...values(ctx),
      },
      layout: clientLayout(workspace, plan?.slug),
      fromName: clientSender(studio),
      replyTo: options.replyTo || (await this.ownerEmail(workspace)),
      workspaceId: workspace.id,
      deliveryId: delivery.id,
      clientId: client.id,
    });

    return { sent: sent.success, error: sent.error, log: sent.log };
  }

  /** The owner's address, where a client's replies go by default. */
  private async ownerEmail(workspace: Workspace): Promise<string | null> {
    if (!this.library || !workspace.ownerId) return null;
    const emails = await this.library.authEmails.emailsByUserId([workspace.ownerId]);
    return emails.get(workspace.ownerId) ?? null;
  }

  /** Replies to Pedro's emails go to EMAIL_REPLY_TO, which has to be a monitored inbox. */
  private pedroReplyTo(): string | null {
    return env.EMAIL_REPLY_TO || null;
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

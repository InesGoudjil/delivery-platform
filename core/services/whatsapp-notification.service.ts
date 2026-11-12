import { createHmac, randomInt, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IWhatsAppProvider, WhatsAppSendResult } from "@/core/providers/whatsapp";
import type { IWorkspaceSettingsRepository } from "@/core/repositories/workspace-settings.repository";
import type { IWorkspaceRepository } from "@/core/repositories/workspace.repository";
import type { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import type { INotificationLogRepository } from "@/core/repositories/notification.repository";
import type { SubscriptionService } from "./subscription.service";
import type { Delivery } from "@/core/entities/delivery";
import type { Workspace } from "@/core/entities/workspace";
import {
  WHATSAPP_TEMPLATES,
  messageLanguage,
  templateKeyFor,
  templateVariables,
  type MessageLanguage,
  type WhatsAppMessageType,
} from "@/core/notifications/whatsapp-templates";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { oneLine } from "@/lib/security/html";
import { createScopedLogger } from "@/lib/logger";

/**
 * WhatsApp notifications, sent from the CineSpace WhatsApp Business number through Zoho
 * CPaaS (see core/providers/whatsapp).
 *
 * - Studio alerts (a client approved, commented, downloaded) go to the workspace's WhatsApp
 *   number, only once it's verified with a one-time code, only for the alerts the studio
 *   turned on, and only on plans that include WhatsApp.
 * - Client comments are grouped: the first comment of a review session alerts the studio,
 *   the next ones are counted and announced together once the client goes quiet (the cron
 *   route) or at the next comment after the gap.
 * - Clients get the review link only when a studio member sends it and confirms consent.
 *
 * Every send is logged in notification_logs. Callers authorize first: this service reads and
 * writes with the service role.
 */

const log = createScopedLogger({ service: "WhatsAppNotificationService" });

export const VERIFICATION_TTL_MINUTES = 10;
export const MAX_VERIFICATION_ATTEMPTS = 5;
/** At most one comment alert per delivery in this window. */
export const COMMENT_ALERT_GAP_SECONDS = 15 * 60;
/** A review session is over after this long without a new comment. */
export const COMMENT_QUIET_SECONDS = 10 * 60;

export type StudioAlert = "approvals" | "comments" | "downloads";

export interface WhatsAppNotificationDeps {
  provider: IWhatsAppProvider;
  settingsRepo: IWorkspaceSettingsRepository;
  workspaceRepo: IWorkspaceRepository;
  deliveryRepo: IDeliveryRepository;
  notificationRepo: INotificationLogRepository;
  subscriptionService: Pick<SubscriptionService, "canDeliverWhatsApp">;
  /** Service-role client, for the comment-batch functions. */
  supabase: SupabaseClient<any>;
}

function verificationKey(): Buffer {
  const secret = process.env.DELIVERY_ACCESS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (secret.trim().length < 16) throw new Error("A server secret is needed to verify WhatsApp numbers.");
  return createHmac("sha256", secret).update("cut:whatsapp-verification:v1").digest();
}

/** Keyed hash of a code, so reading the settings row doesn't reveal it. */
export function hashVerificationCode(workspaceId: string, phone: string, code: string): string {
  return createHmac("sha256", verificationKey()).update(`${workspaceId}:${phone}:${code}`).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function baseUrl(origin: string): string {
  return origin.replace(/\/+$/, "");
}

/** Stand-ins when a name is missing, in the message's language. */
const FALLBACK_NAMES: Record<"client" | "studio", Record<MessageLanguage, string>> = {
  client: { en: "Your client", ar: "عميلك" },
  studio: { en: "Your studio", ar: "الاستوديو" },
};

export class WhatsAppNotificationService {
  constructor(private readonly deps: WhatsAppNotificationDeps) {}

  isConfigured(): boolean {
    return this.deps.provider.isConfigured();
  }

  // ---------------------------------------------------------------------------
  // Studio alerts
  // ---------------------------------------------------------------------------

  /** The verified studio number for this alert, or null when it shouldn't go to WhatsApp. */
  async studioNumberFor(workspaceId: string, alert: StudioAlert): Promise<string | null> {
    if (!this.isConfigured()) return null;
    const settings = await this.deps.settingsRepo.findByWorkspaceId(workspaceId);
    if (!settings?.whatsappEnabled || !settings.whatsappNumber || !settings.whatsappVerifiedAt) return null;
    const wanted =
      alert === "approvals"
        ? settings.whatsappNotifyApprovals
        : alert === "comments"
          ? settings.whatsappNotifyComments
          : settings.whatsappNotifyDownloads;
    if (!wanted) return null;
    if (!(await this.deps.subscriptionService.canDeliverWhatsApp(workspaceId))) return null;
    return settings.whatsappNumber;
  }

  private async context(deliveryId: string): Promise<{ delivery: Delivery; workspace: Workspace } | null> {
    const delivery = await this.deps.deliveryRepo.findById(deliveryId);
    if (!delivery) return null;
    const workspace = await this.deps.workspaceRepo.findById(delivery.workspaceId);
    return workspace ? { delivery, workspace } : null;
  }

  /** The studio's language, or English when that template has no Arabic version set up. */
  private languageFor(type: WhatsAppMessageType, workspace?: Pick<Workspace, "defaultLanguage"> | null): MessageLanguage {
    return templateKeyFor(type, messageLanguage(workspace?.defaultLanguage))?.language ?? "en";
  }

  private studioLink(origin: string, workspace: Workspace, delivery: Delivery): string {
    return `${baseUrl(origin)}/${workspace.slug}/deliveries/${delivery.id}`;
  }

  async notifyCutApproved(params: { deliveryId: string; approvedByName?: string | null; origin: string }) {
    const ctx = await this.context(params.deliveryId);
    if (!ctx) return null;
    const to = await this.studioNumberFor(ctx.workspace.id, "approvals");
    if (!to) return null;
    const language = this.languageFor("studio_cut_approved", ctx.workspace);
    return this.send("studio_cut_approved", {
      workspaceId: ctx.workspace.id,
      deliveryId: ctx.delivery.id,
      to,
      language,
      values: {
        client_name: params.approvedByName || FALLBACK_NAMES.client[language],
        delivery_title: ctx.delivery.title,
        link: this.studioLink(params.origin, ctx.workspace, ctx.delivery),
      },
    });
  }

  async notifyClientDownload(params: {
    deliveryId: string;
    downloadedCount: number;
    assetTitle?: string | null;
    origin: string;
  }) {
    const ctx = await this.context(params.deliveryId);
    if (!ctx) return null;
    const to = await this.studioNumberFor(ctx.workspace.id, "downloads");
    if (!to) return null;
    const language = this.languageFor("studio_client_download", ctx.workspace);
    const count = Math.max(1, params.downloadedCount);
    const title = params.assetTitle ? oneLine(params.assetTitle, 80) : "";
    const itemDescription =
      language === "ar"
        ? count > 1 ? `${count} ملفات` : title ? `«${title}»` : "ملفاً"
        : count > 1 ? `${count} files` : title ? `"${title}"` : "a file";
    return this.send("studio_client_download", {
      workspaceId: ctx.workspace.id,
      deliveryId: ctx.delivery.id,
      to,
      language,
      values: {
        item_description: itemDescription,
        delivery_title: ctx.delivery.title,
        link: this.studioLink(params.origin, ctx.workspace, ctx.delivery),
      },
    });
  }

  /** Counts a client comment; alerts the studio now if it wasn't alerted for this delivery recently. */
  async recordClientComment(params: { deliveryId: string; authorName: string; commentText: string; origin: string }) {
    const ctx = await this.context(params.deliveryId);
    if (!ctx) return null;
    // Count only when the alert would go out: no batch builds up for studios without WhatsApp.
    if (!(await this.studioNumberFor(ctx.workspace.id, "comments"))) return null;

    const { data, error } = await this.deps.supabase.rpc("record_whatsapp_comment", {
      p_delivery_id: ctx.delivery.id,
      p_workspace_id: ctx.workspace.id,
      p_author: oneLine(params.authorName, 80),
      p_excerpt: oneLine(params.commentText, 120),
      p_gap_seconds: COMMENT_ALERT_GAP_SECONDS,
    });
    if (error) throw new Error(`Couldn't record the comment alert: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.send_now) return null;
    return this.sendCommentAlert(ctx, row.comment_count, row.author, row.excerpt, params.origin);
  }

  /** Announces the comments of review sessions that have gone quiet. Run every few minutes. */
  async flushQuietCommentBatches(origin: string): Promise<{ sent: number; failed: number }> {
    const { data, error } = await this.deps.supabase.rpc("claim_due_whatsapp_comment_batches", {
      p_quiet_seconds: COMMENT_QUIET_SECONDS,
      p_gap_seconds: COMMENT_ALERT_GAP_SECONDS,
      p_limit: 100,
    });
    if (error) throw new Error(`Couldn't read pending comment alerts: ${error.message}`);

    let sent = 0;
    let failed = 0;
    for (const row of (data as Array<{ delivery_id: string; comment_count: number; author: string; excerpt: string }>) ?? []) {
      const ctx = await this.context(row.delivery_id);
      if (!ctx) continue;
      const result = await this.sendCommentAlert(ctx, row.comment_count, row.author, row.excerpt, origin).catch((err) => {
        log.warn({ err, deliveryId: row.delivery_id }, "Comment alert failed");
        return null;
      });
      if (result?.success) sent++;
      else if (result) failed++;
    }
    return { sent, failed };
  }

  private async sendCommentAlert(
    ctx: { delivery: Delivery; workspace: Workspace },
    count: number,
    author: string,
    excerpt: string,
    origin: string
  ) {
    const to = await this.studioNumberFor(ctx.workspace.id, "comments");
    if (!to) return null;
    const language = this.languageFor("studio_new_comments", ctx.workspace);
    return this.send("studio_new_comments", {
      workspaceId: ctx.workspace.id,
      deliveryId: ctx.delivery.id,
      to,
      language,
      values: {
        client_name: author || FALLBACK_NAMES.client[language],
        comment_count: String(Math.max(1, count)),
        delivery_title: ctx.delivery.title,
        excerpt: excerpt || "…",
        link: this.studioLink(origin, ctx.workspace, ctx.delivery),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // The review link, to a client
  // ---------------------------------------------------------------------------

  /** Sends the client room link. The caller checked the role, the plan and the client's consent. */
  async sendDeliveryToClient(params: { deliveryId: string; phone: string; clientId?: string | null; origin: string }) {
    const ctx = await this.context(params.deliveryId);
    if (!ctx) return { success: false, error: "Delivery not found." } satisfies WhatsAppSendResult;
    const to = normalizePhone(params.phone);
    if (!to) return { success: false, error: "That isn't a valid WhatsApp number." } satisfies WhatsAppSendResult;
    const language = this.languageFor("client_delivery_ready", ctx.workspace);
    return this.send("client_delivery_ready", {
      workspaceId: ctx.workspace.id,
      deliveryId: ctx.delivery.id,
      clientId: params.clientId ?? null,
      to,
      language,
      values: {
        studio_name: ctx.workspace.brandName || FALLBACK_NAMES.studio[language],
        delivery_title: ctx.delivery.title,
        link: `${baseUrl(params.origin)}/deliver/${ctx.delivery.shareToken}`,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Verifying the studio number
  // ---------------------------------------------------------------------------

  async startVerification(
    workspaceId: string,
    phoneInput: string
  ): Promise<{ ok: true; maskedNumber: string } | { ok: false; error: string }> {
    if (!this.isConfigured()) return { ok: false, error: "WhatsApp isn't set up for CineSpace yet." };
    const phone = normalizePhone(phoneInput);
    if (!phone) return { ok: false, error: "Enter a WhatsApp number with its country code, e.g. +971 50 123 4567." };

    const workspace = await this.deps.workspaceRepo.findById(workspaceId);
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await this.deps.settingsRepo.updateWhatsAppNumberState(workspaceId, {
      whatsappPendingNumber: phone,
      whatsappCodeHash: hashVerificationCode(workspaceId, phone, code),
      whatsappCodeExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60_000).toISOString(),
      whatsappCodeAttempts: 0,
    });

    const result = await this.send("verification_code", {
      workspaceId,
      to: phone,
      language: this.languageFor("verification_code", workspace),
      values: { code },
    });
    if (!result.success) {
      await this.deps.settingsRepo.updateWhatsAppNumberState(workspaceId, {
        whatsappPendingNumber: null,
        whatsappCodeHash: null,
        whatsappCodeExpiresAt: null,
      });
      return { ok: false, error: result.error || "Couldn't send the code. Please try again." };
    }
    return { ok: true, maskedNumber: maskPhone(phone) };
  }

  async confirmVerification(
    workspaceId: string,
    codeInput: string
  ): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
    const code = (codeInput || "").replace(/\D/g, "");
    const settings = await this.deps.settingsRepo.findByWorkspaceId(workspaceId);
    const pending = settings?.whatsappPendingNumber;
    if (!settings || !pending || !settings.whatsappCodeHash || !settings.whatsappCodeExpiresAt) {
      return { ok: false, error: "Request a new code first." };
    }
    if (new Date(settings.whatsappCodeExpiresAt).getTime() < Date.now()) {
      return { ok: false, error: "This code has expired. Request a new one." };
    }
    const attempts = settings.whatsappCodeAttempts ?? 0;
    if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
      return { ok: false, error: "Too many wrong codes. Request a new one." };
    }
    if (code.length !== 6 || !sameHash(hashVerificationCode(workspaceId, pending, code), settings.whatsappCodeHash)) {
      await this.deps.settingsRepo.updateWhatsAppNumberState(workspaceId, { whatsappCodeAttempts: attempts + 1 });
      return { ok: false, error: "That code isn't right." };
    }

    await this.deps.settingsRepo.updateWhatsAppNumberState(workspaceId, {
      whatsappNumber: pending,
      whatsappVerifiedAt: new Date().toISOString(),
      whatsappPendingNumber: null,
      whatsappCodeHash: null,
      whatsappCodeExpiresAt: null,
      whatsappCodeAttempts: 0,
    });
    return { ok: true, number: pending };
  }

  async removeNumber(workspaceId: string): Promise<void> {
    await this.deps.settingsRepo.updateWhatsAppNumberState(workspaceId, {
      whatsappNumber: null,
      whatsappVerifiedAt: null,
      whatsappPendingNumber: null,
      whatsappCodeHash: null,
      whatsappCodeExpiresAt: null,
      whatsappCodeAttempts: 0,
    });
  }

  // ---------------------------------------------------------------------------

  private async send(
    type: WhatsAppMessageType,
    params: {
      workspaceId: string;
      deliveryId?: string | null;
      clientId?: string | null;
      to: string;
      language: MessageLanguage;
      values: Record<string, string>;
    }
  ): Promise<WhatsAppSendResult> {
    // The development mock needs no approved templates.
    const template =
      templateKeyFor(type, params.language) ??
      (this.deps.provider.name === "mock" ? { key: `mock:${type}`, language: params.language } : null);
    const result: WhatsAppSendResult = template
      ? await this.deps.provider.sendTemplate({
          to: params.to,
          templateKey: template.key,
          variables: templateVariables(type, params.values),
        })
      : { success: false, error: "This WhatsApp message isn't set up yet (no approved template)." };

    await this.deps.notificationRepo
      .create({
        workspaceId: params.workspaceId,
        projectId: params.deliveryId ?? null,
        clientId: params.clientId ?? null,
        channel: "whatsapp",
        recipientPhone: params.to,
        subject: WHATSAPP_TEMPLATES[type].label,
        status: result.success ? "sent" : "failed",
        providerMessageId: result.messageId ?? null,
        errorMessage: result.error ?? null,
      })
      .catch((err) => log.warn({ err, type }, "Couldn't log a WhatsApp message"));

    if (!result.success) log.warn({ type, error: result.error }, "WhatsApp message not sent");
    return result;
  }
}

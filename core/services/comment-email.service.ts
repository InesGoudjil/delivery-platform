import type { SupabaseClient } from "@supabase/supabase-js";
import type { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import type { IWorkspaceRepository } from "@/core/repositories/workspace.repository";
import type { IWorkspaceSettingsRepository } from "@/core/repositories/workspace-settings.repository";
import type { NotificationService } from "./notification.service";
import type { MemberService } from "./member.service";
import { oneLine } from "@/lib/security/html";
import { createScopedLogger } from "@/lib/logger";

/**
 * Client comments and replies, emailed to the studio in batches (library email 26): the first
 * comment on a delivery opens a window of ten minutes, the comments made in it are counted, and
 * one email goes out when the window closes. The scheduled notifications route calls flushDue.
 *
 * Callers authorize first. The batch functions are service role only, so this service is only
 * built with the service-role client.
 */

const log = createScopedLogger({ service: "CommentEmailService" });

/** Comments made within this many seconds of the first one go into one email. */
export const COMMENT_EMAIL_WINDOW_SECONDS = 10 * 60;
/** Batches handed over per scheduled run; the rest wait for the next one. */
const CLAIM_LIMIT = 100;

export interface CommentEmailDeps {
  supabase: SupabaseClient;
  notificationService: NotificationService;
  memberService: Pick<MemberService, "listNotificationRecipients">;
  settingsRepo: IWorkspaceSettingsRepository;
  deliveryRepo: IDeliveryRepository;
  workspaceRepo: IWorkspaceRepository;
}

/** A closed batch, as claim_due_comment_email_batches returns it. */
interface ClaimedBatch {
  delivery_id: string;
  workspace_id: string;
  comment_count: number;
  author: string | null;
  excerpt: string | null;
  version_number: number;
}

export type BatchOutcome = "sent" | "failed" | "skipped";

export class CommentEmailService {
  constructor(private readonly deps: CommentEmailDeps) {}

  /**
   * Counts a client's comment or reply into the delivery's open window. Opens the window when the
   * delivery has none. Nothing is sent here: flushDue sends the batch when the window closes.
   */
  async record(params: {
    deliveryId: string;
    authorName: string;
    commentText: string;
    versionNumber: number;
  }): Promise<void> {
    const delivery = await this.deps.deliveryRepo.findById(params.deliveryId);
    if (!delivery) return;

    const { error } = await this.deps.supabase.rpc("record_comment_email", {
      p_delivery_id: delivery.id,
      p_workspace_id: delivery.workspaceId,
      p_author: oneLine(params.authorName, 80) || "Client",
      p_excerpt: oneLine(params.commentText, 300) || "New comment",
      p_version_number: Math.max(1, Math.floor(params.versionNumber)),
      p_window_seconds: COMMENT_EMAIL_WINDOW_SECONDS,
    });
    if (error) throw new Error(`Couldn't record the comment for email: ${error.message}`);
  }

  /**
   * Emails the studio the batches whose window has closed. A batch is handed over once, so a second
   * run never sends it again. Run from the scheduled notifications route.
   */
  async flushDue(origin: string): Promise<{ sent: number; skipped: number; failed: number }> {
    const { data, error } = await this.deps.supabase.rpc("claim_due_comment_email_batches", {
      p_limit: CLAIM_LIMIT,
    });
    if (error) throw new Error(`Couldn't read the comment batches: ${error.message}`);

    const result = { sent: 0, skipped: 0, failed: 0 };
    for (const batch of (data ?? []) as ClaimedBatch[]) {
      try {
        const outcome = await this.sendBatch(batch, origin);
        result[outcome === "sent" ? "sent" : outcome === "failed" ? "failed" : "skipped"]++;
      } catch (err) {
        result.failed++;
        log.warn({ err, deliveryId: batch.delivery_id }, "A comment batch couldn't be emailed");
      }
    }
    return result;
  }

  private async sendBatch(batch: ClaimedBatch, origin: string): Promise<BatchOutcome> {
    const delivery = await this.deps.deliveryRepo.findById(batch.delivery_id);
    const workspace = delivery ? await this.deps.workspaceRepo.findById(delivery.workspaceId) : null;
    if (!delivery || !workspace) return "skipped";

    // The studio's switch for comment alerts: off means nothing is sent, and the batch is dropped.
    const settings = await this.deps.settingsRepo.findByWorkspaceId(workspace.id);
    if (settings && !settings.notifyComments) return "skipped";

    const recipients = await this.deps.memberService.listNotificationRecipients(workspace.id, ["owner", "admin"]);
    if (recipients.length === 0) return "skipped";

    const outcomes = await this.deps.notificationService.sendClientCommentsEmail({
      deliveryId: delivery.id,
      recipients,
      clientName: batch.author || "Client",
      commentCount: batch.comment_count,
      preview: batch.excerpt || "New comment",
      versionNumber: batch.version_number,
      origin,
    });
    return outcomes.some((outcome) => outcome.sent) ? "sent" : "failed";
  }
}

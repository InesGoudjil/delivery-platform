"use server";

import { revalidatePath } from "next/cache";
import type { Feedback, FeedbackReply } from "@/core/entities/feedback";
import { actorViewer, resolveDeliveryActor, type DeliveryActor } from "./deliveries/room-access";
import { resolveRequestOrigin } from "./deliveries/helpers";
import { feedbackInDelivery, replyInDelivery, versionInDelivery } from "@/lib/client-room/scope";
import { canModifyComment, type RoomViewer } from "@/lib/client-room/content";
import { ensureGuestAuthorKeyHash } from "@/lib/security/delivery-token";
import {
  addFeedbackSchema,
  addFeedbackReplySchema,
  toggleFeedbackResolvedSchema,
  updateFeedbackSchema,
  updateFeedbackReplySchema,
  safeValidate,
  type AddFeedbackInput,
  type AddFeedbackReplyInput,
  type UpdateFeedbackInput,
  type UpdateFeedbackReplyInput,
} from "@/lib/validations";
import { checkRateLimit, getClientIp, RATELIMIT_POLICIES } from "@/lib/upstash";
import { normalizeActionError } from "./safe-action";
import { runAfterResponse } from "@/lib/after-response";

/**
 * Comments and replies, from the client room (share token: guests and members) or the
 * studio (delivery id: members only).
 *
 * Every id the caller sends is loaded and checked against the delivery they're
 * authorized for before anything is written. Members write through their own session
 * (RLS: they post as themselves; the author or an editor edits, resolves and deletes).
 * Guests write with the service role, and may change only comments written from their
 * own browser (the guest author key cookie).
 */


type FeedbackDto = ReturnType<typeof feedbackDto>;
type ReplyDto = ReturnType<typeof replyDto>;

/** One result shape for every comment action, so callers can read `error` directly. */
export interface FeedbackActionResult {
  success?: boolean;
  error?: string;
  feedback?: FeedbackDto;
  reply?: ReplyDto;
}

const CHANGE_REFUSED = "You can only change your own comments.";

interface DeliveryRef {
  shareToken?: string | null;
  deliveryId?: string | null;
}

const viewerFor = actorViewer;

function cleanName(name: string | null | undefined): string {
  return (name || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 80);
}

async function authorNameFor(actor: DeliveryActor, requested?: string): Promise<string> {
  const chosen = cleanName(requested);
  if (actor.kind === "guest") return chosen || "Client";
  if (chosen) return chosen;
  const profile = await actor.services.profile.getProfile(actor.userId).catch(() => null);
  return cleanName(profile?.fullName) || "Studio";
}

function replyDto(reply: FeedbackReply, canModify = true) {
  return {
    id: reply.id,
    feedbackId: reply.feedbackId,
    authorName: reply.authorName,
    commentText: reply.commentText,
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt,
    canModify,
  };
}

function feedbackDto(feedback: Feedback, viewer?: RoomViewer) {
  return {
    id: feedback.id,
    assetVersionId: feedback.assetVersionId,
    authorName: feedback.authorName,
    commentText: feedback.commentText,
    timestampSeconds: feedback.timestampSeconds ?? null,
    isResolved: feedback.isResolved,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
    canModify: viewer ? canModifyComment(viewer, feedback) : true,
    replies: (feedback.replies || []).map((r) => replyDto(r, viewer ? canModifyComment(viewer, r) : true)),
  };
}

function revalidateRoom(actor: DeliveryActor) {
  revalidatePath(`/deliver/${actor.delivery.shareToken}`);
  revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
  revalidatePath("/[workspaceSlug]/deliveries", "page");
}

/** Guests are limited per visitor and room; signed-in members aren't. */
async function limitComments(actor: DeliveryActor): Promise<string | null> {
  if (actor.kind === "member") return null;
  const rateLimit = await checkRateLimit({
    policy: RATELIMIT_POLICIES.feedbackAdd,
    identifier: [await getClientIp(), actor.delivery.id],
  });
  return rateLimit.success ? null : rateLimit.error || "Too many comments. Please slow down.";
}

/**
 * A client's comment or reply counts toward the studio's batched email (library 26), sent ten
 * minutes after the first one. Only a client's words: a studio member's comment isn't news to the studio.
 */
function recordClientComment(
  actor: DeliveryActor,
  input: { assetVersionId: string; authorName: string; commentText: string }
) {
  if (actor.kind !== "guest") return;
  runAfterResponse("email:client-comment", async () => {
    const version = await actor.adminServices.asset.getVersionById(input.assetVersionId);
    return actor.adminServices.commentEmail.record({
      deliveryId: actor.delivery.id,
      authorName: input.authorName,
      commentText: input.commentText,
      versionNumber: version?.versionNumber ?? 1,
    });
  });
}

/** A client comment or reply counts toward the studio's grouped WhatsApp alert. */
function countForWhatsApp(actor: DeliveryActor, authorName: string, commentText: string) {
  if (actor.kind !== "guest") return;
  runAfterResponse("whatsapp:comment", async () =>
    actor.adminServices.whatsapp.recordClientComment({
      deliveryId: actor.delivery.id,
      authorName,
      commentText,
      origin: await resolveRequestOrigin(),
    })
  );
}

/** Only a studio member's reply is emailed: a client's own reply isn't news to the client. */
function emailClientAboutReply(actor: DeliveryActor, replyText: string) {
  if (actor.kind !== "member") return;
  runAfterResponse("email:client-reply", async () =>
    actor.adminServices.notification.notifyClientOfReply({
      deliveryId: actor.delivery.id,
      replyPreview: replyText,
      origin: await resolveRequestOrigin(),
    })
  );
}

async function addReplyAs(
  actor: DeliveryActor,
  feedbackId: string,
  commentText: string,
  requestedName?: string
): Promise<FeedbackActionResult> {
  const { feedback } = await feedbackInDelivery(actor.adminServices, actor.delivery, feedbackId);
  const authorName = await authorNameFor(actor, requestedName);

  const reply =
    actor.kind === "guest"
      ? await actor.services.feedback.addReply({
          feedbackId: feedback.id,
          authorUserId: null,
          guestAuthorKeyHash: await ensureGuestAuthorKeyHash(actor.shareToken),
          authorName,
          commentText,
        })
      : await actor.services.feedback.addReply({
          feedbackId: feedback.id,
          authorUserId: actor.userId,
          authorName,
          commentText,
        });

  countForWhatsApp(actor, authorName, commentText);
  // A studio reply to a client's comment: the client gets it by email (library 32).
  if (!feedback.authorUserId) emailClientAboutReply(actor, commentText);
  recordClientComment(actor, { assetVersionId: feedback.assetVersionId, authorName, commentText });
  revalidateRoom(actor);
  return { success: true, reply: replyDto(reply) };
}

export async function addFeedbackAction(params: AddFeedbackInput): Promise<FeedbackActionResult> {
  try {
    const validated = safeValidate(addFeedbackSchema, params);
    if (!validated.success) return { error: validated.error };
    const { assetVersionId, authorName, commentText, timestampSeconds, parentId, shareToken, deliveryId } = validated.data;
    if (!shareToken && !deliveryId) return { error: "Open the delivery to leave a comment." };

    const actor = await resolveDeliveryActor({ shareToken, deliveryId }, "comment");
    const limited = await limitComments(actor);
    if (limited) return { error: limited };

    // Older clients send replies through this action with a parentId.
    if (parentId) return await addReplyAs(actor, parentId, commentText, authorName);

    await versionInDelivery(actor.adminServices, actor.delivery, assetVersionId);
    const name = await authorNameFor(actor, authorName);

    const feedback =
      actor.kind === "guest"
        ? await actor.services.feedback.addFeedback({
            assetVersionId,
            authorUserId: null,
            guestAuthorKeyHash: await ensureGuestAuthorKeyHash(actor.shareToken),
            authorName: name,
            commentText,
            timestampSeconds,
          })
        : await actor.services.feedback.addFeedback({
            assetVersionId,
            authorUserId: actor.userId,
            authorName: name,
            commentText,
            timestampSeconds,
          });

    recordClientComment(actor, { assetVersionId, authorName: name, commentText });
    countForWhatsApp(actor, name, commentText);
    revalidateRoom(actor);
    return { success: true, feedback: feedbackDto(feedback) };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to add feedback.") };
  }
}

export async function addFeedbackReplyAction(params: AddFeedbackReplyInput): Promise<FeedbackActionResult> {
  try {
    const validated = safeValidate(addFeedbackReplySchema, params);
    if (!validated.success) return { error: validated.error };
    const { feedbackId, commentText, authorName, shareToken, deliveryId } = validated.data;
    if (!shareToken && !deliveryId) return { error: "Open the delivery to reply." };

    const actor = await resolveDeliveryActor({ shareToken, deliveryId }, "comment");
    const limited = await limitComments(actor);
    if (limited) return { error: limited };

    return await addReplyAs(actor, feedbackId, commentText, authorName);
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to add reply.") };
  }
}

export async function deleteFeedbackReplyAction(replyId: string, shareToken?: string, deliveryId?: string): Promise<FeedbackActionResult> {
  try {
    if (!replyId?.trim()) return { error: "Reply ID is required." };
    const actor = await resolveDeliveryActor({ shareToken, deliveryId } satisfies DeliveryRef, "view");
    const { reply } = await replyInDelivery(actor.adminServices, actor.delivery, replyId.trim());
    if (!canModifyComment(await viewerFor(actor), reply)) return { error: CHANGE_REFUSED };

    await actor.services.feedback.deleteReply(reply.id);
    revalidateRoom(actor);
    return { success: true };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to delete reply.") };
  }
}

export async function updateFeedbackReplyAction(params: UpdateFeedbackReplyInput): Promise<FeedbackActionResult> {
  try {
    const validated = safeValidate(updateFeedbackReplySchema, params);
    if (!validated.success) return { error: validated.error };
    const { replyId, commentText, shareToken, deliveryId } = validated.data;

    const actor = await resolveDeliveryActor({ shareToken, deliveryId }, "comment");
    const { reply } = await replyInDelivery(actor.adminServices, actor.delivery, replyId);
    if (!canModifyComment(await viewerFor(actor), reply)) return { error: CHANGE_REFUSED };

    const updated = await actor.services.feedback.updateReply(reply.id, commentText);
    revalidateRoom(actor);
    return { success: true, reply: replyDto(updated) };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to update reply.") };
  }
}

export async function toggleFeedbackResolvedAction(
  feedbackId: string,
  isResolved: boolean,
  shareToken?: string,
  deliveryId?: string
): Promise<FeedbackActionResult> {
  try {
    const validated = safeValidate(toggleFeedbackResolvedSchema, { feedbackId, isResolved, shareToken, deliveryId });
    if (!validated.success) return { error: validated.error };

    const actor = await resolveDeliveryActor(
      { shareToken: validated.data.shareToken, deliveryId: validated.data.deliveryId },
      "view"
    );
    const { feedback } = await feedbackInDelivery(actor.adminServices, actor.delivery, validated.data.feedbackId);
    const viewer = await viewerFor(actor);
    if (!canModifyComment(viewer, feedback)) return { error: CHANGE_REFUSED };

    const updated = await actor.services.feedback.toggleResolved(feedback.id, validated.data.isResolved);
    revalidateRoom(actor);
    return { success: true, feedback: feedbackDto(updated, viewer) };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to toggle feedback status.") };
  }
}

export async function updateFeedbackAction(params: UpdateFeedbackInput): Promise<FeedbackActionResult> {
  try {
    const validated = safeValidate(updateFeedbackSchema, params);
    if (!validated.success) return { error: validated.error };
    const { feedbackId, commentText, shareToken, deliveryId } = validated.data;

    const actor = await resolveDeliveryActor({ shareToken, deliveryId }, "comment");
    const { feedback } = await feedbackInDelivery(actor.adminServices, actor.delivery, feedbackId);
    const viewer = await viewerFor(actor);
    if (!canModifyComment(viewer, feedback)) return { error: CHANGE_REFUSED };

    const updated = await actor.services.feedback.updateFeedback(feedback.id, commentText);
    revalidateRoom(actor);
    return { success: true, feedback: feedbackDto(updated, viewer) };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to update feedback.") };
  }
}

export async function deleteFeedbackAction(feedbackId: string, shareToken?: string, deliveryId?: string): Promise<FeedbackActionResult> {
  try {
    if (!feedbackId?.trim()) return { error: "Feedback ID is required." };
    const actor = await resolveDeliveryActor({ shareToken, deliveryId } satisfies DeliveryRef, "view");
    const { feedback } = await feedbackInDelivery(actor.adminServices, actor.delivery, feedbackId.trim());
    if (!canModifyComment(await viewerFor(actor), feedback)) return { error: CHANGE_REFUSED };

    await actor.services.feedback.deleteFeedback(feedback.id);
    revalidateRoom(actor);
    return { success: true };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to delete feedback.") };
  }
}

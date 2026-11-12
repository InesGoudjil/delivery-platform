import type { Delivery } from "@/core/entities/delivery";
import type { Asset, AssetVersion } from "@/core/entities/asset";
import type { Feedback, FeedbackReply } from "@/core/entities/feedback";
import { isUuid } from "@/lib/storage/keys";

/**
 * Load a row by the id a caller sent, and refuse it unless it belongs to the delivery
 * the caller is authorized for. Every room action, and every member action that writes
 * with the service role, goes through these before writing.
 *
 * The chain is reply → comment → file version → file → delivery; a file also has to be
 * in the delivery's own workspace and not in Trash.
 */

export const NOT_IN_DELIVERY = "That item isn't part of this delivery.";

interface ScopeServices {
  asset: {
    getAssetById(id: string): Promise<Asset | null>;
    getVersionById(id: string): Promise<AssetVersion | null>;
  };
  feedback: {
    getFeedback(id: string): Promise<Feedback | null>;
    getReply(id: string): Promise<FeedbackReply | null>;
  };
}

type ScopedDelivery = Pick<Delivery, "id" | "workspaceId">;

export async function assetInDelivery(services: ScopeServices, delivery: ScopedDelivery, assetId: string): Promise<Asset> {
  if (!isUuid(assetId)) throw new Error(NOT_IN_DELIVERY);
  const asset = await services.asset.getAssetById(assetId);
  if (!asset || asset.deliveryId !== delivery.id || asset.workspaceId !== delivery.workspaceId || asset.isArchived) {
    throw new Error(NOT_IN_DELIVERY);
  }
  return asset;
}

export async function versionInDelivery(
  services: ScopeServices,
  delivery: ScopedDelivery,
  versionId: string
): Promise<{ version: AssetVersion; asset: Asset }> {
  if (!isUuid(versionId)) throw new Error(NOT_IN_DELIVERY);
  const version = await services.asset.getVersionById(versionId);
  if (!version) throw new Error(NOT_IN_DELIVERY);
  const asset = await assetInDelivery(services, delivery, version.assetId);
  return { version, asset };
}

export async function feedbackInDelivery(
  services: ScopeServices,
  delivery: ScopedDelivery,
  feedbackId: string
): Promise<{ feedback: Feedback; version: AssetVersion; asset: Asset }> {
  if (!isUuid(feedbackId)) throw new Error(NOT_IN_DELIVERY);
  const feedback = await services.feedback.getFeedback(feedbackId);
  if (!feedback) throw new Error(NOT_IN_DELIVERY);
  const { version, asset } = await versionInDelivery(services, delivery, feedback.assetVersionId);
  return { feedback, version, asset };
}

export async function replyInDelivery(
  services: ScopeServices,
  delivery: ScopedDelivery,
  replyId: string
): Promise<{ reply: FeedbackReply; feedback: Feedback; asset: Asset }> {
  if (!isUuid(replyId)) throw new Error(NOT_IN_DELIVERY);
  const reply = await services.feedback.getReply(replyId);
  if (!reply) throw new Error(NOT_IN_DELIVERY);
  const { feedback, asset } = await feedbackInDelivery(services, delivery, reply.feedbackId);
  return { reply, feedback, asset };
}

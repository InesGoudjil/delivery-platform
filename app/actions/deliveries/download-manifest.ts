"use server";

import { presignDeliveryAssets } from "@/lib/media-server";
import { resolveThumbnailUrl, resolveMediaUrl } from "@/lib/media";
import { mapRoomAssets } from "@/lib/client-room/content";
import { assetInDelivery } from "@/lib/client-room/scope";
import {
  loadMoreDeliveryAssetsSchema,
  getDeliveryDownloadManifestSchema,
  recordClientDownloadSchema,
  safeValidate,
} from "@/lib/validations";
import { checkRateLimit, getClientIp, RATELIMIT_POLICIES } from "@/lib/upstash";
import { createScopedLogger } from "@/lib/logger";
import { normalizeActionError } from "../safe-action";
import { actorViewer, resolveDeliveryActor, type DeliveryActor } from "./room-access";
import { resolveRequestOrigin } from "./helpers";
import { runAfterResponse } from "@/lib/after-response";

/**
 * Delivery file lists and downloads, from the client room (share token) or the studio
 * (delivery id, members only). Download links are only produced when the visitor may
 * download: always for members, for guests only when the studio turned downloads on.
 */

const log = createScopedLogger({ actionGroup: "deliveries" });

function canDownload(actor: DeliveryActor): boolean {
  return actor.kind === "member" || actor.delivery.isDownloadAllowed === true;
}

function isPhotoType(type: string): boolean {
  return type === "still" || type === "photo" || type === "photo_gallery";
}

function formatDuration(seconds?: number | null): string | null {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export async function loadMoreDeliveryAssetsAction(params: {
  deliveryId?: string;
  shareToken?: string;
  page: number;
  pageSize?: number;
  filter?: "ALL" | "VIDEOS" | "PHOTOS";
}) {
  try {
    const validated = safeValidate(loadMoreDeliveryAssetsSchema, params);
    if (!validated.success) {
      return { success: false, error: validated.error, items: [], hasMore: false, totalCount: 0 };
    }
    const { deliveryId, shareToken, page, pageSize, filter } = validated.data;

    const actor = await resolveDeliveryActor({ deliveryId, shareToken }, "view");
    const type = filter === "VIDEOS" ? ("video" as const) : filter === "PHOTOS" ? ("photo" as const) : ("all" as const);
    const pageData = await actor.services.delivery.getDeliveryAssetsPage(actor.delivery, {
      page,
      limit: pageSize || 12,
      type,
    });

    const mapped = mapRoomAssets(pageData.assets, await actorViewer(actor));
    const presigned = await presignDeliveryAssets(mapped, actor.services.storage, {
      workspaceId: actor.delivery.workspaceId,
      allowDownload: canDownload(actor),
      roomShareToken: actor.shareToken ?? undefined,
    });

    const items = presigned.map((a) => {
      const activeVer = a.activeVersion || a.versions[0];
      const isPhoto = isPhotoType(a.type);
      return {
        id: a.id,
        versionId: activeVer?.id,
        versionNumber: activeVer?.versionNumber || 1,
        totalVersions: a.versions?.length || 1,
        versions: a.versions || [],
        title: a.title,
        type: isPhoto ? ("photo" as const) : ("video" as const),
        aspectRatio: a.aspectRatio || "16:9",
        duration: isPhoto ? "STILL" : formatDuration(activeVer?.durationSeconds) || "--:--",
        src: resolveThumbnailUrl(activeVer?.thumbnailUrl, activeVer?.rawFileUrl, isPhoto) || "",
        status: a.isApproved ? ("approved" as const) : ("review" as const),
        rawUrl: resolveMediaUrl(activeVer?.rawFileUrl),
        downloadUrl: activeVer?.downloadUrl ? resolveMediaUrl(activeVer.downloadUrl) : "",
        fileSizeBytes: activeVer?.fileSizeBytes || 0,
        hlsUrl: resolveMediaUrl(activeVer?.hlsManifestUrl),
        videoUrl: resolveMediaUrl(activeVer?.hlsManifestUrl) || resolveMediaUrl(activeVer?.rawFileUrl) || undefined,
        feedback: a.feedback || [],
      };
    });

    return {
      success: true,
      items,
      hasMore: pageData.hasMore,
      totalCount: pageData.totalCount,
      approvedCount: pageData.approvedCount,
    };
  } catch (err: unknown) {
    log.error({ err }, "loadMoreDeliveryAssetsAction error");
    return { success: false, error: normalizeActionError(err, "Failed to load more assets") };
  }
}

export async function getDeliveryDownloadManifestAction(params: { deliveryId?: string; shareToken?: string }) {
  try {
    const validated = safeValidate(getDeliveryDownloadManifestSchema, params);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const actor = await resolveDeliveryActor(
      { deliveryId: validated.data.deliveryId, shareToken: validated.data.shareToken },
      "download"
    );

    // Up to 500 deliverables.
    const details = await actor.services.delivery.getDeliveryWithFullDetails(actor.delivery, { page: 1, limit: 500 });
    const mapped = mapRoomAssets(details?.assets ?? [], await actorViewer(actor));
    const presigned = await presignDeliveryAssets(mapped, actor.services.storage, {
      workspaceId: actor.delivery.workspaceId,
      allowDownload: true,
      roomShareToken: actor.shareToken ?? undefined,
    });

    const items = presigned.map((a) => {
      const activeVer = a.activeVersion || a.versions[0];
      const isPhoto = isPhotoType(a.type);
      return {
        id: a.id,
        title: a.title,
        type: isPhoto ? "photo" : "video",
        versionNumber: activeVer?.versionNumber || 1,
        fileSizeBytes: activeVer?.fileSizeBytes || 0,
        duration: isPhoto ? null : formatDuration(activeVer?.durationSeconds),
        aspectRatio: a.aspectRatio || "16:9",
        thumbnailUrl: resolveThumbnailUrl(activeVer?.thumbnailUrl, activeVer?.rawFileUrl, isPhoto) || "",
        downloadUrl: resolveMediaUrl(activeVer?.downloadUrl || activeVer?.rawFileUrl),
        proxyDownloadUrl: (activeVer as { proxyDownloadUrl?: string | null } | undefined)?.proxyDownloadUrl || null,
        isApproved: Boolean(a.isApproved),
      };
    });

    return { success: true, items, totalCount: items.length };
  } catch (err: unknown) {
    log.error({ err }, "getDeliveryDownloadManifestAction error");
    return { success: false, error: normalizeActionError(err, "Failed to load complete delivery package") };
  }
}

/**
 * The client room reports a download so the studio can be emailed (when "notify on
 * download" is on and the plan includes it). Guests only, rate limited; the file title
 * comes from the database, never from the browser.
 */
export async function recordClientDownloadAction(params: {
  shareToken: string;
  assetId?: string;
  downloadedCount?: number;
}) {
  try {
    const validated = safeValidate(recordClientDownloadSchema, params);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const actor = await resolveDeliveryActor({ shareToken: validated.data.shareToken }, "download");
    // The studio downloading its own files isn't news to the studio.
    if (actor.kind === "member") return { success: true, notified: false };

    const { delivery, adminServices: services } = actor;
    if (!delivery.notifyOnDownload) return { success: true, notified: false };

    const rateLimit = await checkRateLimit({
      policy: RATELIMIT_POLICIES.deliveryDownloadNotice,
      identifier: [await getClientIp(), delivery.id],
    });
    if (!rateLimit.success) return { success: true, notified: false };

    if (!(await services.subscription.isDownloadNotificationAllowed(delivery.workspaceId))) {
      return { success: true, notified: false };
    }

    const count = validated.data.downloadedCount ?? 1;
    const asset = validated.data.assetId
      ? await assetInDelivery(services, delivery, validated.data.assetId).catch(() => null)
      : null;
    const origin = await resolveRequestOrigin();

    // WhatsApp has its own toggle and plan check (in the service), separate from email's.
    runAfterResponse("whatsapp:client-download", () =>
      services.whatsapp.notifyClientDownload({
        deliveryId: delivery.id,
        downloadedCount: count,
        assetTitle: asset?.title ?? null,
        origin,
      })
    );

    try {
      const settings = await services.settings.findByWorkspaceId(delivery.workspaceId);
      if (settings && !settings.notifyDownloads) return { success: true, notified: false };
    } catch {
      // Proceed if the settings lookup fails.
    }

    const members = await services.member.listMembers(delivery.workspaceId);
    const recipientEmails = members
      .filter((m) => (m.role === "owner" || m.role === "admin") && Boolean(m.email))
      .map((m) => m.email as string);
    if (recipientEmails.length === 0) return { success: true, notified: false };

    const itemDescription =
      count > 1 ? `${count} master deliverables` : asset ? `"${asset.title}"` : "master deliverables";

    await services.notification.notifyClientDownload({
      deliveryId: delivery.id,
      recipientEmails,
      itemDescription,
      origin,
    });
    return { success: true, notified: true };
  } catch (err: unknown) {
    log.warn({ err }, "recordClientDownloadAction notice");
    return { success: false };
  }
}

/** First page of a delivery's files for the studio's SWR hydration. Members only. */
export async function getDeliveryAssetsAction(deliveryId: string, filter: "ALL" | "VIDEOS" | "PHOTOS" = "ALL") {
  return loadMoreDeliveryAssetsAction({ deliveryId, page: 1, pageSize: 50, filter });
}

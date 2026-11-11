"use server";

import { cookies } from "next/headers";
import { getServerAdminServices } from "@/core/server";
import { hasValidDeliveryPasscodeCookie } from "@/lib/security/delivery-token";
import { presignDeliveryAssets } from "@/lib/media-server";
import { resolveThumbnailUrl, resolveMediaUrl } from "@/lib/media";
import {
  loadMoreDeliveryAssetsSchema,
  getDeliveryDownloadManifestSchema,
  recordClientDownloadSchema,
  safeValidate,
} from "@/lib/validations";
import { createScopedLogger } from "@/lib/logger";
import { normalizeActionError } from "../safe-action";

const log = createScopedLogger({ actionGroup: "deliveries" });

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

    const services = await getServerAdminServices();
    let delivery = null;

    if (deliveryId) {
      delivery = await services.delivery.getDeliveryById(deliveryId);
    } else if (shareToken) {
      delivery = await services.delivery.getDeliveryByShareToken(shareToken);
    }

    if (!delivery) {
      return { success: false, error: "Delivery not found or link has expired." };
    }

    // Verify access
    const user = await services.auth.getCurrentUser();
    let isAuthorized = false;

    if (user) {
      const isMember = await services.member
        .isMember(delivery.workspaceId, user.id)
        .catch(() => false);
      if (isMember) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      if (!delivery.passcodeHash) {
        isAuthorized = true;
      } else {
        const cookieStore = await cookies();
        if (hasValidDeliveryPasscodeCookie(cookieStore, delivery.shareToken)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return { success: false, error: "Unauthorized access to delivery assets." };
    }

    const filterType =
      filter === "VIDEOS"
        ? ("video" as const)
        : filter === "PHOTOS"
        ? ("photo" as const)
        : ("all" as const);

    const limit = pageSize || 12;
    const pageData = await services.delivery.getDeliveryAssetsPage(delivery.id, {
      page,
      limit,
      type: filterType,
    });

    const mappedAssets = pageData.assets.map((a) => {
      const mappedVersions = a.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        rawFileUrl: v.rawFileUrl,
        downloadUrl: v.rawFileUrl,
        hlsManifestUrl: v.hlsManifestUrl,
        thumbnailUrl:
          v.thumbnailUrl ||
          (a.type === "photo_gallery" || (a.type as string) === "photo" || (a.type as string) === "still"
            ? v.rawFileUrl
            : null) ||
          "/images/hero.jpg",
        durationSeconds: v.durationSeconds,
        fileSizeBytes: v.fileSizeBytes,
        transcodingStatus: v.transcodingStatus,
        isActiveVersion: v.isActiveVersion,
        createdAt: v.createdAt,
      }));

      const activeVersion =
        mappedVersions.find((v) => v.isActiveVersion) || mappedVersions[0] || null;

      const mappedFeedback = (a.feedback || []).map((f) => ({
        id: f.id,
        assetVersionId: f.assetVersionId,
        authorName: f.authorName,
        commentText: f.commentText,
        timestampSeconds: f.timestampSeconds ? Number(f.timestampSeconds) : null,
        createdAt: f.createdAt,
        isResolved: f.isResolved,
        replies: (f.replies || []).map((r) => ({
          id: r.id,
          feedbackId: r.feedbackId,
          authorName: r.authorName,
          commentText: r.commentText,
          createdAt: r.createdAt,
        })),
      }));

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        aspectRatio: a.aspectRatio,
        isApproved: a.isApproved,
        versions: mappedVersions,
        activeVersion,
        feedback: mappedFeedback,
      };
    });

    // Presign only the requested batch
    const presigned = await presignDeliveryAssets(mappedAssets, services.storage, 7200);

    const items = presigned.map((a) => {
      const activeVer = a.activeVersion || a.versions[0];
      const isPhoto =
        (a.type as string) === "still" ||
        (a.type as string) === "photo" ||
        a.type === "photo_gallery";
      let durationStr = "STILL";
      if (!isPhoto) {
        if (activeVer?.durationSeconds) {
          const mins = Math.floor(activeVer.durationSeconds / 60);
          const secs = Math.round(activeVer.durationSeconds % 60);
          durationStr = `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
        } else {
          durationStr = "00:45";
        }
      }

      return {
        id: a.id,
        versionId: activeVer?.id,
        versionNumber: activeVer?.versionNumber || 1,
        totalVersions: a.versions?.length || 1,
        versions: a.versions || [],
        title: a.title,
        type: isPhoto ? ("photo" as const) : ("video" as const),
        aspectRatio: a.aspectRatio || "16:9",
        duration: durationStr,
        src:
          resolveThumbnailUrl(activeVer?.thumbnailUrl, activeVer?.rawFileUrl, isPhoto) || "",
        status: a.isApproved ? ("approved" as const) : ("review" as const),
        rawUrl: resolveMediaUrl(activeVer?.rawFileUrl),
        downloadUrl: resolveMediaUrl(activeVer?.downloadUrl || activeVer?.rawFileUrl),
        fileSizeBytes: activeVer?.fileSizeBytes || 0,
        hlsUrl: resolveMediaUrl(activeVer?.hlsManifestUrl),
        videoUrl:
          resolveMediaUrl(activeVer?.hlsManifestUrl) ||
          resolveMediaUrl(activeVer?.rawFileUrl) ||
          (isPhoto ? undefined : "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"),
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
    log.error({ err, params }, "loadMoreDeliveryAssetsAction error");
    return {
      success: false,
      error: normalizeActionError(err, "Failed to load more assets"),
    };
  }
}

export async function getDeliveryDownloadManifestAction(params: {
  deliveryId?: string;
  shareToken?: string;
}) {
  try {
    const validated = safeValidate(getDeliveryDownloadManifestSchema, params);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { deliveryId, shareToken } = validated.data;

    const services = await getServerAdminServices();
    let delivery = null;

    if (deliveryId) {
      delivery = await services.delivery.getDeliveryById(deliveryId);
    } else if (shareToken) {
      delivery = await services.delivery.getDeliveryByShareToken(shareToken);
    }

    if (!delivery) {
      return { success: false, error: "Delivery not found." };
    }

    const user = await services.auth.getCurrentUser();
    let isAuthorized = false;

    if (user) {
      const isMember = await services.member
        .isMember(delivery.workspaceId, user.id)
        .catch(() => false);
      if (isMember) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      if (!delivery.passcodeHash) {
        isAuthorized = true;
      } else {
        const cookieStore = await cookies();
        if (hasValidDeliveryPasscodeCookie(cookieStore, delivery.shareToken)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return { success: false, error: "Unauthorized access to delivery package." };
    }

    // Fetch all assets in the delivery (up to 500 deliverables)
    const fullDetails = await services.delivery.getDeliveryWithFullDetails(delivery.id, {
      page: 1,
      limit: 500,
    });

    const rawAssets = fullDetails?.assets || [];
    const mappedAssets = rawAssets.map((a) => {
      const mappedVersions = (a.versions || []).map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        rawFileUrl: v.rawFileUrl,
        downloadUrl: v.rawFileUrl,
        hlsManifestUrl: v.hlsManifestUrl,
        thumbnailUrl:
          v.thumbnailUrl ||
          (a.type === "photo_gallery" || (a.type as string) === "photo" || (a.type as string) === "still"
            ? v.rawFileUrl
            : null) ||
          "/images/hero.jpg",
        durationSeconds: v.durationSeconds,
        fileSizeBytes: v.fileSizeBytes,
        isActiveVersion: v.isActiveVersion,
      }));

      const activeVersion =
        mappedVersions.find((v) => v.isActiveVersion) || mappedVersions[0] || null;

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        aspectRatio: a.aspectRatio || "16:9",
        isApproved: a.isApproved,
        versions: mappedVersions,
        activeVersion,
      };
    });

    const presigned = await presignDeliveryAssets(mappedAssets, services.storage, 7200);

    const downloadItems = presigned.map((a) => {
      const activeVer = a.activeVersion || a.versions[0];
      const isPhoto =
        (a.type as string) === "still" ||
        (a.type as string) === "photo" ||
        a.type === "photo_gallery";
      let durationStr: string | null = null;
      if (!isPhoto && activeVer?.durationSeconds) {
        const mins = Math.floor(activeVer.durationSeconds / 60);
        const secs = Math.round(activeVer.durationSeconds % 60);
        durationStr = `${mins.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`;
      }

      return {
        id: a.id,
        title: a.title,
        type: isPhoto ? "photo" : "video",
        versionNumber: activeVer?.versionNumber || 1,
        fileSizeBytes: activeVer?.fileSizeBytes || 0,
        duration: durationStr,
        aspectRatio: a.aspectRatio || "16:9",
        thumbnailUrl:
          resolveThumbnailUrl(activeVer?.thumbnailUrl, activeVer?.rawFileUrl, isPhoto) || "",
        downloadUrl: resolveMediaUrl(activeVer?.downloadUrl || activeVer?.rawFileUrl),
        proxyDownloadUrl: (activeVer as any)?.proxyDownloadUrl || null,
        isApproved: Boolean(a.isApproved),
      };
    });

    return {
      success: true,
      items: downloadItems,
      totalCount: downloadItems.length,
    };
  } catch (err: unknown) {
    log.error({ err, params }, "getDeliveryDownloadManifestAction error");
    return {
      success: false,
      error: normalizeActionError(err, "Failed to load complete delivery package"),
    };
  }
}

export async function recordClientDownloadAction(params: {
  deliveryId: string;
  assetTitle?: string;
  downloadedCount?: number;
}) {
  try {
    const validated = safeValidate(recordClientDownloadSchema, params);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const core = await import("@/core/server").then((m) => m.getServerCore());
    const delivery = await core.services.delivery.getDeliveryById(validated.data.deliveryId);
    if (!delivery || !delivery.notifyOnDownload) {
      return { success: true, notified: false };
    }

    // Verify workspace plan permits download notifications
    const canNotifyPlan = await core.services.subscription.isDownloadNotificationAllowed(
      delivery.workspaceId
    );
    if (!canNotifyPlan) {
      return { success: true, notified: false };
    }

    // Check workspace-level notification preference
    try {
      const settings = await core.services.settings.findByWorkspaceId(delivery.workspaceId);
      if (settings && !settings.notifyDownloads) {
        return { success: true, notified: false };
      }
    } catch {
      // Proceed if settings lookup fails
    }

    const workspace = await core.services.workspace.getWorkspaceById(delivery.workspaceId);
    const members = await core.services.member.listMembers(delivery.workspaceId);
    const notifyEmails = members
      .filter((m) => (m.role === "owner" || m.role === "admin") && Boolean(m.email))
      .map((m) => m.email as string);

    if (notifyEmails.length === 0) {
      return { success: true, notified: false };
    }

    const brandName = workspace?.brandName || "Studio";
    const accentColor = workspace?.accentColor || "#f5551d";
    const itemDesc =
      params.downloadedCount && params.downloadedCount > 1
        ? `${params.downloadedCount} master deliverables`
        : params.assetTitle
        ? `"${params.assetTitle}"`
        : "master deliverables";

    const subject = `📥 Client downloaded ${itemDesc} — ${delivery.title}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0e0e11; color:#f6f3ec; padding:32px; border-radius:16px; max-width:560px; margin:0 auto;">
        <p style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${accentColor}; font-weight:700; margin:0 0 8px;">${brandName} · Download Alert</p>
        <h2 style="font-size:20px; margin:0 0 12px; color:#ffffff;">Deliverables Downloaded</h2>
        <p style="font-size:14px; line-height:1.6; color:#aeaeb4; margin:0 0 20px;">
          Your client just initiated a download of <strong style="color:#ffffff;">${itemDesc}</strong> from the delivery room <strong style="color:#ffffff;">${delivery.title}</strong>.
        </p>
        <p style="font-size:11px; color:#71717a; margin:24px 0 0;">Sent automatically because "Notify on Download" is enabled for this delivery.</p>
      </div>
    `;

    for (const email of notifyEmails) {
      const sendRes = await core.services.email.sendEmail({
        to: email,
        subject,
        html,
      });
      await core.repositories.notification
        .create({
          workspaceId: delivery.workspaceId,
          projectId: delivery.id,
          clientId: delivery.clientId,
          channel: "email",
          recipientEmail: email,
          subject,
          status: sendRes.success ? "sent" : "failed",
          providerMessageId: sendRes.messageId,
          errorMessage: sendRes.error,
        })
        .catch(() => null);
    }

    return { success: true, notified: true };
  } catch (err: unknown) {
    log.warn({ err, deliveryId: params.deliveryId }, "recordClientDownloadAction notice");
    return { success: false };
  }
}

/**
 * Retrieves the first page of delivery assets for SWR hydration and revalidation.
 */
export async function getDeliveryAssetsAction(
  deliveryId: string,
  filter: "ALL" | "VIDEOS" | "PHOTOS" = "ALL"
) {
  return loadMoreDeliveryAssetsAction({
    deliveryId,
    page: 1,
    pageSize: 50,
    filter,
  });
}

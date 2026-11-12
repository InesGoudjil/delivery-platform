import { cookies } from "next/headers";
import type { ClientRoom } from "@/core/security/client-room";
import { hasMinRole, type WorkspaceRoleLevel } from "@/core/security/guards";
import type { DeliveryWithDetails } from "@/core/services/delivery.service";
import { readGuestAuthorKeyHash } from "@/lib/security/delivery-token";
import { presignDeliveryAssets, presignPrivateMediaUrl } from "@/lib/media-server";
import type { DeliveryAssetItem } from "@/app/(public)/deliver/[shareToken]/_components/types";

/**
 * What a client room sends to the browser: its files, versions and comments, mapped to
 * plain objects (no internal ids, hashes or storage keys beyond signed URLs) and signed
 * by the rules of the room (downloads only when allowed, only this workspace's files).
 */

export type RoomViewer =
  | { kind: "member"; userId: string; role: WorkspaceRoleLevel }
  | { kind: "guest"; guestKeyHash: string | null };

/** May this viewer edit, resolve or delete the comment? Mirrors the RLS rules for members. */
export function canModifyComment(
  viewer: RoomViewer,
  comment: { authorUserId?: string | null; guestAuthorKeyHash?: string | null }
): boolean {
  if (viewer.kind === "member") {
    return comment.authorUserId === viewer.userId || hasMinRole(viewer.role, "editor");
  }
  return Boolean(viewer.guestKeyHash) && comment.guestAuthorKeyHash === viewer.guestKeyHash;
}

export async function roomViewer(room: ClientRoom): Promise<RoomViewer> {
  if (room.member) return { kind: "member", userId: room.member.userId, role: room.member.role };
  return { kind: "guest", guestKeyHash: readGuestAuthorKeyHash(await cookies(), room.delivery.shareToken) };
}

/** Versions a client may see: confirmed uploads only (not "pending" or "failed"). */
function visibleTo(viewer: RoomViewer, status: string | null | undefined): boolean {
  return viewer.kind === "member" || (status !== "pending" && status !== "failed");
}

export function mapRoomAssets(assets: DeliveryWithDetails["assets"], viewer: RoomViewer): DeliveryAssetItem[] {
  return (assets || []).flatMap((asset) => {
    const usable = (asset.versions || []).filter((v) => visibleTo(viewer, v.transcodingStatus));
    // A file with nothing confirmed yet isn't shown to clients at all.
    if (usable.length === 0 && viewer.kind === "guest") return [];
    const versions = usable.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      rawFileUrl: v.rawFileUrl,
      downloadUrl: null as string | null,
      hlsManifestUrl: v.hlsManifestUrl || null,
      thumbnailUrl: v.thumbnailUrl || null,
      fileSizeBytes: v.fileSizeBytes || null,
      durationSeconds: v.durationSeconds ? Number(v.durationSeconds) : null,
      transcodingStatus: v.transcodingStatus || null,
      isActiveVersion: v.isActiveVersion,
      createdAt: v.createdAt,
    }));
    const activeVersion = versions.find((v) => v.isActiveVersion) || versions[0] || null;

    return [{
      id: asset.id,
      title: asset.title,
      type: asset.type,
      aspectRatio: asset.aspectRatio || undefined,
      isApproved: asset.isApproved,
      sortOrder: asset.sortOrder,
      versions,
      activeVersion,
      feedback: (asset.feedback || []).map((f) => ({
        id: f.id,
        assetVersionId: f.assetVersionId,
        authorName: f.authorName,
        commentText: f.commentText,
        timestampSeconds: f.timestampSeconds ? Number(f.timestampSeconds) : null,
        isResolved: f.isResolved,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        canModify: canModifyComment(viewer, f),
        replies: (f.replies || []).map((r) => ({
          id: r.id,
          feedbackId: r.feedbackId,
          authorName: r.authorName,
          commentText: r.commentText,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          canModify: canModifyComment(viewer, r),
        })),
      })),
    }];
  });
}

export interface RoomAssetsPage {
  assets: DeliveryAssetItem[];
  clientName: string | null;
  totalAssetsCount: number;
  approvedAssetsCount: number;
  hasMore: boolean;
}

/** The room's files, signed for this viewer. Only call after the gate let them in. */
export async function loadRoomAssets(
  room: ClientRoom,
  options?: { page?: number; limit?: number; type?: string }
): Promise<RoomAssetsPage> {
  if (!room.canView) return { assets: [], clientName: null, totalAssetsCount: 0, approvedAssetsCount: 0, hasMore: false };

  const details = await room.services.delivery.getDeliveryWithFullDetails(room.delivery, options);
  const viewer = await roomViewer(room);
  const mapped = mapRoomAssets(details?.assets ?? [], viewer);
  const assets = await presignDeliveryAssets(mapped, room.services.storage, {
    workspaceId: room.delivery.workspaceId,
    allowDownload: room.canDownload,
    roomShareToken: room.delivery.shareToken,
  });

  return {
    assets,
    clientName: details?.client?.name ?? null,
    totalAssetsCount: details?.totalAssetsCount ?? assets.length,
    approvedAssetsCount: details?.approvedAssetsCount ?? assets.filter((a) => a.isApproved).length,
    hasMore: details?.hasMore ?? false,
  };
}

/** The delivery's custom cover, signed (it may be a private key). */
export async function signRoomCover(room: ClientRoom): Promise<string | null> {
  const cover = room.delivery.appearance?.coverThumbnailUrl;
  if (!cover) return null;
  const signed = await presignPrivateMediaUrl(cover, room.services.storage, { workspaceId: room.delivery.workspaceId });
  return signed || null;
}

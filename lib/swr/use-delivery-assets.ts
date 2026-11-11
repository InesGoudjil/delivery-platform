"use client";

import useSWR, { KeyedMutator } from "swr";
import { getDeliveryAssetsAction } from "@/app/actions/deliveries";
import type { GalleryItem } from "@/app/(workspace)/[workspaceSlug]/deliveries/[projectId]/_components/types";
import { resolveMediaUrl } from "@/lib/media";

export interface DeliveryAssetsData {
  items: GalleryItem[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Optimistically updates the cached delivery items when an asset or version finishes uploading.
 */
export function applyUploadComplete(
  current: DeliveryAssetsData,
  payload: {
    uploadedAsset: any;
    uploadedVersion?: any;
    durationStr: string;
    resolvedSrc: string;
    isPhoto: boolean;
  }
): DeliveryAssetsData {
  const { uploadedAsset, uploadedVersion, durationStr, resolvedSrc, isPhoto } = payload;
  const existingIdx = current.items.findIndex((item) => item.id === uploadedAsset.id);

  let updatedItems: GalleryItem[];
  let totalCount = current.totalCount;

  if (existingIdx >= 0) {
    const existing = current.items[existingIdx];
    const newTotalVersions = (existing.totalVersions || 1) + 1;
    const newVersionNumber = uploadedVersion?.versionNumber || newTotalVersions;
    const updatedVersions = uploadedVersion
      ? [...(existing.versions || []).filter((v) => v.id !== uploadedVersion.id), uploadedVersion]
      : existing.versions || [];

    const updatedItem: GalleryItem = {
      ...existing,
      title: uploadedAsset.title || existing.title,
      versionId: uploadedVersion?.id || existing.versionId,
      versionNumber: newVersionNumber,
      totalVersions: newTotalVersions,
      versions: updatedVersions,
      src: resolvedSrc,
      rawUrl: resolveMediaUrl(uploadedVersion?.rawFileUrl) || existing.rawUrl,
      downloadUrl:
        resolveMediaUrl(uploadedVersion?.downloadUrl || uploadedVersion?.rawFileUrl) ||
        existing.downloadUrl ||
        existing.rawUrl,
      hlsUrl: resolveMediaUrl(uploadedVersion?.hlsManifestUrl) || existing.hlsUrl,
      videoUrl:
        resolveMediaUrl(uploadedVersion?.hlsManifestUrl) ||
        resolveMediaUrl(uploadedVersion?.rawFileUrl) ||
        existing.videoUrl,
      duration: durationStr,
    };

    updatedItems = current.items.map((item, idx) => (idx === existingIdx ? updatedItem : item));
  } else {
    const newVersion = uploadedVersion || {
      id: `ver_${Date.now()}`,
      versionNumber: 1,
      rawFileUrl: uploadedAsset.rawFileUrl || "",
      thumbnailUrl: resolvedSrc,
      isActiveVersion: true,
      fileSizeBytes: 0,
      transcodingStatus: "ready",
      createdAt: new Date().toISOString(),
    };

    const newItem: GalleryItem = {
      id: uploadedAsset.id,
      versionId: newVersion.id,
      versionNumber: 1,
      totalVersions: 1,
      versions: [newVersion],
      title: uploadedAsset.title || "Untitled Master",
      type: isPhoto ? "photo" : "video",
      aspectRatio: uploadedAsset.aspectRatio || "16:9",
      duration: durationStr,
      src: resolvedSrc,
      status: "review",
      rawUrl: resolveMediaUrl(newVersion.rawFileUrl),
      downloadUrl: resolveMediaUrl(newVersion.downloadUrl || newVersion.rawFileUrl),
      fileSizeBytes: newVersion.fileSizeBytes || 0,
      hlsUrl: resolveMediaUrl(newVersion.hlsManifestUrl),
      videoUrl:
        resolveMediaUrl(newVersion.hlsManifestUrl) ||
        resolveMediaUrl(newVersion.rawFileUrl) ||
        (isPhoto ? undefined : "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"),
      feedback: [],
    };

    updatedItems = [newItem, ...current.items];
    totalCount += 1;
  }

  return {
    ...current,
    items: updatedItems,
    totalCount,
  };
}

/**
 * Optimistically toggles approval status for a single asset.
 */
export function applyToggleApproval(
  current: DeliveryAssetsData,
  assetId: string,
  isApproved: boolean
): DeliveryAssetsData {
  return {
    ...current,
    items: current.items.map((item) =>
      item.id === assetId
        ? { ...item, status: isApproved ? ("approved" as const) : ("review" as const) }
        : item
    ),
  };
}

/**
 * Optimistically marks all assets as approved or in-review.
 */
export function applyApproveAll(
  current: DeliveryAssetsData,
  isApproved: boolean
): DeliveryAssetsData {
  const status = isApproved ? ("approved" as const) : ("review" as const);
  return {
    ...current,
    items: current.items.map((item) => ({ ...item, status })),
  };
}

/**
 * Optimistically removes an asset from the gallery.
 */
export function applyDeleteAsset(
  current: DeliveryAssetsData,
  assetId: string
): DeliveryAssetsData {
  return {
    ...current,
    items: current.items.filter((item) => item.id !== assetId),
    totalCount: Math.max(0, current.totalCount - 1),
  };
}

/**
 * Optimistically updates an asset's title or aspect ratio.
 */
export function applyUpdateAsset(
  current: DeliveryAssetsData,
  updated: { id: string; title: string; aspectRatio?: string; src?: string }
): DeliveryAssetsData {
  return {
    ...current,
    items: current.items.map((item) =>
      item.id === updated.id
        ? {
            ...item,
            title: updated.title,
            aspectRatio: updated.aspectRatio || item.aspectRatio,
            src: updated.src || item.src,
          }
        : item
    ),
  };
}

export const getDeliveryAssetsKey = (
  deliveryId?: string,
  filter?: "ALL" | "VIDEOS" | "PHOTOS"
) =>
  deliveryId
    ? `/api/deliveries/${deliveryId}/assets${filter && filter !== "ALL" ? `?filter=${filter}` : ""}`
    : null;

export interface UseDeliveryAssetsReturn {
  data: DeliveryAssetsData | undefined;
  items: GalleryItem[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  isValidating: boolean;
  error: any;
  mutate: KeyedMutator<DeliveryAssetsData>;
}

/**
 * SWR hook for delivery project assets, versions, and approvals.
 * Supports SSR hydration, zero initial spinners, and optimistic mutations.
 */
export function useDeliveryAssets(
  deliveryId: string,
  initialData?: DeliveryAssetsData,
  filter: "ALL" | "VIDEOS" | "PHOTOS" = "ALL"
): UseDeliveryAssetsReturn {
  const key = getDeliveryAssetsKey(deliveryId, filter);

  const { data, error, isLoading, isValidating, mutate } = useSWR<DeliveryAssetsData>(
    key,
    async () => {
      const res = await getDeliveryAssetsAction(deliveryId, filter);
      if (!res.success || !res.items) {
        throw new Error(res.error || "Failed to load delivery assets");
      }
      return {
        items: res.items as GalleryItem[],
        totalCount: res.totalCount ?? res.items.length,
        hasMore: Boolean(res.hasMore),
      };
    },
    {
      fallbackData: initialData,
      dedupingInterval: 10000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    data,
    items: data?.items ?? initialData?.items ?? [],
    totalCount: data?.totalCount ?? initialData?.totalCount ?? 0,
    hasMore: data?.hasMore ?? initialData?.hasMore ?? false,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export default useDeliveryAssets;

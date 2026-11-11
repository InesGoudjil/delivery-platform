"use client";

import useSWR, { KeyedMutator } from "swr";
import {
  getWorkspacePortfolioDataAction,
  WorkspacePortfolioData,
} from "@/app/actions/portfolio";
import { PortfolioItem, ProjectAsset } from "@/core/entities/portfolio";
import { SelectableCoverAsset } from "@/lib/portfolio-data";

/**
 * Derives flat SelectableCoverAsset list from all portfolio items (projects + standalone).
 */
export function deriveAvailableCoverAssets(
  items: PortfolioItem[]
): SelectableCoverAsset[] {
  const availableAssets: SelectableCoverAsset[] = [];

  for (const item of items) {
    if (item.type === "project" && item.projectAssets && item.projectAssets.length > 0) {
      for (const asset of item.projectAssets) {
        availableAssets.push({
          id: asset.id,
          title: asset.title,
          type: asset.type === "still" ? "still" : "video",
          url: asset.url,
          thumbnailUrl: asset.thumbnailUrl,
          aspectRatio: asset.aspectRatio || "16:9",
          duration: asset.duration,
          category: asset.category,
          projectName: item.title,
        });
      }
    } else {
      availableAssets.push({
        id: item.id,
        title: item.title,
        type: item.type === "still" ? "still" : "video",
        url: item.mediaUrl || item.thumbnailUrl,
        thumbnailUrl: item.thumbnailUrl,
        aspectRatio: item.aspectRatio || "16:9",
        category: item.category,
      });
    }
  }

  return availableAssets;
}

/**
 * Optimistically prepends a new portfolio item (project or standalone media) to the cached list.
 */
export function applyAddPortfolioItem(
  current: WorkspacePortfolioData,
  newItem: PortfolioItem
): WorkspacePortfolioData {
  const existingIdx = current.items.findIndex((i) => i.id === newItem.id);
  const items =
    existingIdx >= 0
      ? current.items.map((i, idx) => (idx === existingIdx ? newItem : i))
      : [newItem, ...current.items];

  return {
    ...current,
    items,
  };
}

/**
 * Optimistically removes an item from the portfolio and featured reel.
 */
export function applyRemovePortfolioItem(
  current: WorkspacePortfolioData,
  itemId: string
): WorkspacePortfolioData {
  return {
    ...current,
    items: current.items.filter((i) => i.id !== itemId),
    featuredIds: current.featuredIds.filter((id) => id !== itemId),
  };
}

/**
 * Optimistically removes an asset from within a showcase project container.
 */
export function applyRemoveProjectAsset(
  current: WorkspacePortfolioData,
  projectId: string,
  assetId: string
): WorkspacePortfolioData {
  return {
    ...current,
    items: current.items.map((p) => {
      if (p.id === projectId && p.projectAssets) {
        const updatedAssets = p.projectAssets.filter((a) => a.id !== assetId);
        return {
          ...p,
          assetCount: updatedAssets.length,
          projectAssets: updatedAssets,
        };
      }
      return p;
    }),
  };
}

/**
 * Optimistically updates metadata (title, category, description, aspect ratio) on an item or nested asset.
 */
export function applyUpdatePortfolioItem(
  current: WorkspacePortfolioData,
  updated: {
    id: string;
    title?: string;
    description?: string | null;
    category?: string;
    thumbnailUrl?: string;
    aspectRatio?: string;
  }
): WorkspacePortfolioData {
  return {
    ...current,
    items: current.items.map((p) => {
      if (p.id === updated.id) {
        return {
          ...p,
          title: updated.title ?? p.title,
          description: updated.description !== undefined ? updated.description : p.description,
          category: updated.category ?? p.category,
          thumbnailUrl: updated.thumbnailUrl ?? p.thumbnailUrl,
          aspectRatio: updated.aspectRatio ?? p.aspectRatio,
        };
      }
      if (p.projectAssets) {
        const updatedAssets = p.projectAssets.map((a) =>
          a.id === updated.id
            ? {
                ...a,
                title: updated.title ?? a.title,
                category: updated.category ?? a.category,
                thumbnailUrl: updated.thumbnailUrl ?? a.thumbnailUrl,
                aspectRatio: updated.aspectRatio ?? a.aspectRatio,
              }
            : a
        );
        return {
          ...p,
          projectAssets: updatedAssets,
        };
      }
      return p;
    }),
  };
}

/**
 * Optimistically toggles the featured status of an item in the reel.
 */
export function applyToggleFeaturedItem(
  current: WorkspacePortfolioData,
  itemId: string
): WorkspacePortfolioData {
  const isCurrentlyFeatured = current.featuredIds.includes(itemId);
  const featuredIds = isCurrentlyFeatured
    ? current.featuredIds.filter((id) => id !== itemId)
    : [...current.featuredIds, itemId];

  const items = current.items.map((item) =>
    item.id === itemId ? { ...item, isFeatured: !isCurrentlyFeatured } : item
  );

  return {
    ...current,
    items,
    featuredIds,
  };
}

export const getWorkspacePortfolioKey = (workspaceSlug?: string) =>
  workspaceSlug ? `/api/workspaces/${workspaceSlug}/portfolio` : null;

export interface UseWorkspacePortfolioReturn {
  data: WorkspacePortfolioData | undefined;
  items: PortfolioItem[];
  featuredIds: string[];
  isLoading: boolean;
  isValidating: boolean;
  error: any;
  mutate: KeyedMutator<WorkspacePortfolioData>;
}

/**
 * SWR hook for workspace portfolio items, projects, and featured reels.
 * Provides SSR hydration, zero initial spinners, and optimistic mutations.
 */
export function useWorkspacePortfolio(
  workspaceSlug: string,
  initialData?: WorkspacePortfolioData
): UseWorkspacePortfolioReturn {
  const key = getWorkspacePortfolioKey(workspaceSlug);

  const { data, error, isLoading, isValidating, mutate } = useSWR<WorkspacePortfolioData>(
    key,
    async () => {
      const res = await getWorkspacePortfolioDataAction(workspaceSlug);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to load workspace portfolio");
      }
      return res.data;
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
    featuredIds: data?.featuredIds ?? initialData?.featuredIds ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export default useWorkspacePortfolio;

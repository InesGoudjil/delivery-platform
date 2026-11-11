"use client";

import useSWR, { KeyedMutator } from "swr";
import { useParams } from "next/navigation";
import { getWorkspaceDataAction, WorkspaceData } from "@/app/actions/workspaces";

export const getWorkspaceKey = (slug?: string) =>
  slug ? `/api/workspaces/${slug}` : null;

/**
 * Optimistically updates workspace branding (name, logo, accent) in cache.
 */
export function applyUpdateWorkspaceBranding(
  current: WorkspaceData,
  updates: Partial<WorkspaceData>
): WorkspaceData {
  return {
    ...current,
    ...updates,
  };
}

export interface UseWorkspaceReturn {
  workspace: WorkspaceData | undefined;
  id: string | undefined;
  slug: string | undefined;
  brandName: string | undefined;
  logoUrl: string | null | undefined;
  accentColor: string | null | undefined;
  accountType: "individual" | "studio" | undefined;
  storageUsedBytes: number | undefined;
  isLoading: boolean;
  isValidating: boolean;
  error: any;
  mutate: KeyedMutator<WorkspaceData>;
}

/**
 * SWR hook for current workspace details, branding, and storage quota.
 * Follows Dub.co's centralized workspace state architecture.
 */
export function useWorkspace(
  workspaceSlug?: string,
  initialData?: WorkspaceData
): UseWorkspaceReturn {
  const params = useParams();
  const slug =
    workspaceSlug ||
    (typeof params?.workspaceSlug === "string" ? params.workspaceSlug : undefined);

  const key = getWorkspaceKey(slug);

  const { data, error, isLoading, isValidating, mutate } = useSWR<WorkspaceData>(
    key,
    async () => {
      if (!slug) throw new Error("Workspace slug is missing");
      const res = await getWorkspaceDataAction(slug);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to load workspace data");
      }
      return res.data;
    },
    {
      fallbackData: initialData,
      dedupingInterval: 30000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const resolved = data ?? initialData;

  return {
    workspace: resolved,
    id: resolved?.id,
    slug: resolved?.slug ?? slug,
    brandName: resolved?.brandName,
    logoUrl: resolved?.logoUrl,
    accentColor: resolved?.accentColor,
    accountType: resolved?.accountType,
    storageUsedBytes: resolved?.storageUsedBytes,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export default useWorkspace;

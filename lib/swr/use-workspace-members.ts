"use client";

import useSWR, { KeyedMutator } from "swr";
import {
  getWorkspaceMembersDataAction,
  WorkspaceMembersData,
  WorkspaceSeatStats,
} from "@/app/actions/members";
import {
  WorkspaceRole,
  WorkspaceInvitation,
  EnrichedWorkspaceMember,
} from "@/core/entities/workspace-member";

/**
 * Pure calculation helper to derive accurate seat statistics.
 */
export function calculateSeatStats(
  maxSeats: number,
  activeCount: number,
  pendingCount: number
): WorkspaceSeatStats {
  const usedSeats = activeCount + pendingCount;
  const remainingSeats = Math.max(0, maxSeats - usedSeats);
  const canInvite = usedSeats < maxSeats;
  return {
    maxSeats,
    activeCount,
    pendingCount,
    usedSeats,
    remainingSeats,
    canInvite,
  };
}

/**
 * Optimistically appends a newly created invitation and recalculates seat metrics.
 */
export function applyAddInvitation(
  current: WorkspaceMembersData,
  invitation: WorkspaceInvitation
): WorkspaceMembersData {
  const pendingInvitations = [...current.pendingInvitations, invitation];
  return {
    ...current,
    pendingInvitations,
    seatStats: calculateSeatStats(
      current.seatStats.maxSeats,
      current.members.length,
      pendingInvitations.length
    ),
  };
}

/**
 * Optimistically modifies a member's role in the cached member list.
 */
export function applyUpdateMemberRole(
  current: WorkspaceMembersData,
  memberUserId: string,
  newRole: WorkspaceRole
): WorkspaceMembersData {
  return {
    ...current,
    members: current.members.map((m) =>
      m.userId === memberUserId ? { ...m, role: newRole } : m
    ),
  };
}

/**
 * Optimistically removes a member from the cached member list and releases a seat.
 */
export function applyRemoveMember(
  current: WorkspaceMembersData,
  memberUserId: string
): WorkspaceMembersData {
  const members = current.members.filter((m) => m.userId !== memberUserId);
  return {
    ...current,
    members,
    seatStats: calculateSeatStats(
      current.seatStats.maxSeats,
      members.length,
      current.pendingInvitations.length
    ),
  };
}

/**
 * Optimistically removes a pending invitation and releases a seat.
 */
export function applyRevokeInvitation(
  current: WorkspaceMembersData,
  invitationId: string
): WorkspaceMembersData {
  const pendingInvitations = current.pendingInvitations.filter(
    (i) => i.id !== invitationId
  );
  return {
    ...current,
    pendingInvitations,
    seatStats: calculateSeatStats(
      current.seatStats.maxSeats,
      current.members.length,
      pendingInvitations.length
    ),
  };
}

export const getWorkspaceMembersKey = (workspaceSlug?: string) =>
  workspaceSlug ? `/api/workspaces/${workspaceSlug}/members` : null;

export interface UseWorkspaceMembersOptions {
  fallbackData?: WorkspaceMembersData;
  disabled?: boolean;
}

export interface UseWorkspaceMembersReturn {
  data: WorkspaceMembersData | undefined;
  members: EnrichedWorkspaceMember[];
  pendingInvitations: WorkspaceInvitation[];
  seatStats: WorkspaceSeatStats;
  isLoading: boolean;
  isValidating: boolean;
  error: any;
  mutate: KeyedMutator<WorkspaceMembersData>;
}

/**
 * SWR hook for workspace members, pending invitations, and seat statistics.
 * Supports SSR hydration via fallbackData and instant optimistic mutations.
 */
export function useWorkspaceMembers(
  workspaceSlug: string,
  initialData?: WorkspaceMembersData
): UseWorkspaceMembersReturn {
  const key = getWorkspaceMembersKey(workspaceSlug);

  const { data, error, isLoading, isValidating, mutate } = useSWR<WorkspaceMembersData>(
    key,
    async () => {
      const res = await getWorkspaceMembersDataAction(workspaceSlug);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to load workspace members");
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

  const fallbackStats: WorkspaceSeatStats = {
    maxSeats: 1,
    activeCount: 1,
    pendingCount: 0,
    usedSeats: 1,
    remainingSeats: 0,
    canInvite: false,
  };

  return {
    data,
    members: data?.members ?? initialData?.members ?? [],
    pendingInvitations: data?.pendingInvitations ?? initialData?.pendingInvitations ?? [],
    seatStats: data?.seatStats ?? initialData?.seatStats ?? fallbackStats,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export default useWorkspaceMembers;

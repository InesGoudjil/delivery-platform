import { describe, it, expect } from "vitest";
import {
  calculateSeatStats,
  applyAddInvitation,
  applyUpdateMemberRole,
  applyRemoveMember,
  applyRevokeInvitation,
  getWorkspaceMembersKey,
} from "@/lib/swr/use-workspace-members";
import { WorkspaceMembersData } from "@/app/actions/members";
import {
  WorkspaceInvitation,
  EnrichedWorkspaceMember,
} from "@/core/entities/workspace-member";

describe("Workspace Members SWR & State Helpers", () => {
  const initialMembers: EnrichedWorkspaceMember[] = [
    {
      id: "mem_1",
      workspaceId: "ws_1",
      userId: "user_owner",
      role: "owner",
      joinedAt: "2026-01-01T00:00:00.000Z",
      name: "Alice Owner",
      email: "alice@example.com",
      isOwner: true,
    },
    {
      id: "mem_2",
      workspaceId: "ws_1",
      userId: "user_editor",
      role: "editor",
      joinedAt: "2026-01-02T00:00:00.000Z",
      name: "Bob Editor",
      email: "bob@example.com",
    },
  ];

  const initialPendingInvitations: WorkspaceInvitation[] = [
    {
      id: "inv_1",
      workspaceId: "ws_1",
      inviterId: "user_owner",
      email: "charlie@example.com",
      role: "viewer",
      token: "tok_123",
      status: "pending",
      expiresAt: "2026-02-01T00:00:00.000Z",
      createdAt: "2026-01-03T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    },
  ];

  const initialData: WorkspaceMembersData = {
    seatStats: calculateSeatStats(5, initialMembers.length, initialPendingInvitations.length),
    members: initialMembers,
    pendingInvitations: initialPendingInvitations,
  };

  describe("calculateSeatStats", () => {
    it("correctly derives used, remaining seats and canInvite flag when capacity is available", () => {
      const stats = calculateSeatStats(5, 2, 1);
      expect(stats).toEqual({
        maxSeats: 5,
        activeCount: 2,
        pendingCount: 1,
        usedSeats: 3,
        remainingSeats: 2,
        canInvite: true,
      });
    });

    it("handles full capacity accurately (canInvite = false, remaining = 0)", () => {
      const stats = calculateSeatStats(3, 2, 1);
      expect(stats.usedSeats).toBe(3);
      expect(stats.remainingSeats).toBe(0);
      expect(stats.canInvite).toBe(false);
    });

    it("prevents negative remainingSeats if over capacity", () => {
      const stats = calculateSeatStats(2, 2, 1);
      expect(stats.usedSeats).toBe(3);
      expect(stats.remainingSeats).toBe(0);
      expect(stats.canInvite).toBe(false);
    });
  });

  describe("applyAddInvitation", () => {
    it("optimistically appends an invitation and recalculates seat metrics", () => {
      const newInvite: WorkspaceInvitation = {
        id: "inv_2",
        workspaceId: "ws_1",
        inviterId: "user_owner",
        email: "dave@example.com",
        role: "admin",
        token: "tok_456",
        status: "pending",
        expiresAt: "2026-02-02T00:00:00.000Z",
        createdAt: "2026-01-04T00:00:00.000Z",
        updatedAt: "2026-01-04T00:00:00.000Z",
      };

      const next = applyAddInvitation(initialData, newInvite);

      expect(next.pendingInvitations).toHaveLength(2);
      expect(next.pendingInvitations[1].email).toBe("dave@example.com");
      expect(next.seatStats.pendingCount).toBe(2);
      expect(next.seatStats.usedSeats).toBe(4);
      expect(next.seatStats.remainingSeats).toBe(1);
      expect(next.seatStats.canInvite).toBe(true);
    });
  });

  describe("applyUpdateMemberRole", () => {
    it("optimistically modifies target member role without altering other members", () => {
      const next = applyUpdateMemberRole(initialData, "user_editor", "admin");

      const updated = next.members.find((m) => m.userId === "user_editor");
      const untouched = next.members.find((m) => m.userId === "user_owner");

      expect(updated?.role).toBe("admin");
      expect(untouched?.role).toBe("owner");
      expect(next.seatStats).toEqual(initialData.seatStats);
    });
  });

  describe("applyRemoveMember", () => {
    it("optimistically removes a member and frees a seat", () => {
      const next = applyRemoveMember(initialData, "user_editor");

      expect(next.members).toHaveLength(1);
      expect(next.members[0].userId).toBe("user_owner");
      expect(next.seatStats.activeCount).toBe(1);
      expect(next.seatStats.usedSeats).toBe(2);
      expect(next.seatStats.remainingSeats).toBe(3);
      expect(next.seatStats.canInvite).toBe(true);
    });
  });

  describe("applyRevokeInvitation", () => {
    it("optimistically removes a pending invitation and frees a seat", () => {
      const next = applyRevokeInvitation(initialData, "inv_1");

      expect(next.pendingInvitations).toHaveLength(0);
      expect(next.seatStats.pendingCount).toBe(0);
      expect(next.seatStats.usedSeats).toBe(2);
      expect(next.seatStats.remainingSeats).toBe(3);
      expect(next.seatStats.canInvite).toBe(true);
    });
  });

  describe("getWorkspaceMembersKey", () => {
    it("formats the standard SWR cache key", () => {
      expect(getWorkspaceMembersKey("my-workspace")).toBe("/api/workspaces/my-workspace/members");
      expect(getWorkspaceMembersKey(undefined)).toBeNull();
    });
  });
});

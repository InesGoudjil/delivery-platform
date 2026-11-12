import { describe, it, expect, vi, beforeEach } from "vitest";
import * as serverModule from "@/core/server";
import {
  acceptWorkspaceInvitationAction,
  getWorkspaceMembersDataAction,
  inviteWorkspaceMemberAction,
  removeWorkspaceMemberAction,
  revokeWorkspaceInvitationAction,
  updateWorkspaceMemberRoleAction,
} from "@/app/actions/members";
import { MemberService, isInvitationExpired } from "@/core/services/member.service";
import type {
  InvitationStatus,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from "@/core/entities/workspace-member";

/**
 * The actions run against the real MemberService; only the repositories (the database) and the
 * session are faked.
 */
describe("app/actions/members", () => {
  const workspace = {
    id: "ws_1",
    ownerId: "user_owner",
    brandName: "Acme Studios",
    slug: "acme",
    accentColor: "#f5551d",
    defaultLanguage: "en",
    accountType: "studio",
    storageUsedBytes: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  let currentUser: { id: string; email: string; email_confirmed_at: string | null } | null;
  let rows: WorkspaceMember[];
  let invitations: WorkspaceInvitation[];
  let memberRepo: Record<string, ReturnType<typeof vi.fn>>;
  let invitationRepo: Record<string, ReturnType<typeof vi.fn>>;

  const row = (userId: string, role: WorkspaceRole): WorkspaceMember => ({
    id: `mem_${userId}`,
    workspaceId: "ws_1",
    userId,
    role,
    joinedAt: "2026-01-01T00:00:00.000Z",
  });

  const signIn = (id: string, email = `${id}@studio.com`, confirmed = true) => {
    currentUser = { id, email, email_confirmed_at: confirmed ? "2026-01-01T00:00:00.000Z" : null };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    currentUser = null;

    rows = [
      row("user_owner", "owner"),
      row("user_coowner", "owner"),
      row("user_admin", "admin"),
      row("user_editor", "editor"),
      row("user_viewer", "viewer"),
    ];
    invitations = [
      {
        id: "inv_1",
        workspaceId: "ws_1",
        inviterId: "user_admin",
        email: "new.hire@studio.com",
        role: "admin",
        token: "secret_join_token",
        status: "pending",
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    memberRepo = {
      listByWorkspaceId: vi.fn(async () => rows.map((r) => ({ ...r }))),
      listByUserId: vi.fn(async () => []),
      findByWorkspaceAndUserId: vi.fn(async (_ws: string, userId: string) => {
        const found = rows.find((r) => r.userId === userId);
        return found ? { ...found } : null;
      }),
      addMember: vi.fn(async (workspaceId: string, userId: string, role: WorkspaceRole) => {
        const created = { id: `mem_${userId}`, workspaceId, userId, role, joinedAt: new Date().toISOString() };
        rows.push(created);
        return { ...created };
      }),
      updateRole: vi.fn(async (_ws: string, userId: string, role: WorkspaceRole) => {
        const found = rows.find((r) => r.userId === userId);
        if (!found) throw new Error("The role was not changed");
        found.role = role;
        return { ...found };
      }),
      removeMember: vi.fn(async (_ws: string, userId: string) => {
        const index = rows.findIndex((r) => r.userId === userId);
        if (index < 0) throw new Error("Nobody was removed");
        rows.splice(index, 1);
      }),
    };

    // claimPendingByToken() flips the status in one synchronous step, like the single UPDATE it stands for.
    invitationRepo = {
      create: vi.fn(),
      delete: vi.fn(),
      findById: vi.fn(async (id: string) => invitations.find((i) => i.id === id) ?? null),
      findByToken: vi.fn(async (token: string) => {
        const found = invitations.find((i) => i.token === token);
        return found ? { ...found } : null;
      }),
      listPendingByWorkspaceId: vi.fn(async (workspaceId: string) =>
        invitations.filter((i) => i.workspaceId === workspaceId && i.status === "pending").map((i) => ({ ...i }))
      ),
      updateStatus: vi.fn(async (id: string, status: InvitationStatus, fromStatus?: InvitationStatus) => {
        const found = invitations.find((i) => i.id === id && (!fromStatus || i.status === fromStatus));
        if (!found) throw new Error("Invitation not changed.");
        found.status = status;
        return { ...found };
      }),
      claimPendingByToken: vi.fn(async (token: string) => {
        const found = invitations.find((i) => i.token === token && i.status === "pending" && !isInvitationExpired(i));
        if (!found) return null;
        found.status = "accepted";
        return { ...found };
      }),
    };

    const member = new MemberService(
      memberRepo as any,
      invitationRepo as any,
      { findByWorkspaceId: vi.fn(async () => ({ workspaceId: "ws_1", features: { team_seats: 10 } })) } as any,
      { findById: vi.fn(async (id: string) => (id === workspace.id ? workspace : null)) } as any
    );

    vi.spyOn(serverModule, "getServerServices").mockResolvedValue({
      auth: { getCurrentUser: vi.fn(async () => currentUser) },
      workspace: {
        getWorkspaceBySlug: vi.fn(async (slug: string) => (slug === workspace.slug ? workspace : null)),
        getWorkspaceById: vi.fn(async (id: string) => (id === workspace.id ? workspace : null)),
      },
      member,
    } as any);
  });

  describe("getWorkspaceMembersDataAction", () => {
    it.each(["user_viewer", "user_editor"])(
      "gives %s the team but no pending invitations, so no join tokens",
      async (userId) => {
        signIn(userId);

        const res = await getWorkspaceMembersDataAction("acme");

        expect(res.success).toBe(true);
        expect(res.data?.members).toHaveLength(5);
        expect(res.data?.pendingInvitations).toEqual([]);
        expect(JSON.stringify(res)).not.toContain("secret_join_token");
      }
    );

    it.each(["user_admin", "user_coowner", "user_owner"])(
      "gives %s the pending invitations with their tokens",
      async (userId) => {
        signIn(userId);

        const res = await getWorkspaceMembersDataAction("acme");

        expect(res.data?.pendingInvitations.map((i) => i.token)).toEqual(["secret_join_token"]);
      }
    );

    it("refuses people outside the workspace", async () => {
      signIn("user_outsider");

      await expect(getWorkspaceMembersDataAction("acme")).resolves.toEqual({
        success: false,
        error: "Permission denied.",
      });
    });
  });

  describe("acceptWorkspaceInvitationAction", () => {
    it("adds the invited person once: the same link can't be used again", async () => {
      signIn("user_new", "New.Hire@Studio.com");

      await expect(acceptWorkspaceInvitationAction("secret_join_token")).resolves.toEqual({
        success: true,
        data: { workspaceSlug: "acme" },
      });
      expect(rows.find((r) => r.userId === "user_new")?.role).toBe("admin");

      await expect(acceptWorkspaceInvitationAction("secret_join_token")).resolves.toEqual({
        success: false,
        error: "This invitation has already been accepted.",
      });
      expect(memberRepo.addMember).toHaveBeenCalledTimes(1);
    });

    it("refuses a signed-in account with another email, such as a viewer who copied the link", async () => {
      signIn("user_viewer");

      const res = await acceptWorkspaceInvitationAction("secret_join_token");

      expect(res).toEqual({
        success: false,
        error: "This invitation was sent to new.hire@studio.com. Sign in with that email address to accept it.",
      });
      expect(invitations[0].status).toBe("pending");
      expect(rows.find((r) => r.userId === "user_viewer")?.role).toBe("viewer");
      expect(memberRepo.addMember).not.toHaveBeenCalled();
    });

    it("refuses the invited email until it is confirmed", async () => {
      signIn("user_new", "new.hire@studio.com", false);

      const res = await acceptWorkspaceInvitationAction("secret_join_token");

      expect(res.success).toBe(false);
      expect(res.error).toContain("Confirm your email address (new.hire@studio.com)");
      expect(invitations[0].status).toBe("pending");
      expect(memberRepo.addMember).not.toHaveBeenCalled();
    });

    it("asks signed-out visitors to sign in", async () => {
      await expect(acceptWorkspaceInvitationAction("secret_join_token")).resolves.toEqual({
        success: false,
        error: "Please sign in or create an account to accept this invitation.",
      });
    });
  });

  describe("updateWorkspaceMemberRoleAction", () => {
    it.each(["user_admin", "user_owner"])("doesn't let %s make anyone owner", async (userId) => {
      signIn(userId);

      await expect(updateWorkspaceMemberRoleAction("acme", "user_editor", "owner" as any)).resolves.toEqual({
        success: false,
        error: "Choose the admin, editor or viewer role.",
      });
      expect(memberRepo.updateRole).not.toHaveBeenCalled();
    });

    it("lets admins change an editor's role", async () => {
      signIn("user_admin");

      const res = await updateWorkspaceMemberRoleAction("acme", "user_editor", "viewer");

      expect(res.success).toBe(true);
      expect(rows.find((r) => r.userId === "user_editor")?.role).toBe("viewer");
    });

    it("doesn't let admins change a co-owner's role, but lets owners", async () => {
      signIn("user_admin");
      await expect(updateWorkspaceMemberRoleAction("acme", "user_coowner", "viewer")).resolves.toEqual({
        success: false,
        error: "Only owners can change another owner's role.",
      });

      signIn("user_owner");
      await expect(updateWorkspaceMemberRoleAction("acme", "user_coowner", "admin")).resolves.toMatchObject({
        success: true,
      });
      expect(rows.find((r) => r.userId === "user_coowner")?.role).toBe("admin");
    });

    it("never changes the workspace owner's role", async () => {
      signIn("user_coowner");

      await expect(updateWorkspaceMemberRoleAction("acme", "user_owner", "viewer")).resolves.toEqual({
        success: false,
        error: "The workspace owner's role cannot be changed.",
      });
    });

    it("refuses viewers and editors", async () => {
      for (const userId of ["user_viewer", "user_editor"]) {
        signIn(userId);
        const res = await updateWorkspaceMemberRoleAction("acme", "user_viewer", "admin");
        expect(res.success).toBe(false);
        expect(res.error).toContain("Permission denied");
      }
      expect(memberRepo.updateRole).not.toHaveBeenCalled();
    });
  });

  describe("removeWorkspaceMemberAction", () => {
    it("reports a failure, not success, when the database removed nothing", async () => {
      signIn("user_admin");
      memberRepo.removeMember.mockRejectedValueOnce(
        new Error("Nobody was removed: this person is not a member of the workspace, or you are not allowed to remove them.")
      );

      await expect(removeWorkspaceMemberAction("acme", "user_editor")).resolves.toEqual({
        success: false,
        error: "Nobody was removed: this person is not a member of the workspace, or you are not allowed to remove them.",
      });
    });

    it("lets a member leave", async () => {
      signIn("user_viewer");

      await expect(removeWorkspaceMemberAction("acme", "user_viewer")).resolves.toEqual({ success: true });
      expect(rows.some((r) => r.userId === "user_viewer")).toBe(false);
    });

    it("doesn't let editors remove others", async () => {
      signIn("user_editor");

      const res = await removeWorkspaceMemberAction("acme", "user_viewer");

      expect(res.success).toBe(false);
      expect(memberRepo.removeMember).not.toHaveBeenCalled();
    });

    it("lets only owners remove a co-owner, and nobody the workspace owner", async () => {
      signIn("user_admin");
      await expect(removeWorkspaceMemberAction("acme", "user_coowner")).resolves.toEqual({
        success: false,
        error: "Only owners can remove another owner.",
      });

      signIn("user_coowner");
      await expect(removeWorkspaceMemberAction("acme", "user_owner")).resolves.toEqual({
        success: false,
        error: "Cannot remove the workspace owner.",
      });

      signIn("user_owner");
      await expect(removeWorkspaceMemberAction("acme", "user_coowner")).resolves.toEqual({ success: true });
    });
  });

  describe("invitations", () => {
    it("doesn't let anyone invite an owner", async () => {
      signIn("user_owner");

      await expect(inviteWorkspaceMemberAction("acme", "partner@studio.com", "owner" as any)).resolves.toEqual({
        success: false,
        error: "Choose the admin, editor or viewer role.",
      });
      expect(invitationRepo.create).not.toHaveBeenCalled();
    });

    it("doesn't let viewers revoke invitations", async () => {
      signIn("user_viewer");

      const res = await revokeWorkspaceInvitationAction("acme", "inv_1");

      expect(res.success).toBe(false);
      expect(invitations[0].status).toBe("pending");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MemberService,
  getInvitationAcceptBlocker,
  isInvitationExpired,
  type InvitationAcceptor,
} from "@/core/services/member.service";
import type {
  IWorkspaceMemberRepository,
  IWorkspaceInvitationRepository,
} from "@/core/repositories/workspace-member.repository";
import type {
  IWorkspaceFeaturesRepository,
  IWorkspaceRepository,
} from "@/core/repositories/workspace.repository";
import type { IUserProfileRepository } from "@/core/repositories/user-profile.repository";
import type { Workspace } from "@/core/entities/workspace";
import type {
  InvitationStatus,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from "@/core/entities/workspace-member";

const OWNER = "owner_123";
const IN_A_DAY = () => new Date(Date.now() + 86_400_000).toISOString();
const AN_HOUR_AGO = () => new Date(Date.now() - 3_600_000).toISOString();

function memberRow(userId: string, role: WorkspaceRole): WorkspaceMember {
  return { id: `mem_${userId}`, workspaceId: "ws_1", userId, role, joinedAt: "2026-01-01T00:00:00.000Z" };
}

function invitation(overrides: Partial<WorkspaceInvitation> = {}): WorkspaceInvitation {
  return {
    id: "inv_1",
    workspaceId: "ws_1",
    inviterId: OWNER,
    email: "invitee@studio.com",
    role: "editor",
    token: "token_1",
    status: "pending",
    expiresAt: IN_A_DAY(),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Invitation repository over an in-memory table. claimPendingByToken() flips the status in one
 * synchronous step, like the single UPDATE ... WHERE status = 'pending' it stands for.
 */
function inMemoryInvitations(rows: WorkspaceInvitation[]) {
  const table = rows.map((row) => ({ ...row }));
  const copy = (row: WorkspaceInvitation | undefined) => (row ? { ...row } : null);
  const repo = {
    create: vi.fn(),
    findById: vi.fn(async (id: string) => copy(table.find((r) => r.id === id))),
    findByToken: vi.fn(async (token: string) => copy(table.find((r) => r.token === token))),
    listPendingByWorkspaceId: vi.fn(async (workspaceId: string) =>
      table.filter((r) => r.workspaceId === workspaceId && r.status === "pending").map((r) => ({ ...r }))
    ),
    updateStatus: vi.fn(async (id: string, status: InvitationStatus, fromStatus?: InvitationStatus) => {
      const row = table.find((r) => r.id === id && (!fromStatus || r.status === fromStatus));
      if (!row) throw new Error("Invitation not changed.");
      row.status = status;
      return { ...row };
    }),
    claimPendingByToken: vi.fn(async (token: string) => {
      const row = table.find((r) => r.token === token && r.status === "pending" && !isInvitationExpired(r));
      if (!row) return null;
      row.status = "accepted";
      return { ...row };
    }),
    delete: vi.fn(),
  };
  return { repo, table };
}

describe("core/services/MemberService", () => {
  let memberRepo: Partial<IWorkspaceMemberRepository>;
  let invitationRepo: Partial<IWorkspaceInvitationRepository>;
  let featuresRepo: Partial<IWorkspaceFeaturesRepository>;
  let workspaceRepo: Partial<IWorkspaceRepository>;
  let userProfileRepo: Partial<IUserProfileRepository>;
  let service: MemberService;

  const mockWorkspace: Workspace = {
    id: "ws_1",
    ownerId: OWNER,
    brandName: "Acme Studios",
    slug: "acme-studios",
    accentColor: "#f5551d",
    defaultLanguage: "en",
    accountType: "individual",
    storageUsedBytes: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  /** workspace_members rows the repository returns (the owner in owner_id needs none). */
  function givenMembers(...rows: WorkspaceMember[]) {
    vi.mocked(memberRepo.findByWorkspaceAndUserId!).mockImplementation(
      async (_workspaceId, userId) => rows.find((row) => row.userId === userId) ?? null
    );
  }

  function buildService(overrides: { invitationRepo?: Partial<IWorkspaceInvitationRepository>; systemMemberRepo?: Partial<IWorkspaceMemberRepository> } = {}) {
    return new MemberService(
      memberRepo as IWorkspaceMemberRepository,
      (overrides.invitationRepo ?? invitationRepo) as IWorkspaceInvitationRepository,
      featuresRepo as IWorkspaceFeaturesRepository,
      workspaceRepo as IWorkspaceRepository,
      userProfileRepo as IUserProfileRepository,
      undefined,
      overrides.systemMemberRepo as IWorkspaceMemberRepository | undefined
    );
  }

  beforeEach(() => {
    memberRepo = {
      listByWorkspaceId: vi.fn().mockResolvedValue([]),
      findByWorkspaceAndUserId: vi.fn().mockResolvedValue(null),
      addMember: vi.fn().mockImplementation((wsId, uId, role) =>
        Promise.resolve({ id: "mem_1", workspaceId: wsId, userId: uId, role, joinedAt: new Date() })
      ),
      updateRole: vi.fn().mockImplementation((wsId, uId, role) =>
        Promise.resolve({ id: "mem_1", workspaceId: wsId, userId: uId, role, joinedAt: new Date() })
      ),
      removeMember: vi.fn().mockResolvedValue(undefined),
    };

    invitationRepo = {
      listPendingByWorkspaceId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((dto) =>
        Promise.resolve({
          id: "inv_1",
          ...dto,
          status: "pending",
          token: "token_xyz",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date(),
        })
      ),
      findById: vi.fn().mockResolvedValue(null),
      findByToken: vi.fn().mockResolvedValue(null),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      claimPendingByToken: vi.fn().mockResolvedValue(null),
    };

    featuresRepo = {
      findByWorkspaceId: vi.fn().mockResolvedValue({
        workspaceId: "ws_1",
        features: { team_seats: 2 },
      } as any),
      upsertFeatures: vi.fn().mockResolvedValue({} as any),
    };

    workspaceRepo = {
      findById: vi.fn().mockResolvedValue(mockWorkspace),
    };

    userProfileRepo = {
      findById: vi.fn().mockResolvedValue({ id: OWNER, fullName: "Jane Owner" } as any),
    };

    service = buildService();
  });

  describe("isMember and getMember", () => {
    it("recognizes workspace owner as member with 'owner' role", async () => {
      const isMem = await service.isMember("ws_1", OWNER);
      expect(isMem).toBe(true);

      const member = await service.getMember("ws_1", OWNER);
      expect(member?.role).toBe("owner");
      expect(member?.userId).toBe(OWNER);
    });

    it("checks member repository for non-owner users", async () => {
      givenMembers(memberRow("user_editor", "editor"));

      const member = await service.getMember("ws_1", "user_editor");
      expect(member?.role).toBe("editor");
      expect(member?.userId).toBe("user_editor");
    });

    it("returns a co-owner's row as is: role 'owner' is a real owner, like has_workspace_role()", async () => {
      givenMembers(memberRow("user_coowner", "owner"));

      expect((await service.getMember("ws_1", "user_coowner"))?.role).toBe("owner");
    });
  });

  describe("inviteMember and getWorkspaceSeatStats", () => {
    it("calculates seat stats correctly", async () => {
      const stats = await service.getWorkspaceSeatStats("ws_1");
      expect(stats.maxSeats).toBe(2);
      expect(stats.activeCount).toBe(1); // Owner included
      expect(stats.pendingCount).toBe(0);
      expect(stats.remainingSeats).toBe(1);
      expect(stats.canInvite).toBe(true);
    });

    it("blocks invitation when team seats are maxed out", async () => {
      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue({
        workspaceId: "ws_1",
        features: { team_seats: 1 }, // Only 1 seat (already taken by owner)
      } as any);

      await expect(
        service.inviteMember("ws_1", OWNER, "collab@studio.com", "editor")
      ).rejects.toThrow("Your plan allows up to 1 team seat(s)");

      expect(invitationRepo.create).not.toHaveBeenCalled();
    });

    it("blocks duplicate pending invitation for the same email", async () => {
      vi.mocked(featuresRepo.findByWorkspaceId!).mockResolvedValue({
        workspaceId: "ws_1",
        features: { team_seats: 5 },
      } as any);

      vi.mocked(invitationRepo.listPendingByWorkspaceId!).mockResolvedValue([
        { id: "inv_existing", email: "collab@studio.com" } as any,
      ]);

      await expect(
        service.inviteMember("ws_1", OWNER, "Collab@Studio.com ", "editor")
      ).rejects.toThrow("An invitation has already been sent to collab@studio.com.");
    });

    it("creates invitation when seats are available", async () => {
      const invite = await service.inviteMember(
        "ws_1",
        OWNER,
        "neweditor@studio.com",
        "editor"
      );

      expect(invite.id).toBe("inv_1");
      expect(invite.email).toBe("neweditor@studio.com");
      expect(invitationRepo.create).toHaveBeenCalledOnce();
    });

    it("lets admins invite admins", async () => {
      givenMembers(memberRow("user_admin", "admin"));

      await service.inviteMember("ws_1", "user_admin", "second-admin@studio.com", "admin");

      expect(invitationRepo.create).toHaveBeenCalledWith(expect.objectContaining({ role: "admin" }));
    });

    it("never invites anyone as owner, even when the owner asks", async () => {
      await expect(
        service.inviteMember("ws_1", OWNER, "takeover@studio.com", "owner" as any)
      ).rejects.toThrow("Invitations can only give the admin, editor or viewer role.");

      expect(invitationRepo.create).not.toHaveBeenCalled();
    });

    it("refuses inviters who aren't owners or admins (invitations are written with the service role)", async () => {
      givenMembers(memberRow("user_editor", "editor"));

      await expect(
        service.inviteMember("ws_1", "user_editor", "friend@studio.com", "viewer")
      ).rejects.toThrow("Permission denied");

      expect(invitationRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("listPendingInvitations", () => {
    const pending = [invitation({ token: "secret_join_token", role: "admin" })];

    beforeEach(() => {
      vi.mocked(invitationRepo.listPendingByWorkspaceId!).mockResolvedValue(pending);
      givenMembers(
        memberRow("user_viewer", "viewer"),
        memberRow("user_editor", "editor"),
        memberRow("user_admin", "admin"),
        memberRow("user_coowner", "owner")
      );
    });

    it.each(["user_viewer", "user_editor", "user_outsider"])(
      "gives %s no invitations, so no join tokens",
      async (viewerId) => {
        const result = await service.listPendingInvitations("ws_1", viewerId);

        expect(result).toEqual([]);
        expect(invitationRepo.listPendingByWorkspaceId).not.toHaveBeenCalled();
      }
    );

    it.each(["user_admin", "user_coowner", OWNER])(
      "gives %s the pending invitations with their tokens",
      async (viewerId) => {
        const result = await service.listPendingInvitations("ws_1", viewerId);

        expect(result).toEqual(pending);
        expect(result[0].token).toBe("secret_join_token");
      }
    );
  });

  describe("revokeInvitation", () => {
    it("revokes a pending invitation of this workspace, only while it is still pending", async () => {
      vi.mocked(invitationRepo.findById!).mockResolvedValue(invitation());

      await service.revokeInvitation("inv_1", "ws_1");

      expect(invitationRepo.updateStatus).toHaveBeenCalledWith("inv_1", "revoked", "pending");
    });

    it("refuses an invitation of another workspace", async () => {
      vi.mocked(invitationRepo.findById!).mockResolvedValue(invitation({ workspaceId: "ws_other" }));

      await expect(service.revokeInvitation("inv_1", "ws_1")).rejects.toThrow(
        "Invitation not found in this workspace."
      );
      expect(invitationRepo.updateStatus).not.toHaveBeenCalled();
    });

    it("refuses an invitation that was already accepted", async () => {
      vi.mocked(invitationRepo.findById!).mockResolvedValue(invitation({ status: "accepted" }));

      await expect(service.revokeInvitation("inv_1", "ws_1")).rejects.toThrow(
        "This invitation was already accepted."
      );
      expect(invitationRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe("acceptInvitation", () => {
    const invitee: InvitationAcceptor = {
      id: "user_invitee",
      email: "invitee@studio.com",
      emailConfirmedAt: "2026-01-01T00:00:00.000Z",
    };

    it("claims the invitation, then adds the invited user with the invited role", async () => {
      const { repo, table } = inMemoryInvitations([invitation({ role: "admin" })]);
      service = buildService({ invitationRepo: repo });

      const member = await service.acceptInvitation("token_1", {
        ...invitee,
        email: "  Invitee@Studio.COM ",
      });

      expect(member.userId).toBe("user_invitee");
      expect(member.role).toBe("admin");
      expect(repo.claimPendingByToken).toHaveBeenCalledWith("token_1");
      expect(memberRepo.addMember).toHaveBeenCalledWith("ws_1", "user_invitee", "admin");
      expect(table[0].status).toBe("accepted");
      // Claimed before the membership exists, so a second request can't also insert one.
      expect(vi.mocked(repo.claimPendingByToken).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(memberRepo.addMember!).mock.invocationCallOrder[0]
      );
    });

    it("adds the membership with the server's (service role) repository when there is one", async () => {
      const { repo } = inMemoryInvitations([invitation()]);
      const systemMemberRepo = {
        findByWorkspaceAndUserId: vi.fn().mockResolvedValue(null),
        addMember: vi.fn().mockResolvedValue(memberRow("user_invitee", "editor")),
      };
      service = buildService({ invitationRepo: repo, systemMemberRepo });

      await service.acceptInvitation("token_1", invitee);

      expect(systemMemberRepo.addMember).toHaveBeenCalledWith("ws_1", "user_invitee", "editor");
      expect(memberRepo.addMember).not.toHaveBeenCalled();
    });

    it("refuses an account with a different email, and leaves the invitation pending", async () => {
      const { repo, table } = inMemoryInvitations([invitation()]);
      service = buildService({ invitationRepo: repo });

      await expect(
        service.acceptInvitation("token_1", { ...invitee, email: "attacker@evil.com" })
      ).rejects.toThrow("This invitation was sent to invitee@studio.com. Sign in with that email address to accept it.");

      expect(repo.claimPendingByToken).not.toHaveBeenCalled();
      expect(memberRepo.addMember).not.toHaveBeenCalled();
      expect(table[0].status).toBe("pending");
    });

    it("refuses an account without an email address", async () => {
      const { repo } = inMemoryInvitations([invitation()]);
      service = buildService({ invitationRepo: repo });

      await expect(service.acceptInvitation("token_1", { ...invitee, email: null })).rejects.toThrow(
        "This invitation was sent to invitee@studio.com"
      );
      expect(memberRepo.addMember).not.toHaveBeenCalled();
    });

    it("refuses the invited email until it is confirmed", async () => {
      const { repo, table } = inMemoryInvitations([invitation()]);
      service = buildService({ invitationRepo: repo });

      await expect(
        service.acceptInvitation("token_1", { ...invitee, emailConfirmedAt: null })
      ).rejects.toThrow("Confirm your email address (invitee@studio.com) before accepting this invitation");

      expect(repo.claimPendingByToken).not.toHaveBeenCalled();
      expect(memberRepo.addMember).not.toHaveBeenCalled();
      expect(table[0].status).toBe("pending");
    });

    it("can't be accepted twice with the same token", async () => {
      const { repo } = inMemoryInvitations([invitation()]);
      service = buildService({ invitationRepo: repo });

      await service.acceptInvitation("token_1", invitee);
      await expect(service.acceptInvitation("token_1", invitee)).rejects.toThrow(
        "This invitation has already been accepted."
      );

      expect(memberRepo.addMember).toHaveBeenCalledTimes(1);
    });

    it("lets only one of two simultaneous accepts through", async () => {
      const { repo } = inMemoryInvitations([invitation()]);
      service = buildService({ invitationRepo: repo });

      const results = await Promise.allSettled([
        service.acceptInvitation("token_1", invitee),
        service.acceptInvitation("token_1", invitee),
      ]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
      expect(rejected.reason.message).toBe("This invitation has already been accepted.");
      expect(memberRepo.addMember).toHaveBeenCalledTimes(1);
    });

    it("uses up the invitation of someone already in the workspace, without a second membership or a role change", async () => {
      const { repo, table } = inMemoryInvitations([invitation({ role: "admin" })]);
      service = buildService({ invitationRepo: repo });
      givenMembers(memberRow("user_invitee", "viewer"));

      const member = await service.acceptInvitation("token_1", invitee);

      expect(member.role).toBe("viewer");
      expect(memberRepo.addMember).not.toHaveBeenCalled();
      expect(table[0].status).toBe("accepted");
    });

    it("doesn't add a membership row for the workspace owner", async () => {
      const { repo } = inMemoryInvitations([invitation({ email: "owner@studio.com" })]);
      service = buildService({ invitationRepo: repo });

      const member = await service.acceptInvitation("token_1", {
        id: OWNER,
        email: "owner@studio.com",
        emailConfirmedAt: "2026-01-01T00:00:00.000Z",
      });

      expect(member.role).toBe("owner");
      expect(memberRepo.addMember).not.toHaveBeenCalled();
    });

    it("throws error and marks expired when invitation has passed expiration date", async () => {
      const { repo, table } = inMemoryInvitations([invitation({ expiresAt: AN_HOUR_AGO() })]);
      service = buildService({ invitationRepo: repo });

      await expect(service.acceptInvitation("token_1", invitee)).rejects.toThrow(
        "This invitation has expired"
      );

      expect(repo.updateStatus).toHaveBeenCalledWith("inv_1", "expired", "pending");
      expect(table[0].status).toBe("expired");
      expect(memberRepo.addMember).not.toHaveBeenCalled();
    });

    it("refuses a revoked invitation", async () => {
      const { repo } = inMemoryInvitations([invitation({ status: "revoked" })]);
      service = buildService({ invitationRepo: repo });

      await expect(service.acceptInvitation("token_1", invitee)).rejects.toThrow("This invitation was revoked.");
      expect(memberRepo.addMember).not.toHaveBeenCalled();
    });

    it("doesn't blame the invitation when the server couldn't claim it (e.g. no service role)", async () => {
      vi.mocked(invitationRepo.findByToken!).mockResolvedValue(invitation());
      vi.mocked(invitationRepo.claimPendingByToken!).mockResolvedValue(null);

      await expect(service.acceptInvitation("token_1", invitee)).rejects.toThrow(
        "We could not accept this invitation. Please try again."
      );
      expect(memberRepo.addMember).not.toHaveBeenCalled();
    });

    it("refuses an unknown token", async () => {
      const { repo } = inMemoryInvitations([]);
      service = buildService({ invitationRepo: repo });

      await expect(service.acceptInvitation("nope", invitee)).rejects.toThrow("This invitation link is invalid.");
    });

    it("hands the invitation back when the membership can't be added", async () => {
      const { repo, table } = inMemoryInvitations([invitation()]);
      service = buildService({ invitationRepo: repo });
      vi.mocked(memberRepo.addMember!).mockRejectedValue(new Error("Error adding member: connection reset"));

      await expect(service.acceptInvitation("token_1", invitee)).rejects.toThrow(
        "We could not add you to the workspace. Please try again."
      );

      expect(repo.updateStatus).toHaveBeenCalledWith("inv_1", "pending", "accepted");
      expect(table[0].status).toBe("pending");
    });

    it("keeps the membership created in the meantime (e.g. through another invitation)", async () => {
      const { repo } = inMemoryInvitations([invitation()]);
      service = buildService({ invitationRepo: repo });
      vi.mocked(memberRepo.findByWorkspaceAndUserId!)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(memberRow("user_invitee", "editor"));
      vi.mocked(memberRepo.addMember!).mockRejectedValue(new Error("duplicate key value violates unique constraint"));

      const member = await service.acceptInvitation("token_1", invitee);

      expect(member.userId).toBe("user_invitee");
      expect(repo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe("getInvitationAcceptBlocker", () => {
    it("accepts the invited email in any case or spacing, once confirmed", () => {
      expect(getInvitationAcceptBlocker("Invitee@Studio.com", { email: " invitee@studio.COM", emailConfirmedAt: "2026-01-01" })).toBeNull();
    });

    it("flags another email, a missing email and an unconfirmed email", () => {
      expect(getInvitationAcceptBlocker("invitee@studio.com", { email: "other@studio.com", emailConfirmedAt: "2026-01-01" })).toBe("wrong_email");
      expect(getInvitationAcceptBlocker("invitee@studio.com", { email: undefined, emailConfirmedAt: "2026-01-01" })).toBe("wrong_email");
      expect(getInvitationAcceptBlocker("invitee@studio.com", { email: "invitee@studio.com", emailConfirmedAt: null })).toBe("unconfirmed_email");
    });
  });

  describe("updateMemberRole", () => {
    beforeEach(() => {
      givenMembers(
        memberRow("user_admin", "admin"),
        memberRow("user_admin2", "admin"),
        memberRow("user_editor", "editor"),
        memberRow("user_viewer", "viewer"),
        memberRow("user_coowner", "owner")
      );
    });

    it("lets admins change an editor's role", async () => {
      await service.updateMemberRole("ws_1", "user_admin", "user_editor", "viewer");
      expect(memberRepo.updateRole).toHaveBeenCalledWith("ws_1", "user_editor", "viewer");
    });

    it("lets admins change another admin's role, as the database does", async () => {
      await service.updateMemberRole("ws_1", "user_admin", "user_admin2", "editor");
      expect(memberRepo.updateRole).toHaveBeenCalledWith("ws_1", "user_admin2", "editor");
    });

    it.each(["user_admin", OWNER])("doesn't let %s make anyone owner", async (actorId) => {
      await expect(
        service.updateMemberRole("ws_1", actorId, "user_editor", "owner" as any)
      ).rejects.toThrow("Members can only be given the admin, editor or viewer role.");
      expect(memberRepo.updateRole).not.toHaveBeenCalled();
    });

    it("doesn't let admins change a co-owner's role", async () => {
      await expect(
        service.updateMemberRole("ws_1", "user_admin", "user_coowner", "viewer")
      ).rejects.toThrow("Only owners can change another owner's role.");
      expect(memberRepo.updateRole).not.toHaveBeenCalled();
    });

    it("lets owners move a co-owner to another role", async () => {
      await service.updateMemberRole("ws_1", OWNER, "user_coowner", "admin");
      expect(memberRepo.updateRole).toHaveBeenCalledWith("ws_1", "user_coowner", "admin");
    });

    it.each(["user_admin", "user_coowner"])("doesn't let %s change the workspace owner's role", async (actorId) => {
      await expect(service.updateMemberRole("ws_1", actorId, OWNER, "viewer")).rejects.toThrow(
        "The workspace owner's role cannot be changed."
      );
      expect(memberRepo.updateRole).not.toHaveBeenCalled();
    });

    it.each(["user_editor", "user_viewer", "user_outsider"])("doesn't let %s change roles", async (actorId) => {
      await expect(service.updateMemberRole("ws_1", actorId, "user_viewer", "admin")).rejects.toThrow(
        "Permission denied"
      );
      expect(memberRepo.updateRole).not.toHaveBeenCalled();
    });

    it("refuses someone who isn't a member", async () => {
      await expect(service.updateMemberRole("ws_1", "user_admin", "user_outsider", "editor")).rejects.toThrow(
        "This person is not a member of this workspace."
      );
    });

    it("passes on the repository's error when the database changed nothing", async () => {
      vi.mocked(memberRepo.updateRole!).mockRejectedValue(new Error("The role was not changed"));

      await expect(service.updateMemberRole("ws_1", "user_admin", "user_editor", "viewer")).rejects.toThrow(
        "The role was not changed"
      );
    });
  });

  describe("removeMember", () => {
    beforeEach(() => {
      givenMembers(
        memberRow("user_admin", "admin"),
        memberRow("user_editor", "editor"),
        memberRow("user_viewer", "viewer"),
        memberRow("user_coowner", "owner")
      );
    });

    it("prevents removing the workspace owner", async () => {
      await expect(service.removeMember("ws_1", "user_coowner", OWNER)).rejects.toThrow(
        "Cannot remove the workspace owner."
      );
      await expect(service.removeMember("ws_1", OWNER, OWNER)).rejects.toThrow(
        "Cannot remove the workspace owner."
      );

      expect(memberRepo.removeMember).not.toHaveBeenCalled();
    });

    it("lets admins remove regular workspace members", async () => {
      await service.removeMember("ws_1", "user_admin", "user_editor");
      expect(memberRepo.removeMember).toHaveBeenCalledWith("ws_1", "user_editor");
    });

    it("lets members leave", async () => {
      await service.removeMember("ws_1", "user_viewer", "user_viewer");
      expect(memberRepo.removeMember).toHaveBeenCalledWith("ws_1", "user_viewer");
    });

    it("doesn't let editors remove others", async () => {
      await expect(service.removeMember("ws_1", "user_editor", "user_viewer")).rejects.toThrow("Permission denied");
      expect(memberRepo.removeMember).not.toHaveBeenCalled();
    });

    it("doesn't let outsiders remove anyone", async () => {
      await expect(service.removeMember("ws_1", "user_outsider", "user_viewer")).rejects.toThrow("Permission denied");
      expect(memberRepo.removeMember).not.toHaveBeenCalled();
    });

    it("lets only owners remove a co-owner", async () => {
      await expect(service.removeMember("ws_1", "user_admin", "user_coowner")).rejects.toThrow(
        "Only owners can remove another owner."
      );
      expect(memberRepo.removeMember).not.toHaveBeenCalled();

      await service.removeMember("ws_1", OWNER, "user_coowner");
      expect(memberRepo.removeMember).toHaveBeenCalledWith("ws_1", "user_coowner");
    });

    it("fails when nothing was removed", async () => {
      vi.mocked(memberRepo.removeMember!).mockRejectedValue(new Error("Nobody was removed"));

      await expect(service.removeMember("ws_1", "user_admin", "user_editor")).rejects.toThrow("Nobody was removed");
    });
  });
});

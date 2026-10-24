import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemberService } from "@/core/services/member.service";
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

describe("core/services/MemberService", () => {
  let memberRepo: Partial<IWorkspaceMemberRepository>;
  let invitationRepo: Partial<IWorkspaceInvitationRepository>;
  let featuresRepo: Partial<IWorkspaceFeaturesRepository>;
  let workspaceRepo: Partial<IWorkspaceRepository>;
  let userProfileRepo: Partial<IUserProfileRepository>;
  let service: MemberService;

  const mockWorkspace: Workspace = {
    id: "ws_1",
    ownerId: "owner_123",
    brandName: "Acme Studios",
    slug: "acme-studios",
    accentColor: "#f5551d",
    defaultLanguage: "en",
    accountType: "creator",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
      findById: vi.fn().mockResolvedValue({ id: "owner_123", fullName: "Jane Owner" } as any),
    };

    service = new MemberService(
      memberRepo as IWorkspaceMemberRepository,
      invitationRepo as IWorkspaceInvitationRepository,
      featuresRepo as IWorkspaceFeaturesRepository,
      workspaceRepo as IWorkspaceRepository,
      userProfileRepo as IUserProfileRepository
    );
  });

  describe("isMember and getMember", () => {
    it("recognizes workspace owner as member with 'owner' role", async () => {
      const isMem = await service.isMember("ws_1", "owner_123");
      expect(isMem).toBe(true);

      const member = await service.getMember("ws_1", "owner_123");
      expect(member?.role).toBe("owner");
      expect(member?.userId).toBe("owner_123");
    });

    it("checks member repository for non-owner users", async () => {
      vi.mocked(memberRepo.findByWorkspaceAndUserId!).mockResolvedValue({
        id: "mem_editor",
        workspaceId: "ws_1",
        userId: "user_editor",
        role: "editor",
        joinedAt: new Date(),
      });

      const member = await service.getMember("ws_1", "user_editor");
      expect(member?.role).toBe("editor");
      expect(member?.userId).toBe("user_editor");
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
        service.inviteMember("ws_1", "owner_123", "collab@studio.com", "editor")
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
        service.inviteMember("ws_1", "owner_123", "collab@studio.com", "editor")
      ).rejects.toThrow("An invitation has already been sent to collab@studio.com.");
    });

    it("creates invitation when seats are available", async () => {
      const invite = await service.inviteMember(
        "ws_1",
        "owner_123",
        "neweditor@studio.com",
        "editor"
      );

      expect(invite.id).toBe("inv_1");
      expect(invite.email).toBe("neweditor@studio.com");
      expect(invitationRepo.create).toHaveBeenCalledOnce();
    });
  });

  describe("acceptInvitation", () => {
    it("adds member and updates invitation status to accepted", async () => {
      vi.mocked(invitationRepo.findByToken!).mockResolvedValue({
        id: "inv_valid",
        workspaceId: "ws_1",
        role: "editor",
        status: "pending",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const member = await service.acceptInvitation("token_valid", "user_accepted");

      expect(member.userId).toBe("user_accepted");
      expect(member.role).toBe("editor");
      expect(memberRepo.addMember).toHaveBeenCalledWith("ws_1", "user_accepted", "editor");
      expect(invitationRepo.updateStatus).toHaveBeenCalledWith("inv_valid", "accepted");
    });

    it("throws error and marks expired when invitation has passed expiration date", async () => {
      vi.mocked(invitationRepo.findByToken!).mockResolvedValue({
        id: "inv_old",
        workspaceId: "ws_1",
        role: "editor",
        status: "pending",
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
      } as any);

      await expect(service.acceptInvitation("token_old", "user_accepted")).rejects.toThrow(
        "This invitation has expired"
      );

      expect(invitationRepo.updateStatus).toHaveBeenCalledWith("inv_old", "expired");
      expect(memberRepo.addMember).not.toHaveBeenCalled();
    });
  });

  describe("removeMember", () => {
    it("prevents removing the workspace owner", async () => {
      await expect(service.removeMember("ws_1", "owner_123")).rejects.toThrow(
        "Cannot remove the workspace owner."
      );

      expect(memberRepo.removeMember).not.toHaveBeenCalled();
    });

    it("removes regular workspace members", async () => {
      await service.removeMember("ws_1", "user_editor");
      expect(memberRepo.removeMember).toHaveBeenCalledWith("ws_1", "user_editor");
    });
  });
});

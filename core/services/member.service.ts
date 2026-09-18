import { WorkspaceMember, WorkspaceInvitation, WorkspaceRole, InvitationStatus, EnrichedWorkspaceMember } from '@/core/entities/workspace-member';
import { IWorkspaceMemberRepository, IWorkspaceInvitationRepository } from '@/core/repositories/workspace-member.repository';
import { IWorkspaceFeaturesRepository, IWorkspaceRepository } from '@/core/repositories/workspace.repository';
import { IUserProfileRepository } from '@/core/repositories/user-profile.repository';
import { NotificationService } from './notification.service';

export class MemberService {
  constructor(
    private readonly memberRepo: IWorkspaceMemberRepository,
    private readonly invitationRepo: IWorkspaceInvitationRepository,
    private readonly featuresRepo: IWorkspaceFeaturesRepository,
    private readonly workspaceRepo?: IWorkspaceRepository,
    private readonly userProfileRepo?: IUserProfileRepository,
    private readonly notificationService?: NotificationService
  ) {}

  async listMembers(workspaceId: string): Promise<EnrichedWorkspaceMember[]> {
    const rawMembers = await this.memberRepo.listByWorkspaceId(workspaceId);
    const workspace = this.workspaceRepo ? await this.workspaceRepo.findById(workspaceId) : null;

    const memberList = [...rawMembers];
    // Ensure workspace owner is present in the list even if not yet in workspace_members table
    if (workspace && !memberList.some((m) => m.userId === workspace.ownerId)) {
      memberList.unshift({
        id: `owner_${workspace.id}`,
        workspaceId: workspace.id,
        userId: workspace.ownerId,
        role: 'owner',
        joinedAt: workspace.createdAt,
      });
    }

    const enriched: EnrichedWorkspaceMember[] = await Promise.all(
      memberList.map(async (m) => {
        let name = 'Team Collaborator';
        let avatarUrl: string | null = null;
        let email: string | null = null;

        if (this.userProfileRepo) {
          try {
            const profile = await this.userProfileRepo.findById(m.userId);
            if (profile?.fullName) name = profile.fullName;
            if (profile?.avatarUrl) avatarUrl = profile.avatarUrl;
          } catch {
            // Ignore profile resolution error
          }
        }

        if (workspace && m.userId === workspace.ownerId && name === 'Team Collaborator') {
          name = workspace.brandName ? `${workspace.brandName} (Owner)` : 'Workspace Owner';
        }

        return {
          ...m,
          name,
          email,
          avatarUrl,
          isOwner: m.role === 'owner' || (workspace ? m.userId === workspace.ownerId : false),
        };
      })
    );

    return enriched;
  }

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    if (this.workspaceRepo) {
      const ws = await this.workspaceRepo.findById(workspaceId);
      if (ws && ws.ownerId === userId) return true;
    }
    const member = await this.memberRepo.findByWorkspaceAndUserId(workspaceId, userId);
    return Boolean(member);
  }

  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    if (this.workspaceRepo) {
      const ws = await this.workspaceRepo.findById(workspaceId);
      if (ws && ws.ownerId === userId) {
        return {
          id: `owner_${ws.id}`,
          workspaceId: ws.id,
          userId: ws.ownerId,
          role: 'owner',
          joinedAt: ws.createdAt,
        };
      }
    }
    return this.memberRepo.findByWorkspaceAndUserId(workspaceId, userId);
  }

  async getWorkspaceSeatStats(workspaceId: string): Promise<{
    maxSeats: number;
    activeCount: number;
    pendingCount: number;
    usedSeats: number;
    remainingSeats: number;
    canInvite: boolean;
  }> {
    const featuresRecord = await this.featuresRepo.findByWorkspaceId(workspaceId);
    const maxSeats = featuresRecord?.features?.team_seats ?? 1;

    const activeMembers = await this.listMembers(workspaceId);
    const pendingInvites = await this.invitationRepo.listPendingByWorkspaceId(workspaceId);

    const activeCount = activeMembers.length;
    const pendingCount = pendingInvites.length;
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

  async inviteMember(
    workspaceId: string,
    inviterId: string,
    email: string,
    role: 'admin' | 'editor' | 'viewer' = 'editor',
    options?: { inviterName?: string; origin?: string }
  ): Promise<WorkspaceInvitation> {
    const cleanEmail = email.trim().toLowerCase();
    const stats = await this.getWorkspaceSeatStats(workspaceId);

    if (!stats.canInvite) {
      throw new Error(
        `Your plan allows up to ${stats.maxSeats} team seat(s). You currently have ${stats.activeCount} member(s) and ${stats.pendingCount} pending invite(s). Upgrade to Studio for more seats.`
      );
    }

    const pending = await this.invitationRepo.listPendingByWorkspaceId(workspaceId);
    if (pending.some((inv) => inv.email.toLowerCase() === cleanEmail)) {
      throw new Error(`An invitation has already been sent to ${cleanEmail}.`);
    }

    const invitation = await this.invitationRepo.create({
      workspaceId,
      inviterId,
      email: cleanEmail,
      role,
    });

    if (this.notificationService) {
      let inviterName = options?.inviterName;
      if (!inviterName && this.userProfileRepo) {
        try {
          const profile = await this.userProfileRepo.findById(inviterId);
          if (profile?.fullName) inviterName = profile.fullName;
        } catch {
          // ignore lookup error
        }
      }

      await this.notificationService
        .sendMemberInvitationEmail({
          workspaceId,
          recipientEmail: cleanEmail,
          inviterName: inviterName || "A team admin",
          inviteToken: invitation.token,
          role,
          origin: options?.origin,
        })
        .catch((err) => {
          console.error("[MemberService] Failed to dispatch member invitation email:", err);
        });
    }

    return invitation;
  }

  async listPendingInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    return this.invitationRepo.listPendingByWorkspaceId(workspaceId);
  }

  async revokeInvitation(invitationId: string, workspaceId: string): Promise<void> {
    const invite = await this.invitationRepo.findById(invitationId);
    if (!invite || invite.workspaceId !== workspaceId) {
      throw new Error('Invitation not found in this workspace.');
    }
    await this.invitationRepo.updateStatus(invitationId, 'revoked');
  }

  async getInvitationByToken(token: string): Promise<WorkspaceInvitation | null> {
    return this.invitationRepo.findByToken(token);
  }

  async acceptInvitation(token: string, userId: string): Promise<WorkspaceMember> {
    const invite = await this.invitationRepo.findByToken(token);
    if (!invite) throw new Error('Invalid or expired invitation token');
    if (invite.status !== 'pending') throw new Error(`Invitation is already ${invite.status}`);

    const isExpired = new Date(invite.expiresAt) < new Date();
    if (isExpired) {
      await this.invitationRepo.updateStatus(invite.id, 'expired');
      throw new Error('This invitation has expired');
    }

    // Add user as workspace member
    const member = await this.memberRepo.addMember(invite.workspaceId, userId, invite.role);
    await this.invitationRepo.updateStatus(invite.id, 'accepted');

    return member;
  }

  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember> {
    return this.memberRepo.updateRole(workspaceId, userId, role);
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    if (this.workspaceRepo) {
      const ws = await this.workspaceRepo.findById(workspaceId);
      if (ws && ws.ownerId === userId) {
        throw new Error('Cannot remove the workspace owner.');
      }
    }
    return this.memberRepo.removeMember(workspaceId, userId);
  }
}

import { WorkspaceMember, WorkspaceInvitation, WorkspaceRole, InvitationStatus } from '@/core/entities/workspace-member';
import { IWorkspaceMemberRepository, IWorkspaceInvitationRepository } from '@/core/repositories/workspace-member.repository';
import { IWorkspaceFeaturesRepository } from '@/core/repositories/workspace.repository';

export class MemberService {
  constructor(
    private readonly memberRepo: IWorkspaceMemberRepository,
    private readonly invitationRepo: IWorkspaceInvitationRepository,
    private readonly featuresRepo: IWorkspaceFeaturesRepository
  ) {}

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.memberRepo.listByWorkspaceId(workspaceId);
  }

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const member = await this.memberRepo.findByWorkspaceAndUserId(workspaceId, userId);
    return Boolean(member);
  }

  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return this.memberRepo.findByWorkspaceAndUserId(workspaceId, userId);
  }

  async inviteMember(
    workspaceId: string,
    inviterId: string,
    email: string,
    role: 'admin' | 'editor' | 'viewer' = 'editor'
  ): Promise<WorkspaceInvitation> {
    // 1. Check team seat capacity from workspace features
    const featuresRecord = await this.featuresRepo.findByWorkspaceId(workspaceId);
    const maxSeats = featuresRecord?.features?.team_seats ?? 1;

    const currentMembers = await this.memberRepo.listByWorkspaceId(workspaceId);
    if (currentMembers.length >= maxSeats) {
      throw new Error(`Your plan allows up to ${maxSeats} team seat(s). Upgrade to add more collaborators.`);
    }

    return this.invitationRepo.create({
      workspaceId,
      inviterId,
      email,
      role,
    });
  }

  async listPendingInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    return this.invitationRepo.listPendingByWorkspaceId(workspaceId);
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
    return this.memberRepo.removeMember(workspaceId, userId);
  }
}

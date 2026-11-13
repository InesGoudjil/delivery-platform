import { WorkspaceMember, WorkspaceInvitation, WorkspaceRole, InvitationStatus, EnrichedWorkspaceMember } from '@/core/entities/workspace-member';
import type { Workspace } from '@/core/entities/workspace';
import { IWorkspaceMemberRepository, IWorkspaceInvitationRepository } from '@/core/repositories/workspace-member.repository';
import { IWorkspaceFeaturesRepository, IWorkspaceRepository } from '@/core/repositories/workspace.repository';
import { IUserProfileRepository } from '@/core/repositories/user-profile.repository';
import { ASSIGNABLE_WORKSPACE_ROLES, type AssignableWorkspaceRole } from '@/lib/validations/members';
import { NotificationService, type NotificationRecipient } from './notification.service';
import type { IAuthEmailLookup } from '@/core/repositories/auth-user-email.repository';
import type { SubscriptionService } from './subscription.service';
import { createScopedLogger } from '@/lib/logger';

const log = createScopedLogger({ service: 'MemberService' });

/** The signed-in user accepting an invitation, as Supabase Auth reports them. */
export interface InvitationAcceptor {
  id: string;
  email?: string | null;
  /** auth.users.email_confirmed_at: only a confirmed address shows the caller owns the invited inbox. */
  emailConfirmedAt?: string | null;
}

/** Why a signed-in user can't accept an invitation. */
export type InvitationAcceptBlocker = 'wrong_email' | 'unconfirmed_email';

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

/**
 * Whether `acceptor` may accept an invitation sent to `invitedEmail`: their account's email must be
 * the invited address (ignoring case and surrounding spaces), and confirmed. Null when they may.
 */
export function getInvitationAcceptBlocker(
  invitedEmail: string,
  acceptor: Pick<InvitationAcceptor, 'email' | 'emailConfirmedAt'>
): InvitationAcceptBlocker | null {
  const email = normalizeEmail(acceptor.email);
  if (!email || email !== normalizeEmail(invitedEmail)) return 'wrong_email';
  if (!acceptor.emailConfirmedAt) return 'unconfirmed_email';
  return null;
}

/** An invitation without an expiry date counts as expired, like the database's `expires_at > now()` checks. */
export function isInvitationExpired(invite: Pick<WorkspaceInvitation, 'expiresAt'>, now: Date = new Date()): boolean {
  const expiresAt = invite.expiresAt ? new Date(invite.expiresAt).getTime() : NaN;
  return Number.isNaN(expiresAt) || expiresAt <= now.getTime();
}

const INVITATION_INVALID = 'This invitation link is invalid. Ask the workspace admin to send you a new one.';
const INVITATION_ACCEPTED = 'This invitation has already been accepted.';
const INVITATION_REVOKED = 'This invitation was revoked. Ask the workspace admin to send you a new one.';
const INVITATION_EXPIRED = 'This invitation has expired. Ask the workspace admin to send you a new one.';

/** Why an invitation in `status` can't be accepted. */
function unavailableInvitationMessage(status: InvitationStatus | undefined): string {
  switch (status) {
    case 'accepted':
      return INVITATION_ACCEPTED;
    case 'revoked':
      return INVITATION_REVOKED;
    case 'expired':
    case 'pending': // still pending but not claimable: its expiry date has passed
      return INVITATION_EXPIRED;
    default:
      return INVITATION_INVALID;
  }
}

function acceptBlockerMessage(blocker: InvitationAcceptBlocker, invitedEmail: string): string {
  return blocker === 'wrong_email'
    ? `This invitation was sent to ${invitedEmail}. Sign in with that email address to accept it.`
    : `Confirm your email address (${invitedEmail}) before accepting this invitation: open the confirmation link we emailed you.`;
}

/** Owners and admins manage members and invitations, like has_workspace_role(..., 'admin') in the database. */
function managesMembers(role: WorkspaceRole | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

function isAssignableRole(role: unknown): role is AssignableWorkspaceRole {
  return (ASSIGNABLE_WORKSPACE_ROLES as readonly unknown[]).includes(role);
}

/** The owner in workspaces.owner_id is a member even without a workspace_members row. */
function ownerMembership(workspace: Workspace): WorkspaceMember {
  return {
    id: `owner_${workspace.id}`,
    workspaceId: workspace.id,
    userId: workspace.ownerId,
    role: 'owner',
    joinedAt: workspace.createdAt,
  };
}

export class MemberService {
  constructor(
    private readonly memberRepo: IWorkspaceMemberRepository,
    private readonly invitationRepo: IWorkspaceInvitationRepository,
    private readonly featuresRepo: IWorkspaceFeaturesRepository,
    private readonly workspaceRepo?: IWorkspaceRepository,
    private readonly userProfileRepo?: IUserProfileRepository,
    private readonly notificationService?: NotificationService,
    private readonly systemMemberRepo?: IWorkspaceMemberRepository,
    private readonly subscriptionService?: SubscriptionService,
    private readonly authEmails?: IAuthEmailLookup
  ) {}

  async listMembers(workspaceId: string): Promise<EnrichedWorkspaceMember[]> {
    const rawMembers = await this.memberRepo.listByWorkspaceId(workspaceId);
    const workspace = this.workspaceRepo ? await this.workspaceRepo.findById(workspaceId) : null;

    const memberList = [...rawMembers];
    // Ensure workspace owner is present in the list even if not yet in workspace_members table
    if (workspace && !memberList.some((m) => m.userId === workspace.ownerId)) {
      memberList.unshift(ownerMembership(workspace));
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

  /**
   * The people who get a studio alert (by default the owners and admins), each with the address to write to.
   * Addresses come from Supabase Auth, because listMembers doesn't carry them. Nobody without an address is listed.
   */
  async listNotificationRecipients(
    workspaceId: string,
    roles: readonly string[] = ['owner', 'admin']
  ): Promise<NotificationRecipient[]> {
    const members = (await this.listMembers(workspaceId)).filter((m) => roles.includes(m.role));
    if (members.length === 0 || !this.authEmails) return [];

    const emails = await this.authEmails.emailsByUserId(members.map((m) => m.userId));
    const recipients: NotificationRecipient[] = [];
    for (const member of members) {
      const email = emails.get(member.userId);
      if (!email) continue;
      recipients.push({ userId: member.userId, email, firstName: await this.firstNameOf(member.userId) });
    }
    return recipients;
  }

  private async firstNameOf(userId: string): Promise<string | null> {
    try {
      const profile = await this.userProfileRepo?.findById(userId);
      return profile?.fullName?.trim().split(/\s+/)[0] || null;
    } catch {
      return null;
    }
  }

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    if (this.workspaceRepo) {
      const ws = await this.workspaceRepo.findById(workspaceId);
      if (ws && ws.ownerId === userId) return true;
    }
    const member = await this.memberRepo.findByWorkspaceAndUserId(workspaceId, userId);
    return Boolean(member);
  }

  /**
   * The user's membership: role "owner" for the owner in workspaces.owner_id, otherwise their
   * workspace_members row (where "owner" means a co-owner). Ranks like has_workspace_role().
   */
  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return this.memberIn(await this.loadWorkspace(workspaceId), workspaceId, userId);
  }

  private async loadWorkspace(workspaceId: string): Promise<Workspace | null> {
    return this.workspaceRepo ? this.workspaceRepo.findById(workspaceId) : null;
  }

  private async memberIn(
    workspace: Workspace | null,
    workspaceId: string,
    userId: string,
    repo: IWorkspaceMemberRepository = this.memberRepo
  ): Promise<WorkspaceMember | null> {
    if (workspace && workspace.ownerId === userId) return ownerMembership(workspace);
    return repo.findByWorkspaceAndUserId(workspaceId, userId);
  }

  async getWorkspaceSeatStats(workspaceId: string): Promise<{
    maxSeats: number;
    activeCount: number;
    pendingCount: number;
    usedSeats: number;
    remainingSeats: number;
    canInvite: boolean;
  }> {
    let maxSeats = 1;
    if (this.subscriptionService) {
      const features = await this.subscriptionService.getFeatures(workspaceId);
      maxSeats = features.team_seats ?? 1;
    } else {
      const featuresRecord = await this.featuresRepo.findByWorkspaceId(workspaceId);
      maxSeats = featuresRecord?.features?.team_seats ?? 1;
    }

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
    role: AssignableWorkspaceRole = 'editor',
    options?: { inviterName?: string; origin?: string }
  ): Promise<WorkspaceInvitation> {
    if (!isAssignableRole(role)) {
      throw new Error('Invitations can only give the admin, editor or viewer role.');
    }

    // Invitations are written with the service role (no RLS), so the inviter is checked here too.
    const inviter = await this.getMember(workspaceId, inviterId);
    if (!managesMembers(inviter?.role)) {
      throw new Error('Permission denied: Only workspace owners and admins can invite team members.');
    }

    const cleanEmail = normalizeEmail(email);
    const stats = await this.getWorkspaceSeatStats(workspaceId);

    if (!stats.canInvite) {
      throw new Error(
        `Your plan allows up to ${stats.maxSeats} team seat(s). You currently have ${stats.activeCount} member(s) and ${stats.pendingCount} pending invite(s). Upgrade to Studio for more seats.`
      );
    }

    const pending = await this.invitationRepo.listPendingByWorkspaceId(workspaceId);
    if (pending.some((inv) => normalizeEmail(inv.email) === cleanEmail)) {
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
          log.error({ err, workspaceId, recipientEmail: cleanEmail }, "Failed to dispatch member invitation email");
        });
    }

    return invitation;
  }

  /**
   * Pending invitations, join tokens included, as shown to `viewerId` on the members page: only
   * owners and admins see them, anyone else gets an empty list.
   */
  async listPendingInvitations(workspaceId: string, viewerId: string): Promise<WorkspaceInvitation[]> {
    const viewer = await this.getMember(workspaceId, viewerId);
    if (!managesMembers(viewer?.role)) return [];
    return this.invitationRepo.listPendingByWorkspaceId(workspaceId);
  }

  async revokeInvitation(invitationId: string, workspaceId: string): Promise<void> {
    const invite = await this.invitationRepo.findById(invitationId);
    if (!invite || invite.workspaceId !== workspaceId) {
      throw new Error('Invitation not found in this workspace.');
    }
    if (invite.status !== 'pending') {
      throw new Error(`This invitation was already ${invite.status}.`);
    }
    await this.invitationRepo.updateStatus(invitationId, 'revoked', 'pending');
  }

  /** Read with the service role by the invite page: the token is the capability to view the invitation. */
  async getInvitationByToken(token: string): Promise<WorkspaceInvitation | null> {
    return this.invitationRepo.findByToken(token);
  }

  /**
   * Adds `acceptor` to the inviting workspace. Their confirmed email must be the invited one. The
   * invitation is claimed first, atomically, so a token works once; someone who is already a member
   * keeps their membership and role (the invitation is still used up).
   */
  async acceptInvitation(token: string, acceptor: InvitationAcceptor): Promise<WorkspaceMember> {
    const invite = await this.invitationRepo.findByToken(token);
    if (!invite) throw new Error(INVITATION_INVALID);
    if (invite.status !== 'pending') throw new Error(unavailableInvitationMessage(invite.status));
    if (isInvitationExpired(invite)) {
      await this.invitationRepo.updateStatus(invite.id, 'expired', 'pending').catch(() => {});
      throw new Error(INVITATION_EXPIRED);
    }

    const blocker = getInvitationAcceptBlocker(invite.email, acceptor);
    if (blocker) throw new Error(acceptBlockerMessage(blocker, invite.email));

    // Already in the workspace? The membership row is read with the server's client, as the invitee
    // can't read the workspace's rows yet (the owner in owner_id can read their own workspace).
    const memberRepoToUse = this.systemMemberRepo || this.memberRepo;
    const workspace = await this.loadWorkspace(invite.workspaceId);
    const existing = await this.memberIn(workspace, invite.workspaceId, acceptor.id, memberRepoToUse);

    const claimed = await this.invitationRepo.claimPendingByToken(token);
    if (!claimed) {
      const latest = await this.invitationRepo.findByToken(token);
      if (latest?.status === 'pending' && !isInvitationExpired(latest)) {
        // Still claimable, yet the UPDATE changed nothing: the server couldn't write it (no service role?).
        log.error({ invitationId: latest.id }, 'Claiming a pending invitation changed no row');
        throw new Error('We could not accept this invitation. Please try again.');
      }
      // Accepted, revoked or expired since it was read above.
      throw new Error(unavailableInvitationMessage(latest?.status));
    }

    if (existing) return existing;

    try {
      return await memberRepoToUse.addMember(claimed.workspaceId, acceptor.id, claimed.role);
    } catch (err) {
      // Joined in the meantime (another invitation): keep that membership.
      const joined = await memberRepoToUse.findByWorkspaceAndUserId(claimed.workspaceId, acceptor.id).catch(() => null);
      if (joined) return joined;

      log.error({ err, workspaceId: claimed.workspaceId, invitationId: claimed.id }, 'Failed to add member after claiming invitation');
      // Hand the invitation back so it can be used again.
      await this.invitationRepo.updateStatus(claimed.id, 'pending', 'accepted').catch((releaseErr) => {
        log.error({ err: releaseErr, invitationId: claimed.id }, 'Failed to release claimed invitation');
      });
      throw new Error('We could not add you to the workspace. Please try again.');
    }
  }

  /**
   * Changes a member's role on behalf of `actorId`, with the database's rules: owners and admins
   * change roles (admins may change other admins), only owners change an owner's role, nobody changes
   * the workspace owner's, and nobody can be made owner (there's no ownership transfer yet).
   */
  async updateMemberRole(
    workspaceId: string,
    actorId: string,
    targetUserId: string,
    role: AssignableWorkspaceRole
  ): Promise<WorkspaceMember> {
    if (!isAssignableRole(role)) {
      throw new Error('Members can only be given the admin, editor or viewer role. Ownership transfer is not available yet.');
    }

    const workspace = await this.loadWorkspace(workspaceId);
    const actor = await this.memberIn(workspace, workspaceId, actorId);
    if (!actor || !managesMembers(actor.role)) {
      throw new Error('Permission denied: Only workspace owners and admins can change roles.');
    }
    if (workspace?.ownerId === targetUserId) {
      throw new Error("The workspace owner's role cannot be changed.");
    }

    const target = await this.memberRepo.findByWorkspaceAndUserId(workspaceId, targetUserId);
    if (!target) throw new Error('This person is not a member of this workspace.');
    if (target.role === 'owner' && actor.role !== 'owner') {
      throw new Error("Only owners can change another owner's role.");
    }
    if (target.role === role) return target;

    return this.memberRepo.updateRole(workspaceId, targetUserId, role);
  }

  /**
   * Removes `targetUserId` on behalf of `actorId`, with the database's rules: anyone can leave,
   * owners and admins remove others, only owners remove an owner, and the workspace owner can't be
   * removed (the database also keeps at least one owner). Throws if nothing was removed.
   */
  async removeMember(workspaceId: string, actorId: string, targetUserId: string): Promise<void> {
    const workspace = await this.loadWorkspace(workspaceId);
    if (workspace?.ownerId === targetUserId) {
      throw new Error('Cannot remove the workspace owner.');
    }

    const actor = await this.memberIn(workspace, workspaceId, actorId);
    if (!actor) throw new Error('Permission denied: You are not a member of this workspace.');

    if (actorId !== targetUserId) {
      if (!managesMembers(actor.role)) {
        throw new Error('Permission denied: Only workspace owners and admins can remove collaborators.');
      }
      const target = await this.memberRepo.findByWorkspaceAndUserId(workspaceId, targetUserId);
      if (!target) throw new Error('This person is not a member of this workspace.');
      if (target.role === 'owner' && actor.role !== 'owner') {
        throw new Error('Only owners can remove another owner.');
      }
    }

    await this.memberRepo.removeMember(workspaceId, targetUserId);
  }
}

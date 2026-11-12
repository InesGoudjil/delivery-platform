import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { WorkspaceMember, WorkspaceInvitation, WorkspaceRole, InvitationStatus } from '@/core/entities/workspace-member';

export interface IWorkspaceMemberRepository {
  listByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]>;
  listByUserId(userId: string): Promise<WorkspaceMember[]>;
  findByWorkspaceAndUserId(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  addMember(workspaceId: string, userId: string, role?: WorkspaceRole): Promise<WorkspaceMember>;
  /** Throws when no row changed: not a member, or the database refused the change. */
  updateRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember>;
  /** Throws when no row was deleted: not a member, or the database refused the removal. */
  removeMember(workspaceId: string, userId: string): Promise<void>;
}

export interface IWorkspaceInvitationRepository {
  create(dto: { workspaceId: string; inviterId: string; email: string; role?: 'admin' | 'editor' | 'viewer' }): Promise<WorkspaceInvitation>;
  findById(id: string): Promise<WorkspaceInvitation | null>;
  findByToken(token: string): Promise<WorkspaceInvitation | null>;
  listPendingByWorkspaceId(workspaceId: string): Promise<WorkspaceInvitation[]>;
  /**
   * Sets the status. With `fromStatus`, only changes an invitation that is still in that status.
   * Throws when no row changed.
   */
  updateStatus(id: string, status: InvitationStatus, fromStatus?: InvitationStatus): Promise<WorkspaceInvitation>;
  /**
   * Marks a pending, unexpired invitation as accepted in a single UPDATE and returns it, so a token
   * can only be used once. Returns null when nothing was claimed (unknown token, no longer pending,
   * or expired).
   */
  claimPendingByToken(token: string): Promise<WorkspaceInvitation | null>;
  /** Throws when no row was deleted. */
  delete(id: string): Promise<void>;
}

/** The database's message, except row-level security refusals, which mean nothing to users. */
function dbErrorMessage(error: { message?: string } | null | undefined): string {
  const message = error?.message || 'Unknown database error';
  return /row-level security/i.test(message) ? 'You do not have permission to make this change.' : message;
}

export class SupabaseWorkspaceMemberRepository implements IWorkspaceMemberRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): WorkspaceMember {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
    };
  }

  async listByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(`Error fetching workspace members: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async listByUserId(userId: string): Promise<WorkspaceMember[]> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_members')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(`Error fetching memberships by user: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async findByWorkspaceAndUserId(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching member: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole = 'editor'): Promise<WorkspaceMember> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role,
      })
      .select()
      .single();

    if (error) throw new Error(`Error adding member: ${dbErrorMessage(error)}`);
    return this.mapRowToEntity(data);
  }

  async updateRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Error updating member role: ${dbErrorMessage(error)}`);
    // RLS hides rows the caller may not change, so a refused update changes nothing without an error.
    if (!data) {
      throw new Error(
        'The role was not changed: this person is not a member of the workspace, or you are not allowed to change their role.'
      );
    }
    return this.mapRowToEntity(data);
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select('id');

    if (error) throw new Error(`Error removing member: ${dbErrorMessage(error)}`);
    // RLS hides rows the caller may not delete, so a refused delete removes nothing without an error.
    if (!data || data.length === 0) {
      throw new Error(
        'Nobody was removed: this person is not a member of the workspace, or you are not allowed to remove them.'
      );
    }
  }
}

export class SupabaseWorkspaceInvitationRepository implements IWorkspaceInvitationRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): WorkspaceInvitation {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      inviterId: row.inviter_id,
      email: row.email,
      role: row.role,
      token: row.token,
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(dto: { workspaceId: string; inviterId: string; email: string; role?: 'admin' | 'editor' | 'viewer' }): Promise<WorkspaceInvitation> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_invitations')
      .insert({
        workspace_id: dto.workspaceId,
        inviter_id: dto.inviterId,
        email: dto.email,
        role: dto.role || 'editor',
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating invitation: ${dbErrorMessage(error)}`);
    return this.mapRowToEntity(data);
  }

  async findById(id: string): Promise<WorkspaceInvitation | null> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_invitations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error finding invitation: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findByToken(token: string): Promise<WorkspaceInvitation | null> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (error) throw new Error(`Error finding invitation: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listPendingByWorkspaceId(workspaceId: string): Promise<WorkspaceInvitation[]> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_invitations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending');

    if (error) throw new Error(`Error listing invitations: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async updateStatus(id: string, status: InvitationStatus, fromStatus?: InvitationStatus): Promise<WorkspaceInvitation> {
    let query = (this.supabase as any)
      .from('workspace_invitations')
      .update({ status })
      .eq('id', id);
    if (fromStatus) query = query.eq('status', fromStatus);

    const { data, error } = await query.select().maybeSingle();

    if (error) throw new Error(`Error updating invitation status: ${dbErrorMessage(error)}`);
    if (!data) {
      throw new Error(fromStatus ? `The invitation is no longer ${fromStatus}.` : 'Invitation not found.');
    }
    return this.mapRowToEntity(data);
  }

  async claimPendingByToken(token: string): Promise<WorkspaceInvitation | null> {
    // UPDATE ... SET status = 'accepted' WHERE token = $1 AND status = 'pending' AND expires_at > now()
    // RETURNING *. A concurrent claim of the same row waits for this one, then no longer matches.
    const { data, error } = await (this.supabase as any)
      .from('workspace_invitations')
      .update({ status: 'accepted' })
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .select()
      .maybeSingle();

    if (error) throw new Error(`Error accepting invitation: ${dbErrorMessage(error)}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async delete(id: string): Promise<void> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_invitations')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) throw new Error(`Error deleting invitation: ${dbErrorMessage(error)}`);
    if (!data || data.length === 0) {
      throw new Error('The invitation was not deleted: it does not exist, or you are not allowed to delete it.');
    }
  }
}

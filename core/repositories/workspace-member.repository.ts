import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { WorkspaceMember, WorkspaceInvitation, WorkspaceRole, InvitationStatus } from '@/core/entities/workspace-member';

export interface IWorkspaceMemberRepository {
  listByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]>;
  findByWorkspaceAndUserId(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  addMember(workspaceId: string, userId: string, role?: WorkspaceRole): Promise<WorkspaceMember>;
  updateRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
}

export interface IWorkspaceInvitationRepository {
  create(dto: { workspaceId: string; inviterId: string; email: string; role?: 'admin' | 'editor' | 'viewer' }): Promise<WorkspaceInvitation>;
  findByToken(token: string): Promise<WorkspaceInvitation | null>;
  listPendingByWorkspaceId(workspaceId: string): Promise<WorkspaceInvitation[]>;
  updateStatus(id: string, status: InvitationStatus): Promise<WorkspaceInvitation>;
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

    if (error) throw new Error(`Error adding member: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async updateRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Error updating member role: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (error) throw new Error(`Error removing member: ${error.message}`);
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

    if (error) throw new Error(`Error creating invitation: ${error.message}`);
    return this.mapRowToEntity(data);
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

  async updateStatus(id: string, status: InvitationStatus): Promise<WorkspaceInvitation> {
    const { data, error } = await (this.supabase as any)
      .from('workspace_invitations')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error updating invitation status: ${error.message}`);
    return this.mapRowToEntity(data);
  }
}

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Project, ProjectStatus } from '@/core/entities/project';
import { IProjectRepository, CreateProjectDTO } from '@/core/repositories/i-project-repository';

export class SupabaseProjectRepository implements IProjectRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Project {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      clientId: row.client_id,
      title: row.title,
      description: row.description,
      shareToken: row.share_token,
      passcodeHash: row.passcode_hash,
      status: row.status,
      isDownloadAllowed: row.is_download_allowed,
      approvedAt: row.approved_at,
      approvedByName: row.approved_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Project | null> {
    const { data, error } = await (this.supabase as any)
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching project by id: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findByShareToken(shareToken: string): Promise<Project | null> {
    const { data, error } = await (this.supabase as any)
      .from('projects')
      .select('*')
      .eq('share_token', shareToken)
      .maybeSingle();

    if (error) throw new Error(`Error fetching project by token: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByWorkspaceId(workspaceId: string): Promise<Project[]> {
    const { data, error } = await (this.supabase as any)
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error listing projects: ${error.message}`);
    return data ? data.map((r: any) => this.mapRowToEntity(r)) : [];
  }

  async create(dto: CreateProjectDTO): Promise<Project> {
    const { data, error } = await (this.supabase as any)
      .from('projects')
      .insert({
        workspace_id: dto.workspaceId,
        client_id: dto.clientId,
        title: dto.title,
        description: dto.description,
        is_download_allowed: dto.isDownloadAllowed ?? false,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create project: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async updateStatus(id: string, status: ProjectStatus, approvedByName?: string): Promise<Project> {
    const updatePayload: any = {
      status,
    };

    if (status === 'approved') {
      updatePayload.approved_at = new Date().toISOString();
      updatePayload.approved_by_name = approvedByName || 'Client Guest';
    }

    const { data, error } = await (this.supabase as any)
      .from('projects')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update project status: ${error.message}`);
    return this.mapRowToEntity(data);
  }
}

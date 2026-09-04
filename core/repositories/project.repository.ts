import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Project, ProjectStatus } from '@/core/entities/project';

export interface CreateProjectDTO {
  workspaceId: string;
  clientId?: string | null;
  title: string;
  description?: string | null;
  passcodeHash?: string | null;
  isDownloadAllowed?: boolean;
  notifyOnDownload?: boolean;
}

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByShareToken(shareToken: string): Promise<Project | null>;
  listByWorkspaceId(workspaceId: string): Promise<Project[]>;
  listByClientId(clientId: string): Promise<Project[]>;
  create(dto: CreateProjectDTO): Promise<Project>;
  update(id: string, data: Partial<Project>): Promise<Project>;
  updateStatus(id: string, status: ProjectStatus, approvedByName?: string): Promise<Project>;
  delete(id: string): Promise<void>;
}

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
      isDownloadAllowed: row.is_download_allowed ?? false,
      notifyOnDownload: row.notify_on_download ?? false,
      approvedAt: row.approved_at,
      approvedByName: row.approved_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Project | null> {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!isUuid) return null;

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

  async listByClientId(clientId: string): Promise<Project[]> {
    const { data, error } = await (this.supabase as any)
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error listing projects by client: ${error.message}`);
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
        passcode_hash: dto.passcodeHash,
        is_download_allowed: dto.isDownloadAllowed ?? false,
        notify_on_download: dto.notifyOnDownload ?? false,
        status: 'in_review',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create project: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<Project>): Promise<Project> {
    const payload: any = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.clientId !== undefined) payload.client_id = data.clientId;
    if (data.passcodeHash !== undefined) payload.passcode_hash = data.passcodeHash;
    if (data.isDownloadAllowed !== undefined) payload.is_download_allowed = data.isDownloadAllowed;
    if (data.notifyOnDownload !== undefined) payload.notify_on_download = data.notifyOnDownload;
    if (data.status !== undefined) payload.status = data.status;
    if (data.approvedAt !== undefined) payload.approved_at = data.approvedAt;
    if (data.approvedByName !== undefined) payload.approved_by_name = data.approvedByName;

    const { data: updated, error } = await (this.supabase as any)
      .from('projects')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update project: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async updateStatus(id: string, status: ProjectStatus, approvedByName?: string): Promise<Project> {
    const payload: any = { status };
    if (status === 'approved') {
      payload.approved_at = new Date().toISOString();
      if (approvedByName) payload.approved_by_name = approvedByName;
    }

    const { data, error } = await (this.supabase as any)
      .from('projects')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update project status: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete project: ${error.message}`);
  }
}

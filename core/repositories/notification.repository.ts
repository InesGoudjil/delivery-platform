import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { NotificationLog, NotificationChannel, NotificationStatus } from '@/core/entities/notification';

export interface CreateNotificationLogDTO {
  workspaceId: string;
  clientId?: string | null;
  projectId?: string | null;
  channel?: NotificationChannel;
  recipientPhone: string;
  status?: NotificationStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}

export interface INotificationLogRepository {
  findById(id: string): Promise<NotificationLog | null>;
  listByWorkspaceId(workspaceId: string): Promise<NotificationLog[]>;
  listByProjectId(projectId: string): Promise<NotificationLog[]>;
  create(dto: CreateNotificationLogDTO): Promise<NotificationLog>;
  updateStatus(
    id: string,
    status: NotificationStatus,
    providerMessageId?: string | null,
    errorMessage?: string | null
  ): Promise<NotificationLog>;
}

export class SupabaseNotificationLogRepository implements INotificationLogRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): NotificationLog {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      clientId: row.client_id,
      projectId: row.project_id,
      channel: row.channel as NotificationChannel,
      recipientPhone: row.recipient_phone,
      status: row.status as NotificationStatus,
      providerMessageId: row.provider_message_id,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    };
  }

  async findById(id: string): Promise<NotificationLog | null> {
    const { data, error } = await (this.supabase as any)
      .from('notification_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching notification log: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByWorkspaceId(workspaceId: string): Promise<NotificationLog[]> {
    const { data, error } = await (this.supabase as any)
      .from('notification_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error listing notification logs: ${error.message}`);
    return data ? data.map((r: any) => this.mapRowToEntity(r)) : [];
  }

  async listByProjectId(projectId: string): Promise<NotificationLog[]> {
    const { data, error } = await (this.supabase as any)
      .from('notification_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error listing notification logs: ${error.message}`);
    return data ? data.map((r: any) => this.mapRowToEntity(r)) : [];
  }

  async create(dto: CreateNotificationLogDTO): Promise<NotificationLog> {
    const { data, error } = await (this.supabase as any)
      .from('notification_logs')
      .insert({
        workspace_id: dto.workspaceId,
        client_id: dto.clientId,
        project_id: dto.projectId,
        channel: dto.channel || 'whatsapp',
        recipient_phone: dto.recipientPhone,
        status: dto.status || 'queued',
        provider_message_id: dto.providerMessageId,
        error_message: dto.errorMessage,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create notification log: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    providerMessageId?: string | null,
    errorMessage?: string | null
  ): Promise<NotificationLog> {
    const payload: any = { status };
    if (providerMessageId !== undefined) payload.provider_message_id = providerMessageId;
    if (errorMessage !== undefined) payload.error_message = errorMessage;

    const { data: updated, error } = await (this.supabase as any)
      .from('notification_logs')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update notification status: ${error.message}`);
    return this.mapRowToEntity(updated);
  }
}

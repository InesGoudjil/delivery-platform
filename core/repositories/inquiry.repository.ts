import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Inquiry, CreateInquiryInput, InquiryStatus } from '@/core/entities/inquiry';

export interface IInquiryRepository {
  create(input: CreateInquiryInput): Promise<Inquiry>;
  listByWorkspaceId(workspaceId: string): Promise<Inquiry[]>;
  findById(id: string): Promise<Inquiry | null>;
  updateStatus(id: string, status: InquiryStatus): Promise<Inquiry>;
}

export class SupabaseInquiryRepository implements IInquiryRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Inquiry {
    return {
      id: row.id,
      type: row.type,
      workspaceId: row.workspace_id,
      portfolioId: row.portfolio_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      message: row.message,
      metadata: row.metadata || {},
      status: row.status || 'unread',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(input: CreateInquiryInput): Promise<Inquiry> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('inquiries')
        .insert({
          type: input.type,
          workspace_id: input.workspaceId || null,
          portfolio_id: input.portfolioId || null,
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          subject: input.subject || null,
          message: input.message,
          metadata: input.metadata || {},
          status: 'unread',
        })
        .select()
        .single();

      if (error) {
        console.warn('[SupabaseInquiryRepository] Error inserting inquiry (falling back):', error.message);
        // Fallback entity so flow never breaks if table has not been migrated yet
        return {
          id: `inq_${Date.now()}`,
          type: input.type,
          workspaceId: input.workspaceId,
          portfolioId: input.portfolioId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          subject: input.subject,
          message: input.message,
          metadata: input.metadata || {},
          status: 'unread',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return this.mapRowToEntity(data);
    } catch (err: any) {
      console.warn('[SupabaseInquiryRepository] Unexpected error inserting inquiry:', err.message);
      return {
        id: `inq_${Date.now()}`,
        type: input.type,
        workspaceId: input.workspaceId,
        portfolioId: input.portfolioId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
        metadata: input.metadata || {},
        status: 'unread',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async listByWorkspaceId(workspaceId: string): Promise<Inquiry[]> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('inquiries')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[SupabaseInquiryRepository] Error listing inquiries:', error.message);
        return [];
      }

      return (data || []).map((row: any) => this.mapRowToEntity(row));
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<Inquiry | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('inquiries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapRowToEntity(data);
    } catch {
      return null;
    }
  }

  async updateStatus(id: string, status: InquiryStatus): Promise<Inquiry> {
    const { data, error } = await (this.supabase as any)
      .from('inquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error updating inquiry status: ${error.message}`);
    return this.mapRowToEntity(data);
  }
}

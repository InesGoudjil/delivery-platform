import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Client } from '@/core/entities/client';

export interface CreateClientDTO {
  workspaceId: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
}

export interface IClientRepository {
  findById(id: string): Promise<Client | null>;
  listByWorkspaceId(workspaceId: string): Promise<Client[]>;
  findByPhone(workspaceId: string, phone: string): Promise<Client | null>;
  findByEmail(workspaceId: string, email: string): Promise<Client | null>;
  create(dto: CreateClientDTO): Promise<Client>;
  update(id: string, data: Partial<Client>): Promise<Client>;
  delete(id: string): Promise<void>;
}

export class SupabaseClientRepository implements IClientRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Client {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      email: row.email,
      phoneNumber: row.phone_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Client | null> {
    const { data, error } = await (this.supabase as any)
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching client: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByWorkspaceId(workspaceId: string): Promise<Client[]> {
    const { data, error } = await (this.supabase as any)
      .from('clients')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) throw new Error(`Error listing clients: ${error.message}`);
    return data ? data.map((r: any) => this.mapRowToEntity(r)) : [];
  }

  async findByPhone(workspaceId: string, phone: string): Promise<Client | null> {
    const { data, error } = await (this.supabase as any)
      .from('clients')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('phone_number', phone)
      .maybeSingle();

    if (error) throw new Error(`Error fetching client by phone: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findByEmail(workspaceId: string, email: string): Promise<Client | null> {
    const { data, error } = await (this.supabase as any)
      .from('clients')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .maybeSingle();

    if (error) throw new Error(`Error fetching client by email: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async create(dto: CreateClientDTO): Promise<Client> {
    const { data, error } = await (this.supabase as any)
      .from('clients')
      .insert({
        workspace_id: dto.workspaceId,
        name: dto.name,
        email: dto.email,
        phone_number: dto.phoneNumber,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create client: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<Client>): Promise<Client> {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phoneNumber !== undefined) payload.phone_number = data.phoneNumber;

    const { data: updated, error } = await (this.supabase as any)
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update client: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete client: ${error.message}`);
  }
}

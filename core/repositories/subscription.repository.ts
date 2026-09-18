import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Subscription, SubscriptionStatus } from '@/core/entities/subscription';

export interface CreateSubscriptionDTO {
  workspaceId: string;
  planId: string;
  paymentProviderSubId?: string | null;
  paymentProviderCustId?: string | null;
  status?: SubscriptionStatus;
  currency?: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
}

export interface ISubscriptionRepository {
  findByWorkspaceId(workspaceId: string): Promise<Subscription | null>;
  findById(id: string): Promise<Subscription | null>;
  create(dto: CreateSubscriptionDTO): Promise<Subscription>;
  update(id: string, data: Partial<Subscription>): Promise<Subscription>;
  delete(id: string): Promise<void>;
  listAllSubscriptions(): Promise<Subscription[]>;
}

export class SupabaseSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Subscription {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      planId: row.plan_id,
      paymentProviderSubId: row.payment_provider_sub_id,
      paymentProviderCustId: row.payment_provider_cust_id,
      status: row.status as SubscriptionStatus,
      currency: row.currency || 'USD',
      trialEndsAt: row.trial_ends_at,
      currentPeriodEnd: row.current_period_end,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByWorkspaceId(workspaceId: string): Promise<Subscription | null> {
    const { data, error } = await (this.supabase as any)
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching subscription: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findById(id: string): Promise<Subscription | null> {
    const { data, error } = await (this.supabase as any)
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching subscription by id: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async create(dto: CreateSubscriptionDTO): Promise<Subscription> {
    const { data, error } = await (this.supabase as any)
      .from('subscriptions')
      .insert({
        workspace_id: dto.workspaceId,
        plan_id: dto.planId,
        payment_provider_sub_id: dto.paymentProviderSubId,
        payment_provider_cust_id: dto.paymentProviderCustId,
        status: dto.status || 'trialing',
        currency: dto.currency || 'USD',
        trial_ends_at: dto.trialEndsAt,
        current_period_end: dto.currentPeriodEnd,
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating subscription: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<Subscription>): Promise<Subscription> {
    const payload: any = {};
    if (data.planId !== undefined) payload.plan_id = data.planId;
    if (data.paymentProviderSubId !== undefined) payload.payment_provider_sub_id = data.paymentProviderSubId;
    if (data.paymentProviderCustId !== undefined) payload.payment_provider_cust_id = data.paymentProviderCustId;
    if (data.status !== undefined) payload.status = data.status;
    if (data.currency !== undefined) payload.currency = data.currency;
    if (data.trialEndsAt !== undefined) payload.trial_ends_at = data.trialEndsAt;
    if (data.currentPeriodEnd !== undefined) payload.current_period_end = data.currentPeriodEnd;

    const { data: updated, error } = await (this.supabase as any)
      .from('subscriptions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error updating subscription: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Error deleting subscription: ${error.message}`);
  }

  async listAllSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await (this.supabase as any)
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error listing subscriptions: ${error.message}`);
    return (data || []).map((row: any) => this.mapRowToEntity(row));
  }
}

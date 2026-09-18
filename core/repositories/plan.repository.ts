import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Plan, PlanSlug, BillingInterval } from '@/core/entities/plan';
import { WorkspaceFeatureConfig } from '@/core/entities/workspace';

export interface IPlanRepository {
  findById(id: string): Promise<Plan | null>;
  findBySlug(slug: PlanSlug): Promise<Plan | null>;
  listActivePlans(): Promise<Plan[]>;
  create(data: {
    name: string;
    slug: string;
    priceCents?: number;
    currency?: string;
    billingInterval?: BillingInterval;
    sortOrder?: number;
    features?: WorkspaceFeatureConfig;
    stripePriceId?: string | null;
  }): Promise<Plan>;
  update(id: string, data: Partial<Plan>): Promise<Plan>;
  listAllPlans(): Promise<Plan[]>;
  delete(id: string): Promise<void>;
}

export class SupabasePlanRepository implements IPlanRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Plan {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      priceCents: Number(row.price_cents || 0),
      currency: row.currency || 'USD',
      billingInterval: row.billing_interval || 'month',
      sortOrder: Number(row.sort_order || 0),
      isActive: Boolean(row.is_active),
      stripePriceId: row.stripe_price_id,
      features: (row.features || {}) as WorkspaceFeatureConfig,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Plan | null> {
    const { data, error } = await (this.supabase as any)
      .from('plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching plan: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async findBySlug(slug: PlanSlug): Promise<Plan | null> {
    const { data, error } = await (this.supabase as any)
      .from('plans')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw new Error(`Error fetching plan by slug: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listActivePlans(): Promise<Plan[]> {
    const { data, error } = await (this.supabase as any)
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(`Error listing plans: ${error.message}`);
    return (data || []).map(this.mapRowToEntity);
  }

  async create(data: {
    name: string;
    slug: string;
    priceCents?: number;
    currency?: string;
    billingInterval?: BillingInterval;
    sortOrder?: number;
    features?: WorkspaceFeatureConfig;
    stripePriceId?: string | null;
  }): Promise<Plan> {
    const { data: created, error } = await (this.supabase as any)
      .from('plans')
      .insert({
        name: data.name,
        slug: data.slug,
        price_cents: data.priceCents ?? 0,
        currency: data.currency ?? 'USD',
        billing_interval: data.billingInterval ?? 'month',
        sort_order: data.sortOrder ?? 0,
        features: (data.features || {}) as any,
        stripe_price_id: data.stripePriceId,
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating plan: ${error.message}`);
    return this.mapRowToEntity(created);
  }

  async update(id: string, data: Partial<Plan>): Promise<Plan> {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.slug !== undefined) payload.slug = data.slug;
    if (data.priceCents !== undefined) payload.price_cents = data.priceCents;
    if (data.currency !== undefined) payload.currency = data.currency;
    if (data.billingInterval !== undefined) payload.billing_interval = data.billingInterval;
    if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
    if (data.isActive !== undefined) payload.is_active = data.isActive;
    if (data.stripePriceId !== undefined) payload.stripe_price_id = data.stripePriceId;
    if (data.features !== undefined) payload.features = data.features;

    const { data: updated, error } = await (this.supabase as any)
      .from('plans')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error updating plan: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async listAllPlans(): Promise<Plan[]> {
    const { data, error } = await (this.supabase as any)
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(`Error listing all plans: ${error.message}`);
    return (data || []).map((row: any) => this.mapRowToEntity(row));
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Error deleting plan: ${error.message}`);
  }
}

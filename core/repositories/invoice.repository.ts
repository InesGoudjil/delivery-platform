import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Invoice, InvoiceStatus } from '@/core/entities/invoice';

export interface CreateInvoiceDTO {
  workspaceId: string;
  invoiceNumber?: string;
  stripeInvoiceId?: string | null;
  stripeCustomerId?: string | null;
  amountCents: number;
  currency?: string;
  status?: InvoiceStatus;
  description: string;
  hostedInvoiceUrl?: string | null;
  pdfUrl?: string | null;
}

export interface IInvoiceRepository {
  findByWorkspaceId(workspaceId: string): Promise<Invoice[]>;
  findByStripeInvoiceId(stripeInvoiceId: string): Promise<Invoice | null>;
  create(dto: CreateInvoiceDTO): Promise<Invoice>;
}

export class SupabaseInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Invoice {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      invoiceNumber: row.invoice_number,
      stripeInvoiceId: row.stripe_invoice_id,
      stripeCustomerId: row.stripe_customer_id,
      amountCents: Number(row.amount_cents || 0),
      currency: row.currency || 'USD',
      status: (row.status as InvoiceStatus) || 'paid',
      description: row.description,
      hostedInvoiceUrl: row.hosted_invoice_url,
      pdfUrl: row.pdf_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByWorkspaceId(workspaceId: string): Promise<Invoice[]> {
    const { data, error } = await (this.supabase as any)
      .from('invoices')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error fetching workspace invoices: ${error.message}`);
    return (data || []).map((row: any) => this.mapRowToEntity(row));
  }

  async findByStripeInvoiceId(stripeInvoiceId: string): Promise<Invoice | null> {
    const { data, error } = await (this.supabase as any)
      .from('invoices')
      .select('*')
      .eq('stripe_invoice_id', stripeInvoiceId)
      .maybeSingle();

    if (error) throw new Error(`Error fetching invoice by stripe ID: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async create(dto: CreateInvoiceDTO): Promise<Invoice> {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const defaultNumber = `INV-${year}-${randomSuffix}`;

    const { data, error } = await (this.supabase as any)
      .from('invoices')
      .insert({
        workspace_id: dto.workspaceId,
        invoice_number: dto.invoiceNumber || defaultNumber,
        stripe_invoice_id: dto.stripeInvoiceId,
        stripe_customer_id: dto.stripeCustomerId,
        amount_cents: dto.amountCents,
        currency: dto.currency || 'USD',
        status: dto.status || 'paid',
        description: dto.description,
        hosted_invoice_url: dto.hostedInvoiceUrl,
        pdf_url: dto.pdfUrl,
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating invoice: ${error.message}`);
    return this.mapRowToEntity(data);
  }
}

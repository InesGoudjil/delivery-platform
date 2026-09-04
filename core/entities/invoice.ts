export type InvoiceStatus = 'paid' | 'pending' | 'void' | 'refunded';

export interface Invoice {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  stripeInvoiceId?: string | null;
  stripeCustomerId?: string | null;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  description: string;
  hostedInvoiceUrl?: string | null;
  pdfUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InquiryType = 'portfolio_lead' | 'contact_message' | 'partnership_lead';
export type InquiryStatus = 'unread' | 'read' | 'archived';

export interface Inquiry {
  id: string;
  type: InquiryType;
  workspaceId?: string | null;
  portfolioId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  metadata?: Record<string, any>;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInquiryInput {
  type: InquiryType;
  workspaceId?: string | null;
  portfolioId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  metadata?: Record<string, any>;
}

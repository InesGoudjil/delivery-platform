export interface Workspace {
  id: string;
  ownerId: string;
  brandName: string;
  slug: string;
  logoUrl?: string | null;
  customDomain?: string | null;
  accentColor?: string | null;
  defaultLanguage: 'ar' | 'en';
  storageLimitBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  workspaceId: string;
  paymentProviderSubId?: string | null;
  paymentProviderCustId?: string | null;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  currency: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

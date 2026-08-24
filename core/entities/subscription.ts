export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface Subscription {
  id: string;
  workspaceId: string;
  planId: string;
  paymentProviderSubId?: string | null;
  paymentProviderCustId?: string | null;
  status: SubscriptionStatus;
  currency: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

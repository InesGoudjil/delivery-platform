import { WorkspaceFeatureConfig } from './workspace';

export type PlanSlug = 'starter' | 'basic' | 'pro' | 'studio' | string;
export type BillingInterval = 'month' | 'year';

export interface Plan {
  id: string;
  name: string;
  slug: PlanSlug;
  priceCents: number;
  currency: string;
  billingInterval: BillingInterval;
  sortOrder: number;
  isActive: boolean;
  stripePriceId?: string | null;
  features: WorkspaceFeatureConfig;
  createdAt: string;
  updatedAt: string;
}

export const SEED_PLANS: Record<string, Partial<Plan>> = {
  starter: {
    name: 'Starter',
    slug: 'starter',
    priceCents: 0,
    currency: 'USD',
    billingInterval: 'month',
    sortOrder: 1,
    isActive: true,
    features: {
      storage_gb: 2,
      client_links: 1,
      portfolio_videos: 4,
      team_seats: 1,
      languages: ['en'],
      whatsapp_delivery: false,
      password_protected: false,
      watermark: false,
      branding: false,
      download_notifications: false,
      priority_support: false,
      silo_archive: false,
      white_label: false,
    },
  },
  basic: {
    name: 'Basic',
    slug: 'basic',
    priceCents: 1200,
    currency: 'USD',
    billingInterval: 'month',
    sortOrder: 2,
    isActive: true,
    features: {
      storage_gb: 100,
      client_links: 20,
      portfolio_videos: -1,
      team_seats: 1,
      languages: ['en'],
      whatsapp_delivery: true,
      password_protected: false,
      watermark: false,
      branding: false,
      download_notifications: false,
      priority_support: false,
      silo_archive: false,
      white_label: false,
    },
  },
  pro: {
    name: 'Pro',
    slug: 'pro',
    priceCents: 2900,
    currency: 'USD',
    billingInterval: 'month',
    sortOrder: 3,
    isActive: true,
    features: {
      storage_gb: 500,
      client_links: -1,
      portfolio_videos: -1,
      team_seats: 1,
      languages: ['ar', 'en'],
      whatsapp_delivery: true,
      password_protected: true,
      watermark: true,
      branding: true,
      download_notifications: true,
      priority_support: true,
      silo_archive: false,
      white_label: false,
    },
  },
  studio: {
    name: 'Studio',
    slug: 'studio',
    priceCents: 6900,
    currency: 'USD',
    billingInterval: 'month',
    sortOrder: 4,
    isActive: true,
    features: {
      storage_gb: 2048,
      client_links: -1,
      portfolio_videos: -1,
      team_seats: 5,
      languages: ['ar', 'en'],
      whatsapp_delivery: true,
      password_protected: true,
      watermark: true,
      branding: true,
      download_notifications: true,
      priority_support: true,
      silo_archive: true,
      white_label: true,
    },
  },
};

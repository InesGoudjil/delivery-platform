import { WorkspaceFeatureConfig } from './workspace';

export type PlanSlug = 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise' | string;
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

/**
 * Yearly billing. A tier sold both ways has two plans: the monthly one (`pro`) and its yearly
 * twin (`pro-yearly`, billingInterval 'year'), with the same name, order and features.
 * Checkout, the Stripe webhooks and entitlements all work per plan, so they need nothing else.
 */
export const YEARLY_SLUG_SUFFIX = '-yearly';

/** The tier a plan belongs to, however it's billed: `pro` for both `pro` and `pro-yearly`. */
export function planTier(slug: string): string {
  return slug.endsWith(YEARLY_SLUG_SUFFIX) ? slug.slice(0, -YEARLY_SLUG_SUFFIX.length) : slug;
}

/** The slug of a tier's yearly plan. */
export function yearlyPlanSlug(slug: string): string {
  return `${planTier(slug)}${YEARLY_SLUG_SUFFIX}`;
}

/** What the pricing helpers read, so client components can pass their own plan items. */
export interface PricedPlan {
  slug: string;
  priceCents: number;
  billingInterval?: string;
}

/** A tier's monthly plan and, when it's sold yearly too, its yearly plan. */
export interface PlanTierGroup<P extends PricedPlan> {
  tier: string;
  monthly: P;
  yearly: P | null;
}

/**
 * Pairs each monthly plan with its yearly twin, in the monthly plans' order. A yearly plan
 * without a monthly one (archived, say) is left out.
 */
export function groupPlanTiers<P extends PricedPlan>(plans: P[]): PlanTierGroup<P>[] {
  const yearlyByTier = new Map<string, P>();
  for (const plan of plans) {
    if (plan.billingInterval === 'year') yearlyByTier.set(planTier(plan.slug), plan);
  }
  return plans
    .filter((plan) => plan.billingInterval !== 'year')
    .map((monthly) => ({ tier: monthly.slug, monthly, yearly: yearlyByTier.get(monthly.slug) ?? null }));
}

/** The plan sold for a tier on this billing interval: the yearly one when there is one. */
export function planForInterval<P extends PricedPlan>(group: PlanTierGroup<P>, interval: BillingInterval): P {
  return interval === 'year' && group.yearly ? group.yearly : group.monthly;
}

/** Whole percent saved by paying yearly instead of twelve monthly payments (rounded down); 0 when nothing is. */
export function yearlySavingsPercent(monthlyCents: number, yearlyCents: number): number {
  if (monthlyCents <= 0 || yearlyCents <= 0) return 0;
  const saved = 1 - yearlyCents / (monthlyCents * 12);
  // The epsilon keeps an exact 25% from flooring to 24 through float error.
  return saved > 0 ? Math.floor(saved * 100 + 1e-9) : 0;
}

/** "Save 25%", or "Save up to 25%" when tiers save different amounts; null when paying yearly saves nothing. */
export function yearlySavingsLabel<P extends PricedPlan>(groups: PlanTierGroup<P>[]): string | null {
  const savings = groups
    .filter((group) => group.yearly)
    .map((group) => yearlySavingsPercent(group.monthly.priceCents, group.yearly!.priceCents));
  const best = Math.max(0, ...savings);
  if (best === 0) return null;
  return savings.every((saving) => saving === best) ? `Save ${best}%` : `Save up to ${best}%`;
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
      silo_archive: true,
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
  enterprise: {
    name: 'Enterprise',
    slug: 'enterprise',
    priceCents: 19900,
    currency: 'USD',
    billingInterval: 'month',
    sortOrder: 5,
    isActive: true,
    features: {
      storage_gb: 10240,
      client_links: -1,
      portfolio_videos: -1,
      team_seats: 25,
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

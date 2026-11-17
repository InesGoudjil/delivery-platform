import { Subscription, SubscriptionStatus } from '@/core/entities/subscription';
import { Plan, PlanSlug, SEED_PLANS, planTier } from '@/core/entities/plan';
import { Invoice, InvoiceStatus } from '@/core/entities/invoice';
import { WorkspaceFeatureConfig, WorkspaceFeatures, WorkspaceEntitlements } from '@/core/entities/workspace';
import { ISubscriptionRepository } from '@/core/repositories/subscription.repository';
import { IPlanRepository } from '@/core/repositories/plan.repository';
import { IWorkspaceFeaturesRepository } from '@/core/repositories/workspace.repository';
import { IDeliveryRepository } from '@/core/repositories/i-delivery-repository';
import { IInvoiceRepository } from '@/core/repositories/invoice.repository';
import { env } from '@/lib/env';
import { hasExtendedLinkExpiry } from '@/lib/security/link-expiry';
import { shareLinksPerDelivery } from '@/lib/share-links/limits';

export { shareLinksPerDelivery };

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
    private readonly featuresRepo: IWorkspaceFeaturesRepository,
    private readonly deliveryRepo: IDeliveryRepository,
    private readonly invoiceRepo?: IInvoiceRepository
  ) {}

  async listAvailablePlans(): Promise<Plan[]> {
    return this.planRepo.listActivePlans();
  }

  async listAllPlans(): Promise<Plan[]> {
    return this.planRepo.listAllPlans();
  }

  async createPlan(data: {
    name: string;
    slug: string;
    priceCents: number;
    currency?: string;
    billingInterval?: 'month' | 'year';
    sortOrder?: number;
    features?: WorkspaceFeatureConfig;
    stripePriceId?: string | null;
  }): Promise<Plan> {
    const existing = await this.planRepo.findBySlug(data.slug);
    if (existing) {
      throw new Error(`A plan with slug "${data.slug}" already exists.`);
    }

    return this.planRepo.create(data);
  }

  async deletePlan(
    planId: string
  ): Promise<{ action: 'archived' | 'deleted'; message: string }> {
    const plan = await this.planRepo.findById(planId);
    if (!plan) {
      throw new Error('Plan not found.');
    }

    // Safety Condition 1: Protected starter plan
    if (plan.slug === 'starter') {
      throw new Error('System protected plan "starter" cannot be deleted.');
    }

    // Safety Condition 2: Active subscriber count check
    const allSubs = await this.subscriptionRepo.listAllSubscriptions();
    const activeSubscribersCount = allSubs.filter((s) => s.planId === planId).length;

    if (activeSubscribersCount > 0) {
      // Soft-delete / Archive plan
      await this.planRepo.update(planId, { isActive: false });
      return {
        action: 'archived',
        message: `Plan "${plan.name}" has ${activeSubscribersCount} active subscriber(s). It has been archived (deactivated) instead of hard deleted to protect active accounts.`,
      };
    }

    // Hard Delete if 0 subscribers
    await this.planRepo.delete(planId);
    return {
      action: 'deleted',
      message: `Plan "${plan.name}" had 0 subscribers and has been permanently deleted.`,
    };
  }

  async listAllSubscriptions(): Promise<Subscription[]> {
    return this.subscriptionRepo.listAllSubscriptions();
  }

  async getPlanById(id: string): Promise<Plan | null> {
    return this.planRepo.findById(id);
  }

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
    return this.planRepo.update(id, data);
  }

  async getSubscriptionByWorkspaceId(workspaceId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findByWorkspaceId(workspaceId);
  }

  async getPlanBySlug(slug: PlanSlug): Promise<Plan | null> {
    return this.planRepo.findBySlug(slug);
  }

  async getSubscription(workspaceId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findByWorkspaceId(workspaceId);
  }

  /**
   * The workspace's plan state, read in one round of parallel queries: every plan (a handful of
   * rows, which hold the starter plan and the subscription's plan), the subscription, and, when
   * asked for, the workspace's feature overrides. Pages and actions call this on most requests,
   * so it never waits on one query before starting the next.
   */
  private async loadPlanState(
    workspaceId: string,
    withOverrides: boolean
  ): Promise<{ plan: Plan; sub: Subscription | null; overrides: Partial<WorkspaceFeatureConfig> | null }> {
    const [plans, sub, overridesRecord] = await Promise.all([
      this.planRepo.listAllPlans(),
      this.subscriptionRepo.findByWorkspaceId(workspaceId),
      withOverrides ? this.featuresRepo.findByWorkspaceId(workspaceId) : Promise.resolve(null),
    ]);
    return {
      plan: this.planForSubscription(sub, plans),
      sub,
      overrides: (overridesRecord?.features as Partial<WorkspaceFeatureConfig> | undefined) ?? null,
    };
  }

  /** The plan a subscription grants now: Starter without one, after a lapse, or when its plan is retired. */
  private planForSubscription(sub: Subscription | null, plans: Plan[]): Plan {
    const starterPlan = plans.find((p) => p.slug === 'starter') || ({
      id: 'plan_starter',
      name: 'Starter',
      slug: 'starter',
      priceCents: 0,
      currency: 'USD',
      billingInterval: 'month',
      sortOrder: 1,
      isActive: true,
      features: SEED_PLANS.starter.features as WorkspaceFeatureConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Plan);

    if (!sub) return starterPlan;

    // Check expiration for trials
    if (sub.status === 'trialing') {
      if (sub.trialEndsAt && new Date(sub.trialEndsAt) < new Date()) {
        return starterPlan;
      }
    }

    // Inactive subscriptions forfeit high-tier features
    if (sub.status === 'canceled' || sub.status === 'past_due') {
      return starterPlan;
    }

    if (sub.status === 'active' || sub.status === 'trialing') {
      const plan = plans.find((p) => p.id === sub.planId);
      if (plan && plan.isActive) {
        return plan;
      }
    }

    return starterPlan;
  }

  /** The plan's features with the workspace's overrides on top. */
  private featuresFor(plan: Plan | null, overrides: Partial<WorkspaceFeatureConfig> | null): WorkspaceFeatureConfig {
    const baselineFeatures: WorkspaceFeatureConfig =
      plan?.features && Object.keys(plan.features).length > 0
        ? plan.features
        : (SEED_PLANS.starter.features as WorkspaceFeatureConfig);

    // Check for custom workspace overrides (if any exist)
    if (overrides && Object.keys(overrides).length > 0) {
      return {
        ...baselineFeatures,
        ...overrides,
      };
    }

    return baselineFeatures;
  }

  async getCurrentPlan(workspaceId: string): Promise<Plan | null> {
    return (await this.loadPlanState(workspaceId, false)).plan;
  }

  /**
   * Returns only the per-workspace overrides (without the plan's features merged in).
   */
  async getFeatureOverrides(workspaceId: string): Promise<Partial<WorkspaceFeatureConfig>> {
    const overridesRecord = await this.featuresRepo.findByWorkspaceId(workspaceId);
    return (overridesRecord?.features || {}) as Partial<WorkspaceFeatureConfig>;
  }

  async getFeatures(workspaceId: string): Promise<WorkspaceFeatureConfig> {
    const { plan, overrides } = await this.loadPlanState(workspaceId, true);
    return this.featuresFor(plan, overrides);
  }

  async getEntitlements(workspaceId: string): Promise<WorkspaceEntitlements> {
    return (await this.getPlanAndEntitlements(workspaceId)).entitlements;
  }

  /** The current plan and the entitlements it gives, from one read of the plan state. */
  async getPlanAndEntitlements(workspaceId: string): Promise<{ plan: Plan; entitlements: WorkspaceEntitlements }> {
    const { plan, sub, overrides } = await this.loadPlanState(workspaceId, true);
    return { plan, entitlements: this.entitlementsFor(workspaceId, plan, sub, this.featuresFor(plan, overrides)) };
  }

  private entitlementsFor(
    workspaceId: string,
    plan: Plan | null,
    sub: Subscription | null,
    features: WorkspaceFeatureConfig
  ): WorkspaceEntitlements {
    // The fallbacks below are per tier: `pro-yearly` gets what `pro` gets.
    const tier = plan ? planTier(plan.slug) : undefined;

    const storageGb = Number(
      features.storage_gb ??
        (tier === 'studio' ? 2048 : tier === 'pro' ? 500 : tier === 'basic' ? 100 : 2)
    );
    const storageBytesMax = storageGb * 1024 * 1024 * 1024;
    const clientLinksMax =
      features.client_links !== undefined
        ? Number(features.client_links)
        : tier === 'starter'
        ? 1
        : tier === 'basic'
        ? 20
        : -1;
    const teamSeatsMax =
      features.team_seats !== undefined
        ? Number(features.team_seats)
        : tier === 'studio'
        ? 5
        : tier === 'enterprise'
        ? 25
        : 1;
    const portfolioVideosMax =
      features.portfolio_videos !== undefined
        ? Number(features.portfolio_videos)
        : tier === 'starter'
        ? 4
        : -1;

    const isTrial = sub?.status === 'trialing';
    const isActive = sub
      ? sub.status === 'active' ||
        (isTrial && (!sub.trialEndsAt || new Date(sub.trialEndsAt) >= new Date()))
      : true;

    return {
      workspaceId,
      planSlug: plan?.slug || 'starter',
      planName: plan?.name || 'Starter',
      subscriptionStatus: sub?.status || 'active',
      isTrial,
      isActive,
      features,
      limits: {
        storageGbMax: storageGb,
        storageBytesMax,
        clientLinksMax,
        shareLinksPerDeliveryMax: shareLinksPerDelivery(features, tier),
        teamSeatsMax,
        portfolioVideosMax,
      },
      can: {
        watermark: Boolean(features.watermark),
        passwordProtect: Boolean(features.password_protected),
        customBranding: Boolean(features.branding),
        whiteLabel: Boolean(features.white_label),
        sendWhatsApp: Boolean(features.whatsapp_delivery),
        receiveDownloadNotifications: Boolean(features.download_notifications),
        extendedLinkExpiry: hasExtendedLinkExpiry(features),
        // The Silo kill switch (SILO_ENABLED) overrides every plan.
        useSiloArchive: env.isSiloEnabled && Boolean(features.silo_archive),
        bilingual: Array.isArray(features.languages) && features.languages.length > 1,
        prioritySupport: Boolean(features.priority_support),
      },
    };
  }

  async startTrial(workspaceId: string, planSlug: PlanSlug = 'starter'): Promise<Subscription> {
    const plan = (await this.planRepo.findBySlug(planSlug)) || (await this.planRepo.findBySlug('starter'));
    if (!plan) throw new Error(`Plan ${planSlug} not found`);

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const subscription = await this.subscriptionRepo.create({
      workspaceId,
      planId: plan.id,
      status: 'trialing',
      currency: plan.currency,
      trialEndsAt: trialEnd.toISOString(),
    });

    return subscription;
  }

  async upgradePlan(
    workspaceId: string,
    planSlugOrId: string,
    paymentProviderSubId?: string,
    paymentProviderCustId?: string
  ): Promise<Subscription> {
    let plan = await this.planRepo.findBySlug(planSlugOrId as any);
    if (!plan) {
      plan = await this.planRepo.findById(planSlugOrId);
    }
    if (!plan) throw new Error(`Plan "${planSlugOrId}" not found`);

    const currentSub = await this.subscriptionRepo.findByWorkspaceId(workspaceId);

    const periodEnd = new Date();
    if (plan.billingInterval === 'year') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    let sub: Subscription;
    if (!currentSub) {
      sub = await this.subscriptionRepo.create({
        workspaceId,
        planId: plan.id,
        status: 'active',
        currency: plan.currency,
        paymentProviderSubId,
        paymentProviderCustId,
        currentPeriodEnd: periodEnd.toISOString(),
      });
    } else {
      sub = await this.subscriptionRepo.update(currentSub.id, {
        planId: plan.id,
        status: 'active',
        currency: plan.currency,
        paymentProviderSubId: paymentProviderSubId || currentSub.paymentProviderSubId,
        paymentProviderCustId: paymentProviderCustId || currentSub.paymentProviderCustId,
        currentPeriodEnd: periodEnd.toISOString(),
      });
    }

    return sub;
  }

  async cancelSubscription(workspaceId: string): Promise<Subscription> {
    const currentSub = await this.subscriptionRepo.findByWorkspaceId(workspaceId);
    if (!currentSub) throw new Error('No active subscription found for this workspace');

    return this.subscriptionRepo.update(currentSub.id, {
      status: 'canceled',
    });
  }

  async adminChangeWorkspacePlan(
    workspaceId: string,
    planId: string,
    status: SubscriptionStatus = 'active'
  ): Promise<Subscription> {
    const plan = await this.planRepo.findById(planId);
    if (!plan) throw new Error(`Plan with ID ${planId} not found`);

    const currentSub = await this.subscriptionRepo.findByWorkspaceId(workspaceId);

    let sub: Subscription;
    if (!currentSub) {
      sub = await this.subscriptionRepo.create({
        workspaceId,
        planId: plan.id,
        status,
        currency: plan.currency,
      });
    } else {
      sub = await this.subscriptionRepo.update(currentSub.id, {
        planId: plan.id,
        status,
      });
    }

    return sub;
  }

  async updateWorkspaceFeatures(
    workspaceId: string,
    features: WorkspaceFeatureConfig
  ): Promise<WorkspaceFeatures> {
    return this.featuresRepo.upsertFeatures(workspaceId, features);
  }

  async canCreateProject(workspaceId: string): Promise<{
    allowed: boolean;
    currentCount: number;
    maxAllowed: number;
    reason?: string;
  }> {
    const [features, deliveries] = await Promise.all([
      this.getFeatures(workspaceId),
      this.deliveryRepo.listByWorkspaceId(workspaceId),
    ]);
    const clientLinksLimit = features.client_links ?? 1;
    const activeProjects = deliveries.filter((p) => p.status !== 'archived');

    if (clientLinksLimit === -1) {
      return { allowed: true, currentCount: activeProjects.length, maxAllowed: -1 };
    }

    const allowed = activeProjects.length < clientLinksLimit;
    return {
      allowed,
      currentCount: activeProjects.length,
      maxAllowed: clientLinksLimit,
      reason: allowed
        ? undefined
        : `Your current plan allows up to ${clientLinksLimit} active delivery room(s). Upgrade to Pro or Studio for unlimited delivery rooms.`,
    };
  }

  async canDeliverWhatsApp(workspaceId: string): Promise<boolean> {
    const features = await this.getFeatures(workspaceId);
    return Boolean(features.whatsapp_delivery);
  }

  async isPasswordProtectionAllowed(workspaceId: string): Promise<boolean> {
    const features = await this.getFeatures(workspaceId);
    return Boolean(features.password_protected);
  }

  /** Links longer than 30 days, or that never expire (lib/security/link-expiry.ts). */
  async isExtendedLinkExpiryAllowed(workspaceId: string): Promise<boolean> {
    return hasExtendedLinkExpiry(await this.getFeatures(workspaceId));
  }

  /** Share links per delivery room, -1 for unlimited. */
  async getShareLinksPerDeliveryLimit(workspaceId: string): Promise<number> {
    const { plan, overrides } = await this.loadPlanState(workspaceId, true);
    return shareLinksPerDelivery(this.featuresFor(plan, overrides), planTier(plan.slug));
  }

  async isWatermarkAllowed(workspaceId: string): Promise<boolean> {
    const features = await this.getFeatures(workspaceId);
    return Boolean(features.watermark);
  }

  async isBrandingAllowed(workspaceId: string): Promise<boolean> {
    const features = await this.getFeatures(workspaceId);
    return Boolean(features.branding);
  }

  async isWhiteLabelAllowed(workspaceId: string): Promise<boolean> {
    const features = await this.getFeatures(workspaceId);
    return Boolean(features.white_label);
  }

  async isDownloadNotificationAllowed(workspaceId: string): Promise<boolean> {
    const features = await this.getFeatures(workspaceId);
    return Boolean(features.download_notifications);
  }

  /** Plan includes The Silo and the global kill switch (SILO_ENABLED) is on. */
  async isSiloArchiveAllowed(workspaceId: string): Promise<boolean> {
    if (!env.isSiloEnabled) return false;
    const features = await this.getFeatures(workspaceId);
    return Boolean(features.silo_archive);
  }

  async isPrioritySupportAllowed(workspaceId: string): Promise<boolean> {
    const features = await this.getFeatures(workspaceId);
    return Boolean(features.priority_support);
  }

  async isLanguageAllowed(workspaceId: string, lang: 'ar' | 'en'): Promise<boolean> {
    const features = await this.getFeatures(workspaceId);
    const languages = features.languages || ['en'];
    return languages.includes(lang);
  }

  async canAddPortfolioVideo(workspaceId: string, currentVideoCount: number): Promise<{
    allowed: boolean;
    currentCount: number;
    maxAllowed: number;
    reason?: string;
  }> {
    const features = await this.getFeatures(workspaceId);
    const portfolioLimit = features.portfolio_videos ?? 4;

    if (portfolioLimit === -1) {
      return { allowed: true, currentCount: currentVideoCount, maxAllowed: -1 };
    }

    const allowed = currentVideoCount < portfolioLimit;
    return {
      allowed,
      currentCount: currentVideoCount,
      maxAllowed: portfolioLimit,
      reason: allowed
        ? undefined
        : `Your current plan allows up to ${portfolioLimit} showcase film(s) on your portfolio. Upgrade to Basic or Pro for unlimited showcase films.`,
    };
  }

  async listInvoices(workspaceId: string): Promise<Invoice[]> {
    if (!this.invoiceRepo) return [];
    return this.invoiceRepo.findByWorkspaceId(workspaceId);
  }

  async recordInvoice(data: {
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
  }): Promise<Invoice | null> {
    if (!this.invoiceRepo) return null;
    if (data.stripeInvoiceId) {
      const existing = await this.invoiceRepo.findByStripeInvoiceId(data.stripeInvoiceId);
      if (existing) return existing;
    }
    return this.invoiceRepo.create(data);
  }
}

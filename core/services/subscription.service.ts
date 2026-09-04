import { Subscription, SubscriptionStatus } from '@/core/entities/subscription';
import { Plan, PlanSlug } from '@/core/entities/plan';
import { Invoice, InvoiceStatus } from '@/core/entities/invoice';
import { WorkspaceFeatureConfig } from '@/core/entities/workspace';
import { ISubscriptionRepository } from '@/core/repositories/subscription.repository';
import { IPlanRepository } from '@/core/repositories/plan.repository';
import { IWorkspaceFeaturesRepository } from '@/core/repositories/workspace.repository';
import { IProjectRepository } from '@/core/repositories/project.repository';
import { IInvoiceRepository } from '@/core/repositories/invoice.repository';

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
    private readonly featuresRepo: IWorkspaceFeaturesRepository,
    private readonly projectRepo: IProjectRepository,
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

  async getCurrentPlan(workspaceId: string): Promise<Plan | null> {
    const sub = await this.subscriptionRepo.findByWorkspaceId(workspaceId);
    if (!sub) return this.planRepo.findBySlug('starter');
    return this.planRepo.findById(sub.planId);
  }

  async getFeatures(workspaceId: string): Promise<WorkspaceFeatureConfig> {
    const featuresRecord = await this.featuresRepo.findByWorkspaceId(workspaceId);
    if (featuresRecord) return featuresRecord.features;

    const plan = await this.getCurrentPlan(workspaceId);
    return plan?.features || {};
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

    await this.featuresRepo.upsertFeatures(workspaceId, plan.features);
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

    // Sync features for workspace
    await this.featuresRepo.upsertFeatures(workspaceId, plan.features);
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

    await this.featuresRepo.upsertFeatures(workspaceId, plan.features);
    return sub;
  }

  async canCreateProject(workspaceId: string): Promise<{
    allowed: boolean;
    currentCount: number;
    maxAllowed: number;
    reason?: string;
  }> {
    const features = await this.getFeatures(workspaceId);
    const clientLinksLimit = features.client_links ?? 1;

    const projects = await this.projectRepo.listByWorkspaceId(workspaceId);
    const activeProjects = projects.filter((p) => p.status !== 'archived');

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
        : `Your current plan allows up to ${clientLinksLimit} active project link(s). Upgrade to Pro or Studio for unlimited client projects.`,
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

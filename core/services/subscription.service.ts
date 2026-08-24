import { Subscription, SubscriptionStatus } from '@/core/entities/subscription';
import { Plan, PlanSlug } from '@/core/entities/plan';
import { WorkspaceFeatureConfig } from '@/core/entities/workspace';
import { ISubscriptionRepository } from '@/core/repositories/subscription.repository';
import { IPlanRepository } from '@/core/repositories/plan.repository';
import { IWorkspaceFeaturesRepository } from '@/core/repositories/workspace.repository';
import { IProjectRepository } from '@/core/repositories/project.repository';

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
    private readonly featuresRepo: IWorkspaceFeaturesRepository,
    private readonly projectRepo: IProjectRepository
  ) {}

  async listAvailablePlans(): Promise<Plan[]> {
    return this.planRepo.listActivePlans();
  }

  async getPlanById(id: string): Promise<Plan | null> {
    return this.planRepo.findById(id);
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
    planSlug: PlanSlug,
    paymentProviderSubId?: string,
    paymentProviderCustId?: string
  ): Promise<Subscription> {
    const plan = await this.planRepo.findBySlug(planSlug);
    if (!plan) throw new Error(`Plan ${planSlug} not found`);

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
}

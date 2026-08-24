import { Workspace, WorkspaceFeatures, WorkspaceFeatureConfig, AccountType, Language } from '@/core/entities/workspace';
import { IWorkspaceRepository, IWorkspaceFeaturesRepository } from '@/core/repositories/workspace.repository';
import { ISubscriptionRepository } from '@/core/repositories/subscription.repository';
import { IPlanRepository } from '@/core/repositories/plan.repository';

export class WorkspaceService {
  constructor(
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly featuresRepo: IWorkspaceFeaturesRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository
  ) {}

  async getWorkspaceById(id: string): Promise<Workspace | null> {
    return this.workspaceRepo.findById(id);
  }

  async getWorkspaceByOwnerId(ownerId: string): Promise<Workspace | null> {
    return this.workspaceRepo.findByOwnerId(ownerId);
  }

  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    return this.workspaceRepo.findBySlug(slug);
  }

  async listAllWorkspaces(): Promise<Workspace[]> {
    return this.workspaceRepo.listAllWorkspaces();
  }

  async getOrCreateWorkspace(
    ownerId: string,
    brandName?: string,
    accountType: AccountType = 'individual'
  ): Promise<Workspace> {
    const existing = await this.workspaceRepo.findByOwnerId(ownerId);
    if (existing) return existing;

    const baseName = brandName || 'My Studio';
    const baseSlug = baseName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'studio';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await this.workspaceRepo.findBySlug(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newWorkspace = await this.workspaceRepo.create({
      ownerId,
      brandName: baseName,
      slug: uniqueSlug,
      accentColor: '#f5551d',
      defaultLanguage: 'ar',
      accountType,
    });

    // Auto-create starter subscription and feature configuration if not already provisioned
    const starterPlan = await this.planRepo.findBySlug('starter');
    if (starterPlan) {
      await this.subscriptionRepo.create({
        workspaceId: newWorkspace.id,
        planId: starterPlan.id,
        status: 'trialing',
        currency: 'USD',
      });
      await this.featuresRepo.upsertFeatures(newWorkspace.id, starterPlan.features);
    }

    return newWorkspace;
  }

  async updateWorkspaceBranding(
    workspaceId: string,
    data: {
      brandName?: string;
      logoUrl?: string | null;
      customDomain?: string | null;
      accentColor?: string | null;
      defaultLanguage?: Language;
      accountType?: AccountType;
    }
  ): Promise<Workspace> {
    return this.workspaceRepo.update(workspaceId, data);
  }

  async getWorkspaceFeatures(workspaceId: string): Promise<WorkspaceFeatureConfig> {
    const featuresRecord = await this.featuresRepo.findByWorkspaceId(workspaceId);
    if (featuresRecord) return featuresRecord.features;

    // Fallback to active subscription plan features
    const sub = await this.subscriptionRepo.findByWorkspaceId(workspaceId);
    if (sub) {
      const plan = await this.planRepo.findById(sub.planId);
      if (plan) return plan.features;
    }

    return {};
  }

  async updateWorkspaceFeatures(
    workspaceId: string,
    features: WorkspaceFeatureConfig
  ): Promise<WorkspaceFeatures> {
    return this.featuresRepo.upsertFeatures(workspaceId, features);
  }

  async trackStorageUsage(workspaceId: string, addedBytes: number): Promise<Workspace> {
    const ws = await this.workspaceRepo.findById(workspaceId);
    if (!ws) throw new Error('Workspace not found');

    const updatedUsed = Math.max(0, (ws.storageUsedBytes || 0) + addedBytes);
    return this.workspaceRepo.update(workspaceId, { storageUsedBytes: updatedUsed });
  }
}

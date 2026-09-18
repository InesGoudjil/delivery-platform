import { Workspace, WorkspaceFeatures, WorkspaceFeatureConfig, AccountType, Language } from '@/core/entities/workspace';
import { IWorkspaceRepository, IWorkspaceFeaturesRepository } from '@/core/repositories/workspace.repository';
import { ISubscriptionRepository } from '@/core/repositories/subscription.repository';
import { IPlanRepository } from '@/core/repositories/plan.repository';
import { IWorkspaceMemberRepository } from '@/core/repositories/workspace-member.repository';

export class WorkspaceService {
  constructor(
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly featuresRepo: IWorkspaceFeaturesRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
    private readonly memberRepo?: IWorkspaceMemberRepository
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

    if (this.memberRepo) {
      await this.memberRepo.addMember(newWorkspace.id, ownerId, 'owner').catch(() => {});
    }

    return newWorkspace;
  }

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const owned = await this.workspaceRepo.listByOwnerId(userId);

    let memberWorkspaces: Workspace[] = [];
    if (this.memberRepo) {
      try {
        const memberships = await this.memberRepo.listByUserId(userId);
        const memberWorkspaceIds = memberships
          .map((m) => m.workspaceId)
          .filter((id) => !owned.some((o) => o.id === id));

        if (memberWorkspaceIds.length > 0) {
          memberWorkspaces = await this.workspaceRepo.listByIds(memberWorkspaceIds);
        }
      } catch (err: any) {
        console.warn('[WorkspaceService] Error fetching member workspaces:', err.message);
      }
    }

    const all = [...owned, ...memberWorkspaces];
    return all.sort((a, b) => {
      if (a.accountType === 'individual' && b.accountType !== 'individual') return -1;
      if (b.accountType === 'individual' && a.accountType !== 'individual') return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  async checkTeamWorkspaceEligibility(userId: string): Promise<{
    eligible: boolean;
    maxSeats: number;
    planName?: string;
    planSlug?: string;
    reason?: string;
  }> {
    const owned = await this.workspaceRepo.listByOwnerId(userId);
    for (const ws of owned) {
      const features = await this.getWorkspaceFeatures(ws.id);
      const seats = features.team_seats ?? 1;
      if (seats > 1) {
        const sub = await this.subscriptionRepo.findByWorkspaceId(ws.id);
        const plan = sub ? await this.planRepo.findById(sub.planId) : await this.planRepo.findBySlug('studio');
        return {
          eligible: true,
          maxSeats: seats,
          planName: plan?.name || 'Studio',
          planSlug: plan?.slug || 'studio',
        };
      }
    }

    return {
      eligible: false,
      maxSeats: 1,
      reason: 'Creating a Team Workspace requires a subscription with team seats (Studio plan).',
    };
  }

  async createTeamWorkspace(
    ownerId: string,
    brandName: string,
    slug?: string,
    accentColor?: string,
    defaultLanguage: Language = 'ar'
  ): Promise<Workspace> {
    const eligibility = await this.checkTeamWorkspaceEligibility(ownerId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'You need a Studio subscription with team seats to create a team workspace.');
    }

    const baseName = brandName.trim();
    const baseSlug = (slug || baseName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'studio-team';

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
      accentColor: accentColor || '#f5551d',
      defaultLanguage,
      accountType: 'studio',
    });

    if (this.memberRepo) {
      await this.memberRepo.addMember(newWorkspace.id, ownerId, 'owner').catch(() => {});
    }

    const studioPlan = (await this.planRepo.findBySlug('studio')) || (await this.planRepo.findBySlug('starter'));
    if (studioPlan) {
      await this.subscriptionRepo.create({
        workspaceId: newWorkspace.id,
        planId: studioPlan.id,
        status: 'active',
        currency: 'USD',
      });
      await this.featuresRepo.upsertFeatures(newWorkspace.id, studioPlan.features);
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

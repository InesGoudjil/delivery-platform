import { Workspace, WorkspaceFeatures, WorkspaceFeatureConfig, AccountType, Language } from '@/core/entities/workspace';
import { Plan } from '@/core/entities/plan';
import { IWorkspaceRepository, IWorkspaceFeaturesRepository } from '@/core/repositories/workspace.repository';
import { ISubscriptionRepository } from '@/core/repositories/subscription.repository';
import { IPlanRepository } from '@/core/repositories/plan.repository';
import { IWorkspaceMemberRepository } from '@/core/repositories/workspace-member.repository';
import { createScopedLogger } from '@/lib/logger';

const log = createScopedLogger({ service: 'WorkspaceService' });

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
      accentColor: '#F5551D',
      defaultLanguage: 'ar',
      accountType,
    });

    // Auto-create starter subscription if not already provisioned
    const starterPlan = await this.planRepo.findBySlug('starter');
    if (starterPlan) {
      await this.subscriptionRepo.create({
        workspaceId: newWorkspace.id,
        planId: starterPlan.id,
        status: 'trialing',
        currency: 'USD',
      });
    }

    if (this.memberRepo) {
      await this.memberRepo.addMember(newWorkspace.id, ownerId, 'owner').catch(() => {});
    }

    return newWorkspace;
  }

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const [owned, memberships] = await Promise.all([
      this.workspaceRepo.listByOwnerId(userId),
      this.memberRepo
        ? this.memberRepo.listByUserId(userId).catch((err: any) => {
            log.warn({ err, userId }, 'Error fetching member workspaces');
            return [];
          })
        : Promise.resolve([]),
    ]);

    let memberWorkspaces: Workspace[] = [];
    if (this.memberRepo && memberships.length > 0) {
      try {
        const ownedIds = new Set(owned.map((o) => o.id));
        const memberWorkspaceIds = memberships
          .map((m) => m.workspaceId)
          .filter((id) => !ownedIds.has(id));

        if (memberWorkspaceIds.length > 0) {
          memberWorkspaces = await this.workspaceRepo.listByIds(memberWorkspaceIds);
        }
      } catch (err: any) {
        log.warn({ err, userId }, 'Error fetching member workspaces by IDs');
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
    const MAX_TEAM_WORKSPACES = 5;
    const teamWorkspaces = owned.filter((w) => w.accountType === 'studio');

    if (teamWorkspaces.length >= MAX_TEAM_WORKSPACES) {
      return {
        eligible: false,
        maxSeats: 1,
        reason: `You have reached the maximum limit of ${MAX_TEAM_WORKSPACES} team workspaces.`,
      };
    }

    const studioPlan = await this.planRepo.findBySlug('studio');
    return {
      eligible: true,
      maxSeats: studioPlan?.features?.team_seats ?? 5,
      planName: 'Studio (14-Day Free Trial)',
      planSlug: 'studio',
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
      throw new Error(eligibility.reason || 'Cannot create team workspace at this time.');
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

    // Provision a clean 14-day trial of the Studio tier for the new Team Workspace
    const studioPlan = (await this.planRepo.findBySlug('studio')) || (await this.planRepo.findBySlug('starter'));
    if (studioPlan) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      await this.subscriptionRepo.create({
        workspaceId: newWorkspace.id,
        planId: studioPlan.id,
        status: 'trialing',
        currency: studioPlan.currency || 'USD',
        trialEndsAt: trialEndsAt.toISOString(),
      });
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
    const sub = await this.subscriptionRepo.findByWorkspaceId(workspaceId);
    let plan: Plan | null = null;
    if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
      if (sub.status === 'trialing' && sub.trialEndsAt && new Date(sub.trialEndsAt) < new Date()) {
        plan = await this.planRepo.findBySlug('starter');
      } else {
        plan = await this.planRepo.findById(sub.planId);
      }
    } else {
      plan = await this.planRepo.findBySlug('starter');
    }

    const baseline = plan?.features || {};
    const featuresRecord = await this.featuresRepo.findByWorkspaceId(workspaceId);
    const overrides = featuresRecord?.features || {};

    return {
      ...baseline,
      ...overrides,
    };
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

  async updateWorkspace(workspaceId: string, data: Partial<Workspace>): Promise<Workspace> {
    return this.workspaceRepo.update(workspaceId, data);
  }
}


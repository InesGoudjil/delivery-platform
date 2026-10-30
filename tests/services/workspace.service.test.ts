import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkspaceService } from "@/core/services/workspace.service";
import type {
  IWorkspaceRepository,
  IWorkspaceFeaturesRepository,
} from "@/core/repositories/workspace.repository";
import type { ISubscriptionRepository } from "@/core/repositories/subscription.repository";
import type { IPlanRepository } from "@/core/repositories/plan.repository";
import type { IWorkspaceMemberRepository } from "@/core/repositories/workspace-member.repository";
import type { Workspace } from "@/core/entities/workspace";

describe("core/services/WorkspaceService", () => {
  let workspaceRepo: Partial<IWorkspaceRepository>;
  let featuresRepo: Partial<IWorkspaceFeaturesRepository>;
  let subscriptionRepo: Partial<ISubscriptionRepository>;
  let planRepo: Partial<IPlanRepository>;
  let memberRepo: Partial<IWorkspaceMemberRepository>;
  let service: WorkspaceService;

  const mockWorkspace: Workspace = {
    id: "ws_owned",
    ownerId: "user_123",
    brandName: "Original Studio",
    slug: "original-studio",
    accentColor: "#f5551d",
    defaultLanguage: "ar",
    accountType: "individual",
    storageUsedBytes: 0,
    createdAt: new Date("2026-01-01").toISOString(),
    updatedAt: new Date("2026-01-01").toISOString(),
  };

  const starterPlan = {
    id: "plan_starter",
    slug: "starter",
    features: { client_links: 1, team_seats: 1 },
  };

  beforeEach(() => {
    workspaceRepo = {
      findById: vi.fn().mockImplementation((id) =>
        Promise.resolve(id === "ws_owned" ? mockWorkspace : null)
      ),
      findByOwnerId: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((dto) =>
        Promise.resolve({ id: "ws_new", ...dto, createdAt: new Date(), updatedAt: new Date() })
      ),
      listByOwnerId: vi.fn().mockResolvedValue([mockWorkspace]),
      listByIds: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockImplementation((id, data) =>
        Promise.resolve({ ...mockWorkspace, ...data })
      ),
    };

    featuresRepo = {
      findByWorkspaceId: vi.fn().mockResolvedValue({
        workspaceId: "ws_owned",
        features: starterPlan.features,
      } as any),
      upsertFeatures: vi.fn().mockResolvedValue({} as any),
    };

    subscriptionRepo = {
      create: vi.fn().mockResolvedValue({ id: "sub_new" } as any),
      findByWorkspaceId: vi.fn().mockResolvedValue(null),
    };

    planRepo = {
      findBySlug: vi.fn().mockImplementation((slug) =>
        Promise.resolve(slug === "starter" ? starterPlan : null) as any
      ),
    };

    memberRepo = {
      addMember: vi.fn().mockResolvedValue({} as any),
      listByUserId: vi.fn().mockResolvedValue([]),
    };

    service = new WorkspaceService(
      workspaceRepo as IWorkspaceRepository,
      featuresRepo as IWorkspaceFeaturesRepository,
      subscriptionRepo as ISubscriptionRepository,
      planRepo as IPlanRepository,
      memberRepo as IWorkspaceMemberRepository
    );
  });

  describe("getOrCreateWorkspace", () => {
    it("returns existing workspace if owner already has one", async () => {
      vi.mocked(workspaceRepo.findByOwnerId!).mockResolvedValue(mockWorkspace);

      const ws = await service.getOrCreateWorkspace("user_123");
      expect(ws.id).toBe("ws_owned");
      expect(workspaceRepo.create).not.toHaveBeenCalled();
    });

    it("creates a new workspace with starter plan and features if none exists", async () => {
      const ws = await service.getOrCreateWorkspace("user_new", "Creative Agency");

      expect(ws.id).toBe("ws_new");
      expect(ws.brandName).toBe("Creative Agency");
      expect(ws.slug).toBe("creative-agency");
      expect(subscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws_new",
          planId: "plan_starter",
        })
      );
      expect(featuresRepo.upsertFeatures).toHaveBeenCalledWith(
        "ws_new",
        starterPlan.features
      );
    });

    it("resolves slug collisions by appending a counter", async () => {
      // First slug check hits existing, second returns null
      vi.mocked(workspaceRepo.findBySlug!)
        .mockResolvedValueOnce({ id: "ws_existing" } as any)
        .mockResolvedValueOnce(null);

      const ws = await service.getOrCreateWorkspace("user_new", "My Studio");
      expect(ws.slug).toBe("my-studio-1");
    });
  });

  describe("getUserWorkspaces", () => {
    it("aggregates owned and collaborating workspaces", async () => {
      const memberWs: Workspace = {
        id: "ws_collab",
        ownerId: "other_user",
        brandName: "Partner Studio",
        slug: "partner-studio",
        defaultLanguage: "en",
        accountType: "studio",
        storageUsedBytes: 0,
        createdAt: new Date("2026-02-01").toISOString(),
        updatedAt: new Date("2026-02-01").toISOString(),
      };

      vi.mocked(memberRepo.listByUserId!).mockResolvedValue([
        { workspaceId: "ws_collab", userId: "user_123", role: "editor" } as any,
      ]);
      vi.mocked(workspaceRepo.listByIds!).mockResolvedValue([memberWs]);

      const list = await service.getUserWorkspaces("user_123");
      expect(list).toHaveLength(2);
      expect(list.map((w) => w.id)).toContain("ws_owned");
      expect(list.map((w) => w.id)).toContain("ws_collab");
    });
  });
});

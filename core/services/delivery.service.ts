import { Delivery, DeliveryStatus, CreateDeliveryDTO, UpdateDeliveryDTO, DeliverySummaryItem } from "@/core/entities/delivery";
import { Client } from "@/core/entities/client";
import { Asset, AssetVersion } from "@/core/entities/asset";
import { Feedback } from "@/core/entities/feedback";
import { Project } from "@/core/entities/project";
import { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import { IClientRepository } from "@/core/repositories/client.repository";
import { IAssetRepository, IAssetVersionRepository } from "@/core/repositories/i-asset-repository";
import { IFeedbackRepository } from "@/core/repositories/feedback.repository";
import { IProjectRepository } from "@/core/repositories/i-project-repository";
import { SubscriptionService } from "./subscription.service";
import { NotificationService, type NotificationRecipient } from "./notification.service";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ service: "DeliveryService" });

export const RECOVERED_DELIVERY_TITLE = "Recovered files";

export interface DeliveryWithDetails extends Delivery {
  client?: Client | null;
  totalAssetsCount?: number;
  approvedAssetsCount?: number;
  hasMore?: boolean;
  assets: Array<
    Asset & {
      versions: AssetVersion[];
      activeVersion?: AssetVersion | null;
      feedback: Feedback[];
    }
  >;
}

export class DeliveryService {
  constructor(
    private readonly deliveryRepo: IDeliveryRepository,
    private readonly clientRepo: IClientRepository,
    private readonly assetRepo: IAssetRepository,
    private readonly assetVersionRepo: IAssetVersionRepository,
    private readonly feedbackRepo: IFeedbackRepository,
    private readonly projectRepo?: IProjectRepository,
    private readonly subscriptionService?: SubscriptionService,
    private readonly notificationService?: NotificationService
  ) {}

  async createDelivery(dto: CreateDeliveryDTO): Promise<Delivery> {
    if (this.subscriptionService) {
      const eligibility = await this.subscriptionService.canCreateProject(dto.workspaceId);
      if (!eligibility.allowed) {
        throw new Error(
          eligibility.reason ||
            "Active client delivery link limit reached. Please upgrade your subscription plan."
        );
      }
    }
    return this.deliveryRepo.create(dto);
  }

  /**
   * The workspace's draft delivery for files restored from Trash after their own delivery
   * was deleted. It's never shared (no one has its link) and isn't a client delivery, so it
   * doesn't count against the plan's delivery limit.
   */
  async findOrCreateRecoveryDelivery(workspaceId: string): Promise<Delivery> {
    const existing = (await this.deliveryRepo.listByWorkspaceId(workspaceId)).find(
      (d) => d.title === RECOVERED_DELIVERY_TITLE && d.status === "draft"
    );
    if (existing) return existing;
    return this.deliveryRepo.create({
      workspaceId,
      title: RECOVERED_DELIVERY_TITLE,
      description: "Files restored from Trash after their delivery was deleted.",
      status: "draft",
      isDownloadAllowed: false,
    });
  }

  async getDeliveryById(id: string): Promise<Delivery | null> {
    return this.deliveryRepo.findById(id);
  }

  async getDeliveryByShareToken(
    shareToken: string,
    options?: { allowExpired?: boolean }
  ): Promise<Delivery | null> {
    const delivery = await this.deliveryRepo.findByShareToken(shareToken);
    if (!delivery) return null;

    if (!options?.allowExpired && delivery.expiresAt && new Date(delivery.expiresAt) < new Date()) {
      throw new Error("This delivery link has expired.");
    }

    return delivery;
  }

  async regenerateShareToken(deliveryId: string): Promise<Delivery> {
    const { randomBytes } = await import("crypto");
    const newShareToken = randomBytes(16).toString("hex");
    return this.deliveryRepo.update(deliveryId, { shareToken: newShareToken });
  }

  async listWorkspaceDeliveries(workspaceId: string): Promise<Delivery[]> {
    return this.deliveryRepo.listByWorkspaceId(workspaceId);
  }

  async listWorkspaceDeliveriesSummary(workspaceId: string): Promise<DeliverySummaryItem[]> {
    if (this.deliveryRepo.listDeliveriesSummary) {
      return this.deliveryRepo.listDeliveriesSummary(workspaceId);
    }
    const deliveries = await this.deliveryRepo.listByWorkspaceId(workspaceId);
    return deliveries.map((d) => ({
      ...d,
      clientName: "Private Client",
      assetsCount: 0,
      commentsCount: 0,
      passcodeProtected: Boolean(d.passcodeHash),
    }));
  }

  /**
   * A delivery with its files, versions and comments. Pass the delivery the caller is
   * already authorized for (the client-room gate, or a member's RLS-scoped lookup), or a
   * delivery id. Share tokens aren't accepted here: client rooms go through
   * core/security/client-room.ts first. Only files of the delivery's own workspace load.
   */
  async getDeliveryWithFullDetails(
    target: Delivery | string,
    options?: { page?: number; limit?: number; type?: string }
  ): Promise<DeliveryWithDetails | null> {
    const delivery = typeof target === "string" ? await this.deliveryRepo.findById(target) : target;
    if (!delivery) return null;
    const workspaceId = delivery.workspaceId;

    let client: Client | null = null;
    if (delivery.clientId) {
      client = await this.clientRepo.findById(delivery.clientId);
    }

    let assets: Asset[] = [];
    let totalAssetsCount = 0;
    let approvedAssetsCount = 0;
    let hasMore = false;

    if (options?.limit !== undefined) {
      const page = options.page || 1;
      const offset = (page - 1) * options.limit;
      const res = await this.assetRepo.listByDeliveryIdPaginated(delivery.id, {
        limit: options.limit,
        offset,
        type: options.type,
        workspaceId,
      });
      assets = res.assets;
      totalAssetsCount = res.totalCount;
      approvedAssetsCount = await this.assetRepo.countByDeliveryId(delivery.id, { isApproved: true, workspaceId });
      hasMore = offset + assets.length < totalAssetsCount;
    } else {
      assets = await this.assetRepo.listByDeliveryId(delivery.id, { workspaceId });
      totalAssetsCount = assets.length;
      approvedAssetsCount = assets.filter((a) => a.isApproved).length;
      hasMore = false;
    }

    const enrichedAssets = await Promise.all(
      assets.map(async (asset) => {
        const versions = await this.assetVersionRepo.listByAssetId(asset.id);
        const activeVersion = versions.find((v) => v.isActiveVersion) || versions[0] || null;

        let feedback: Feedback[] = [];
        if (versions.length > 0) {
          const versionIds = versions.map((v) => v.id);
          feedback = await this.feedbackRepo.listByAssetVersionIds(versionIds);
        }

        return {
          ...asset,
          versions,
          activeVersion,
          feedback,
        };
      })
    );

    return {
      ...delivery,
      client,
      totalAssetsCount,
      approvedAssetsCount,
      hasMore,
      assets: enrichedAssets,
    };
  }

  async getDeliveryAssetsPage(
    delivery: Delivery,
    options?: { page?: number; limit?: number; type?: "all" | "video" | "photo" }
  ): Promise<{
    assets: Array<
      Asset & {
        versions: AssetVersion[];
        activeVersion?: AssetVersion | null;
        feedback: Feedback[];
      }
    >;
    totalCount: number;
    approvedCount: number;
    hasMore: boolean;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 12;
    const offset = (page - 1) * limit;

    let dbType: string | undefined = undefined;
    if (options?.type === "video") {
      dbType = "video";
    } else if (options?.type === "photo") {
      dbType = "photo_gallery";
    }

    const [paginatedResult, approvedCount] = await Promise.all([
      this.assetRepo.listByDeliveryIdPaginated(delivery.id, {
        limit,
        offset,
        type: dbType,
        workspaceId: delivery.workspaceId,
      }),
      this.assetRepo.countByDeliveryId(delivery.id, { isApproved: true, workspaceId: delivery.workspaceId }),
    ]);

    const enrichedAssets = await Promise.all(
      paginatedResult.assets.map(async (asset) => {
        const versions = await this.assetVersionRepo.listByAssetId(asset.id);
        const activeVersion = versions.find((v) => v.isActiveVersion) || versions[0] || null;

        let feedback: Feedback[] = [];
        if (versions.length > 0) {
          const versionIds = versions.map((v) => v.id);
          feedback = await this.feedbackRepo.listByAssetVersionIds(versionIds);
        }

        return {
          ...asset,
          versions,
          activeVersion,
          feedback,
        };
      })
    );

    return {
      assets: enrichedAssets,
      totalCount: paginatedResult.totalCount,
      approvedCount,
      hasMore: offset + paginatedResult.assets.length < paginatedResult.totalCount,
    };
  }

  async updateDelivery(id: string, data: UpdateDeliveryDTO): Promise<Delivery> {
    return this.deliveryRepo.update(id, data);
  }

  async updateStatus(id: string, status: DeliveryStatus, approvedByName?: string): Promise<Delivery> {
    return this.deliveryRepo.updateStatus(id, status, approvedByName);
  }

  /** Approves every file of an authorized delivery and marks the delivery approved. */
  async approveCut(
    target: Delivery,
    approvedByName?: string,
    options?: { origin?: string; notifyRecipients?: NotificationRecipient[] }
  ): Promise<Delivery> {
    const id = target.id;
    const scope = { deliveryId: target.id, workspaceId: target.workspaceId };
    const allAssets = await this.assetRepo.listByDeliveryId(id, { workspaceId: target.workspaceId });
    if (allAssets.length > 0) {
      await Promise.all(
        allAssets
          .filter((a) => !a.isApproved)
          .map((a) => this.assetRepo.toggleApproval(a.id, true, scope))
      );
    }

    const delivery = await this.deliveryRepo.updateStatus(id, "approved", approvedByName || "Client Guest");

    if (this.notificationService && options?.notifyRecipients && options.notifyRecipients.length > 0) {
      const versionNumber = await this.getCurrentVersionNumber(id, target.workspaceId).catch(() => 1);
      await this.notificationService
        .notifyCutApproved({
          deliveryId: id,
          approvedByName: approvedByName || "Client",
          recipients: options.notifyRecipients,
          versionNumber,
          origin: options.origin,
        })
        .catch((err) => {
          log.error({ err, deliveryId: id }, "Failed to dispatch cut approval email");
        });
    }

    return delivery;
  }

  async sendDeliveryEmail(params: {
    deliveryId: string;
    recipientEmail: string;
    clientId?: string | null;
    customMessage?: string;
    origin?: string;
    replyTo?: string | null;
  }) {
    if (!this.notificationService) {
      throw new Error("NotificationService is not configured in DeliveryService");
    }
    return this.notificationService.sendDeliveryEmail(params);
  }

  /** Approves or unapproves one file of an authorized delivery; throws if the file isn't in it. */
  async toggleAssetApproval(target: Delivery, assetId: string, isApproved: boolean): Promise<Asset> {
    const deliveryId = target.id;
    const scope = { deliveryId: target.id, workspaceId: target.workspaceId };
    const currentDelivery = await this.deliveryRepo.findById(deliveryId);
    const allAssets = await this.assetRepo.listByDeliveryId(deliveryId, { workspaceId: target.workspaceId });
    if (!allAssets.some((a) => a.id === assetId)) {
      throw new Error("That file isn't part of this delivery.");
    }

    // If delivery was previously marked approved at the project level without asset flags,
    // and one asset is being unapproved, persist approval on the remaining assets first.
    if (
      !isApproved &&
      currentDelivery?.status === "approved" &&
      allAssets.length > 0 &&
      allAssets.every((a) => !a.isApproved)
    ) {
      await Promise.all(
        allAssets
          .filter((a) => a.id !== assetId)
          .map((a) => this.assetRepo.toggleApproval(a.id, true, scope))
      );
    }

    const updatedAsset = await this.assetRepo.toggleApproval(assetId, isApproved, scope);

    // Auto-update delivery status based on all assets
    if (allAssets.length > 0) {
      const wasLegacyApproved =
        !isApproved &&
        currentDelivery?.status === "approved" &&
        allAssets.every((a) => !a.isApproved);
      const allApproved = wasLegacyApproved
        ? false
        : allAssets.every((a) => (a.id === assetId ? isApproved : a.isApproved));

      if (allApproved) {
        await this.updateStatus(deliveryId, "approved", "Client Review");
      } else if (currentDelivery && currentDelivery.status === "approved") {
        await this.updateStatus(deliveryId, "in_review");
      }
    }

    return updatedAsset;
  }

  async approveAllAssets(
    target: Delivery,
    approvedByName?: string,
    options?: { origin?: string; notifyRecipients?: NotificationRecipient[] }
  ): Promise<void> {
    await this.approveCut(target, approvedByName, options);
  }

  /** The delivery's current version: the highest active version among its files (1 when there are none). */
  async getCurrentVersionNumber(deliveryId: string, workspaceId: string): Promise<number> {
    const assets = await this.assetRepo.listByDeliveryId(deliveryId, { workspaceId });
    let latest = 1;
    for (const asset of assets) {
      const versions = await this.assetVersionRepo.listByAssetId(asset.id);
      for (const version of versions) {
        if (version.isActiveVersion && version.versionNumber > latest) latest = version.versionNumber;
      }
    }
    return latest;
  }

  async unapproveAllAssets(target: Delivery): Promise<Delivery> {
    const scope = { deliveryId: target.id, workspaceId: target.workspaceId };
    const allAssets = await this.assetRepo.listByDeliveryId(target.id, { workspaceId: target.workspaceId });
    if (allAssets.length > 0) {
      await Promise.all(
        allAssets
          .filter((a) => a.isApproved)
          .map((a) => this.assetRepo.toggleApproval(a.id, false, scope))
      );
    }
    return this.deliveryRepo.updateStatus(target.id, "in_review");
  }

  /**
   * 1-Click: Promotes an approved delivery into a public portfolio showcase project
   */
  async publishToPortfolio(
    deliveryId: string,
    portfolioId: string,
    options?: {
      title?: string;
      description?: string;
      category?: string;
      coverAssetUrl?: string;
    }
  ): Promise<Project> {
    if (!this.projectRepo) {
      throw new Error("ProjectRepository is required to publish to portfolio");
    }

    const delivery = await this.deliveryRepo.findById(deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    if (this.subscriptionService && this.projectRepo) {
      const existingProjects = await this.projectRepo.listByPortfolioId(portfolioId);
      const eligibility = await this.subscriptionService.canAddPortfolioVideo(
        delivery.workspaceId,
        existingProjects.length
      );
      if (!eligibility.allowed) {
        throw new Error(
          eligibility.reason ||
            "Portfolio showcase film limit reached. Please upgrade your subscription plan."
        );
      }
    }

    let clientName: string | null = null;
    if (delivery.clientId) {
      const client = await this.clientRepo.findById(delivery.clientId);
      clientName = client?.name || null;
    }

    const assets = await this.assetRepo.listByDeliveryId(deliveryId, { workspaceId: delivery.workspaceId });

    // Pick first active asset thumbnail as cover if not provided
    let coverUrl = options?.coverAssetUrl || null;
    if (!coverUrl && assets.length > 0) {
      const activeVer = await this.assetVersionRepo.findActiveVersion(assets[0].id);
      coverUrl = activeVer?.thumbnailUrl || activeVer?.rawFileUrl || null;
    }

    const showcaseProject = await this.projectRepo.create({
      workspaceId: delivery.workspaceId,
      portfolioId,
      title: options?.title || delivery.title,
      clientName: clientName || delivery.title,
      description: options?.description || delivery.description,
      category: options?.category || "Commercial",
      coverAssetUrl: coverUrl,
      sourceDeliveryId: delivery.id,
      isPublished: true,
    });

    // Attach all delivery assets to the showcase project
    await Promise.all(
      assets.map((asset, idx) => this.projectRepo!.attachAsset(showcaseProject.id, asset.id, idx))
    );

    return showcaseProject;
  }

  async deleteDelivery(id: string): Promise<void> {
    return this.deliveryRepo.delete(id);
  }
}

import { Delivery, DeliveryStatus, CreateDeliveryDTO, UpdateDeliveryDTO } from "@/core/entities/delivery";
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
import { NotificationService } from "./notification.service";

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

  async getDeliveryWithFullDetails(
    identifier: string,
    options?: { page?: number; limit?: number; type?: string }
  ): Promise<DeliveryWithDetails | null> {
    let delivery = await this.deliveryRepo.findByShareToken(identifier);
    if (!delivery) {
      delivery = await this.deliveryRepo.findById(identifier);
    }
    if (!delivery) return null;

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
      });
      assets = res.assets;
      totalAssetsCount = res.totalCount;
      approvedAssetsCount = await this.assetRepo.countByDeliveryId(delivery.id, { isApproved: true });
      hasMore = offset + assets.length < totalAssetsCount;
    } else {
      assets = await this.assetRepo.listByDeliveryId(delivery.id);
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
    deliveryId: string,
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
      this.assetRepo.listByDeliveryIdPaginated(deliveryId, {
        limit,
        offset,
        type: dbType,
      }),
      this.assetRepo.countByDeliveryId(deliveryId, { isApproved: true }),
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

  async approveCut(
    id: string,
    approvedByName?: string,
    options?: { origin?: string; notifyEmails?: string[] }
  ): Promise<Delivery> {
    const allAssets = await this.assetRepo.listByDeliveryId(id);
    if (allAssets.length > 0) {
      await Promise.all(
        allAssets
          .filter((a) => !a.isApproved)
          .map((a) => this.assetRepo.toggleApproval(a.id, true))
      );
    }

    const delivery = await this.deliveryRepo.updateStatus(id, "approved", approvedByName || "Client Guest");

    if (this.notificationService && options?.notifyEmails && options.notifyEmails.length > 0) {
      await this.notificationService
        .notifyCutApproved({
          deliveryId: id,
          approvedByName: approvedByName || "Client",
          recipientEmails: options.notifyEmails,
          origin: options.origin,
        })
        .catch((err) => {
          console.error("[DeliveryService] Failed to dispatch cut approval email:", err);
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
  }) {
    if (!this.notificationService) {
      throw new Error("NotificationService is not configured in DeliveryService");
    }
    return this.notificationService.sendDeliveryEmail(params);
  }

  async toggleAssetApproval(deliveryId: string, assetId: string, isApproved: boolean): Promise<Asset> {
    const currentDelivery = await this.deliveryRepo.findById(deliveryId);
    const allAssets = await this.assetRepo.listByDeliveryId(deliveryId);

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
          .map((a) => this.assetRepo.toggleApproval(a.id, true))
      );
    }

    const updatedAsset = await this.assetRepo.toggleApproval(assetId, isApproved);

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
    deliveryId: string,
    approvedByName?: string,
    options?: { origin?: string; notifyEmails?: string[] }
  ): Promise<void> {
    await this.approveCut(deliveryId, approvedByName, options);
  }

  async unapproveAllAssets(deliveryId: string): Promise<Delivery> {
    const allAssets = await this.assetRepo.listByDeliveryId(deliveryId);
    if (allAssets.length > 0) {
      await Promise.all(
        allAssets
          .filter((a) => a.isApproved)
          .map((a) => this.assetRepo.toggleApproval(a.id, false))
      );
    }
    return this.deliveryRepo.updateStatus(deliveryId, "in_review");
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

    const assets = await this.assetRepo.listByDeliveryId(deliveryId);

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

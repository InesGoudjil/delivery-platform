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

export interface DeliveryWithDetails extends Delivery {
  client?: Client | null;
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
    private readonly subscriptionService?: SubscriptionService
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

  async getDeliveryByShareToken(shareToken: string): Promise<Delivery | null> {
    const delivery = await this.deliveryRepo.findByShareToken(shareToken);
    if (!delivery) return null;

    if (delivery.expiresAt && new Date(delivery.expiresAt) < new Date()) {
      throw new Error("This delivery link has expired.");
    }

    return delivery;
  }

  async listWorkspaceDeliveries(workspaceId: string): Promise<Delivery[]> {
    return this.deliveryRepo.listByWorkspaceId(workspaceId);
  }

  async getDeliveryWithFullDetails(identifier: string): Promise<DeliveryWithDetails | null> {
    let delivery = await this.deliveryRepo.findByShareToken(identifier);
    if (!delivery) {
      delivery = await this.deliveryRepo.findById(identifier);
    }
    if (!delivery) return null;

    let client: Client | null = null;
    if (delivery.clientId) {
      client = await this.clientRepo.findById(delivery.clientId);
    }

    const assets = await this.assetRepo.listByDeliveryId(delivery.id);

    const enrichedAssets = await Promise.all(
      assets.map(async (asset) => {
        const versions = await this.assetVersionRepo.listByAssetId(asset.id);
        const activeVersion = versions.find((v) => v.isActiveVersion) || versions[0] || null;

        let feedback: Feedback[] = [];
        if (activeVersion) {
          feedback = await this.feedbackRepo.listByAssetVersionId(activeVersion.id);
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
      assets: enrichedAssets,
    };
  }

  async updateDelivery(id: string, data: UpdateDeliveryDTO): Promise<Delivery> {
    return this.deliveryRepo.update(id, data);
  }

  async updateStatus(id: string, status: DeliveryStatus, approvedByName?: string): Promise<Delivery> {
    return this.deliveryRepo.updateStatus(id, status, approvedByName);
  }

  async approveCut(id: string, approvedByName?: string): Promise<Delivery> {
    return this.deliveryRepo.updateStatus(id, "approved", approvedByName || "Client Guest");
  }

  async toggleAssetApproval(deliveryId: string, assetId: string, isApproved: boolean): Promise<Asset> {
    const updatedAsset = await this.assetRepo.toggleApproval(assetId, isApproved);

    // Auto-update delivery status based on all assets
    const allAssets = await this.assetRepo.listByDeliveryId(deliveryId);
    if (allAssets.length > 0) {
      const allApproved = allAssets.every((a) => (a.id === assetId ? isApproved : a.isApproved));
      if (allApproved) {
        await this.updateStatus(deliveryId, "approved", "Client Review");
      } else {
        const currentDelivery = await this.deliveryRepo.findById(deliveryId);
        if (currentDelivery && currentDelivery.status === "approved") {
          await this.updateStatus(deliveryId, "in_review");
        }
      }
    }

    return updatedAsset;
  }

  async approveAllAssets(deliveryId: string, approvedByName?: string): Promise<void> {
    const allAssets = await this.assetRepo.listByDeliveryId(deliveryId);
    await Promise.all(allAssets.map((a) => this.assetRepo.toggleApproval(a.id, true)));
    await this.updateStatus(deliveryId, "approved", approvedByName || "Client Guest");
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

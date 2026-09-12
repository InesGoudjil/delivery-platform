import { NotificationLog, NotificationChannel, NotificationStatus } from "@/core/entities/notification";
import { INotificationLogRepository } from "@/core/repositories/notification.repository";
import { IDeliveryRepository } from "@/core/repositories/i-delivery-repository";
import { IWorkspaceRepository } from "@/core/repositories/workspace.repository";

export interface DispatchWhatsAppParams {
  workspaceId: string;
  deliveryId: string;
  clientId?: string | null;
  recipientPhone: string;
  customMessage?: string;
  origin?: string;
}

export class NotificationService {
  constructor(
    private readonly notificationRepo: INotificationLogRepository,
    private readonly deliveryRepo: IDeliveryRepository,
    private readonly workspaceRepo: IWorkspaceRepository
  ) {}

  async dispatchWhatsAppDelivery(params: DispatchWhatsAppParams): Promise<{
    log: NotificationLog;
    whatsappShareUrl: string;
    messageText: string;
  }> {
    const delivery = await this.deliveryRepo.findById(params.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    const workspace = await this.workspaceRepo.findById(params.workspaceId);
    const brandName = workspace?.brandName || "Studio";

    const baseUrl = params.origin || "https://cut.app";
    const reviewLink = `${baseUrl}/deliver/${delivery.shareToken}`;

    const defaultMessage = `🎬 *${brandName}* shared a new video cut for review:\n\n*${delivery.title}*\n\n👉 Watch & leave timecoded feedback here (no login required):\n${reviewLink}`;
    const finalMessage = params.customMessage || defaultMessage;

    const cleanPhone = params.recipientPhone.replace(/[^0-9]/g, "");
    const whatsappShareUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}`;

    const log = await this.notificationRepo.create({
      workspaceId: params.workspaceId,
      projectId: params.deliveryId, // maps to delivery_id in db
      clientId: params.clientId,
      channel: "whatsapp",
      recipientPhone: params.recipientPhone,
      status: "delivered",
    });

    return {
      log,
      whatsappShareUrl,
      messageText: finalMessage,
    };
  }

  async listWorkspaceLogs(workspaceId: string): Promise<NotificationLog[]> {
    return this.notificationRepo.listByWorkspaceId(workspaceId);
  }

  async updateLogStatus(
    id: string,
    status: NotificationStatus,
    providerMessageId?: string,
    errorMessage?: string
  ): Promise<NotificationLog> {
    return this.notificationRepo.updateStatus(id, status, providerMessageId, errorMessage);
  }
}

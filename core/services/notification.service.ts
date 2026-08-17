import { NotificationLog, NotificationChannel, NotificationStatus } from '@/core/entities/notification';
import { INotificationLogRepository } from '@/core/repositories/notification.repository';
import { IProjectRepository } from '@/core/repositories/project.repository';
import { IWorkspaceRepository } from '@/core/repositories/workspace.repository';

export interface DispatchWhatsAppParams {
  workspaceId: string;
  projectId: string;
  clientId?: string | null;
  recipientPhone: string;
  customMessage?: string;
  origin?: string;
}

export class NotificationService {
  constructor(
    private readonly notificationRepo: INotificationLogRepository,
    private readonly projectRepo: IProjectRepository,
    private readonly workspaceRepo: IWorkspaceRepository
  ) {}

  async dispatchWhatsAppDelivery(params: DispatchWhatsAppParams): Promise<{
    log: NotificationLog;
    whatsappShareUrl: string;
    messageText: string;
  }> {
    const project = await this.projectRepo.findById(params.projectId);
    if (!project) throw new Error('Project not found');

    const workspace = await this.workspaceRepo.findById(params.workspaceId);
    const brandName = workspace?.brandName || 'Studio';

    const baseUrl = params.origin || 'https://cut.app';
    const reviewLink = `${baseUrl}/deliver/${project.shareToken}`;

    const defaultMessage = `🎬 *${brandName}* shared a new video cut for review:\n\n*${project.title}*\n\n👉 Watch & leave timecoded feedback here (no login required):\n${reviewLink}`;

    const finalMessage = params.customMessage || defaultMessage;

    // Clean phone number
    const cleanPhone = params.recipientPhone.replace(/[^0-9]/g, '');

    // Encode for WhatsApp Web / Mobile API
    const whatsappShareUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}`;

    // Log the dispatch attempt
    const log = await this.notificationRepo.create({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      clientId: params.clientId,
      channel: 'whatsapp',
      recipientPhone: params.recipientPhone,
      status: 'delivered',
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
    error?: string
  ): Promise<NotificationLog> {
    return this.notificationRepo.updateStatus(id, status, providerMessageId, error);
  }
}

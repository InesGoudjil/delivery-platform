export type NotificationChannel = 'whatsapp' | 'email';
export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export interface NotificationLog {
  id: string;
  workspaceId: string;
  clientId?: string | null;
  projectId?: string | null;
  channel: NotificationChannel;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  subject?: string | null;
  status: NotificationStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

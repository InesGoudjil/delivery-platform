import { Feedback, FeedbackReply } from '@/core/entities/feedback';
import { IFeedbackRepository, CreateFeedbackDTO, CreateFeedbackReplyDTO } from '@/core/repositories/feedback.repository';
import { NotificationService } from './notification.service';

export interface FeedbackThread extends Feedback {
  replies: FeedbackReply[];
}

export class FeedbackService {
  constructor(
    private readonly feedbackRepo: IFeedbackRepository,
    private readonly notificationService?: NotificationService
  ) {}

  async addFeedback(dto: CreateFeedbackDTO): Promise<Feedback> {
    return this.feedbackRepo.create(dto);
  }

  async addReply(dto: CreateFeedbackReplyDTO): Promise<FeedbackReply> {
    return this.feedbackRepo.createReply(dto);
  }

  async deleteReply(replyId: string): Promise<void> {
    return this.feedbackRepo.deleteReply(replyId);
  }

  async listReplies(feedbackId: string): Promise<FeedbackReply[]> {
    return this.feedbackRepo.listRepliesByFeedbackId(feedbackId);
  }

  async notifyFeedback(params: {
    deliveryId: string;
    recipientEmails: string | string[];
    authorName: string;
    commentText: string;
    timestampSeconds?: number | null;
    assetTitle?: string;
    origin?: string;
  }) {
    if (!this.notificationService) return;
    return this.notificationService.notifyNewFeedback(params).catch((err) => {
      console.error("[FeedbackService] Failed to notify new feedback:", err);
    });
  }

  async getThreadedFeedback(assetVersionId: string): Promise<Feedback[]> {
    return this.feedbackRepo.listByAssetVersionId(assetVersionId);
  }

  async toggleResolved(id: string, isResolved: boolean): Promise<Feedback> {
    return this.feedbackRepo.resolve(id, isResolved);
  }

  async deleteFeedback(id: string): Promise<void> {
    return this.feedbackRepo.delete(id);
  }

  async listFeedbackForVersions(assetVersionIds: string[]): Promise<Feedback[]> {
    return this.feedbackRepo.listByAssetVersionIds(assetVersionIds);
  }
}

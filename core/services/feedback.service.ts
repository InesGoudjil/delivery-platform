import { Feedback, FeedbackReply } from '@/core/entities/feedback';
import { IFeedbackRepository, CreateFeedbackDTO, CreateFeedbackReplyDTO } from '@/core/repositories/feedback.repository';


export interface FeedbackThread extends Feedback {
  replies: FeedbackReply[];
}

export class FeedbackService {
  constructor(private readonly feedbackRepo: IFeedbackRepository) {}

  async addFeedback(dto: CreateFeedbackDTO): Promise<Feedback> {
    return this.feedbackRepo.create(dto);
  }

  async getFeedback(id: string): Promise<Feedback | null> {
    return this.feedbackRepo.findById(id);
  }

  async getReply(id: string): Promise<FeedbackReply | null> {
    return this.feedbackRepo.findReplyById(id);
  }

  async addReply(dto: CreateFeedbackReplyDTO): Promise<FeedbackReply> {
    return this.feedbackRepo.createReply(dto);
  }

  async updateReply(replyId: string, commentText: string): Promise<FeedbackReply> {
    if (!this.feedbackRepo.updateReply) {
      throw new Error('updateReply not supported by repository');
    }
    return this.feedbackRepo.updateReply(replyId, commentText);
  }

  async deleteReply(replyId: string): Promise<void> {
    return this.feedbackRepo.deleteReply(replyId);
  }

  async listReplies(feedbackId: string): Promise<FeedbackReply[]> {
    return this.feedbackRepo.listRepliesByFeedbackId(feedbackId);
  }

  async getThreadedFeedback(assetVersionId: string): Promise<Feedback[]> {
    return this.feedbackRepo.listByAssetVersionId(assetVersionId);
  }

  async toggleResolved(id: string, isResolved: boolean): Promise<Feedback> {
    return this.feedbackRepo.resolve(id, isResolved);
  }

  async updateFeedback(id: string, commentText: string): Promise<Feedback> {
    if (!this.feedbackRepo.update) {
      throw new Error('update not supported by repository');
    }
    return this.feedbackRepo.update(id, { commentText });
  }

  async deleteFeedback(id: string): Promise<void> {
    return this.feedbackRepo.delete(id);
  }

  async listFeedbackForVersions(assetVersionIds: string[]): Promise<Feedback[]> {
    return this.feedbackRepo.listByAssetVersionIds(assetVersionIds);
  }
}

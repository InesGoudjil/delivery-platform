import { Feedback } from '@/core/entities/feedback';
import { IFeedbackRepository, CreateFeedbackDTO } from '@/core/repositories/feedback.repository';

export interface FeedbackThread extends Feedback {
  replies: Feedback[];
}

export class FeedbackService {
  constructor(private readonly feedbackRepo: IFeedbackRepository) {}

  async addFeedback(dto: CreateFeedbackDTO): Promise<Feedback> {
    return this.feedbackRepo.create(dto);
  }

  async getThreadedFeedback(assetVersionId: string): Promise<FeedbackThread[]> {
    const allFeedback = await this.feedbackRepo.listByAssetVersionId(assetVersionId);

    const rootFeedback: FeedbackThread[] = [];
    const feedbackMap = new Map<string, FeedbackThread>();

    allFeedback.forEach((item) => {
      const thread: FeedbackThread = { ...item, replies: [] };
      feedbackMap.set(item.id, thread);
    });

    allFeedback.forEach((item) => {
      if (item.parentId && feedbackMap.has(item.parentId)) {
        feedbackMap.get(item.parentId)!.replies.push(item);
      } else {
        const thread = feedbackMap.get(item.id);
        if (thread) rootFeedback.push(thread);
      }
    });

    return rootFeedback;
  }

  async toggleResolved(id: string, isResolved: boolean): Promise<Feedback> {
    return this.feedbackRepo.resolve(id, isResolved);
  }

  async deleteFeedback(id: string): Promise<void> {
    return this.feedbackRepo.delete(id);
  }
}

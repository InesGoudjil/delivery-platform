import { Feedback } from '../entities/feedback';

export interface CreateFeedbackDTO {
  assetVersionId: string;
  authorUserId?: string;
  authorName: string;
  commentText: string;
  timestampSeconds?: number;
  parentId?: string;
}

export interface IFeedbackRepository {
  create(data: CreateFeedbackDTO): Promise<Feedback>;
  getByAssetVersionId(assetVersionId: string): Promise<Feedback[]>;
  toggleResolve(id: string, isResolved: boolean): Promise<Feedback>;
}

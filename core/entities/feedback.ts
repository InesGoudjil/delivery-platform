export interface FeedbackReply {
  id: string;
  feedbackId: string;
  authorUserId?: string | null;
  authorName: string;
  commentText: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  assetVersionId: string;
  authorUserId?: string | null;
  authorName: string;
  commentText: string;
  timestampSeconds?: number | null;
  isResolved: boolean;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: FeedbackReply[];
}

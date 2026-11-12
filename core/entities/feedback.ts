export interface FeedbackReply {
  id: string;
  feedbackId: string;
  authorUserId?: string | null;
  /** Hash of the client-room guest key that wrote it (server-side only; never sent to browsers). */
  guestAuthorKeyHash?: string | null;
  authorName: string;
  commentText: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  assetVersionId: string;
  authorUserId?: string | null;
  /** Hash of the client-room guest key that wrote it (server-side only; never sent to browsers). */
  guestAuthorKeyHash?: string | null;
  authorName: string;
  commentText: string;
  timestampSeconds?: number | null;
  isResolved: boolean;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: FeedbackReply[];
}

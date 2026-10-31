import { z } from "zod";

export const addFeedbackSchema = z.object({
  assetVersionId: z.string().trim().min(1, "Asset version ID is required"),
  authorName: z.string().trim().max(100).optional(),
  commentText: z
    .string()
    .trim()
    .min(1, "Feedback comment cannot be empty")
    .max(2000, "Comment cannot exceed 2000 characters"),
  timestampSeconds: z.number().nonnegative().nullable().optional(),
  parentId: z.string().trim().optional(),
  shareToken: z.string().trim().optional(),
  deliveryId: z.string().trim().optional(),
});

export type AddFeedbackInput = z.infer<typeof addFeedbackSchema>;

export const addFeedbackReplySchema = z.object({
  feedbackId: z.string().trim().min(1, "Feedback ID is required"),
  commentText: z
    .string()
    .trim()
    .min(1, "Reply comment cannot be empty")
    .max(2000, "Reply cannot exceed 2000 characters"),
  authorName: z.string().trim().max(100).optional(),
  shareToken: z.string().trim().optional(),
  deliveryId: z.string().trim().optional(),
});

export type AddFeedbackReplyInput = z.infer<typeof addFeedbackReplySchema>;

export const toggleFeedbackResolvedSchema = z.object({
  feedbackId: z.string().trim().min(1, "Feedback ID is required"),
  isResolved: z.boolean(),
  shareToken: z.string().trim().optional(),
  deliveryId: z.string().trim().optional(),
});

export type ToggleFeedbackResolvedInput = z.infer<typeof toggleFeedbackResolvedSchema>;

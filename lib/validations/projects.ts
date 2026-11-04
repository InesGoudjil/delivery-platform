import { z } from "zod";

export const createWorkspaceProjectSchema = z.object({
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters")
    .default("Untitled Delivery"),
  description: z.string().trim().max(5000).optional(),
});

export type CreateWorkspaceProjectInput = z.infer<typeof createWorkspaceProjectSchema>;

export const createShowcaseProjectSchema = z.object({
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  portfolioId: z.string().trim().min(1, "Portfolio ID is required"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters"),
  clientName: z.string().trim().max(255).optional(),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().max(100).default("Commercial"),
  coverAssetUrl: z.string().trim().optional(),
  assetIds: z.array(z.string()).optional(),
});

export type CreateShowcaseProjectInput = z.infer<typeof createShowcaseProjectSchema>;

import { z } from "zod";
import { emailSchema } from "./common";

export const updateUserRoleSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
  role: z.enum(["admin", "user"]),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const createCreatorAccountSchema = z.object({
  email: emailSchema,
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100),
  role: z.enum(["admin", "user"]).default("user"),
});

export type CreateCreatorAccountInput = z.infer<typeof createCreatorAccountSchema>;

export const updateWorkspacePlanSchema = z.object({
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  planId: z.string().trim().min(1, "Plan ID is required"),
  status: z.enum(["trialing", "active", "past_due", "canceled"]).default("active"),
});

export type UpdateWorkspacePlanInput = z.infer<typeof updateWorkspacePlanSchema>;

export const updateWorkspaceFeaturesSchema = z.object({
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  features: z.record(z.string(), z.any()),
});

export type UpdateWorkspaceFeaturesInput = z.infer<typeof updateWorkspaceFeaturesSchema>;

export const createPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Plan name must be at least 2 characters")
    .max(100),
  slug: z
    .string()
    .trim()
    .min(2, "Plan slug must be at least 2 characters")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens"),
  priceUsd: z.coerce.number().nonnegative().default(0),
  storageGb: z.coerce.number().int().min(1).default(500),
  clientLinks: z.coerce.number().int().default(-1),
  whatsappDelivery: z.boolean().default(false),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  name: z.string().trim().min(1).optional(),
  priceCents: z.number().int().nonnegative().optional(),
  currency: z.string().max(10).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  features: z.record(z.string(), z.any()).optional(),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

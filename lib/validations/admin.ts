import { z } from "zod";

/*
 * Inputs of the platform-admin actions (app/actions/admin.ts). createPlatformAdminAction() adds
 * the required `reason` to each, so it isn't repeated here.
 */

const recordId = (label: string) => z.guid(`${label} isn't a valid id.`);

export const updateUserRoleSchema = z.object({
  userId: recordId("User"),
  role: z.enum(["admin", "user"]),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateWorkspacePlanSchema = z.object({
  workspaceId: recordId("Workspace"),
  planId: recordId("Plan"),
  status: z.enum(["trialing", "active", "past_due", "canceled"]).default("active"),
});

export type UpdateWorkspacePlanInput = z.infer<typeof updateWorkspacePlanSchema>;

/**
 * The feature values an admin may set, typed: unknown keys are rejected, so a typo can't become a
 * silent override. -1 means unlimited where the feature allows it.
 */
export const featureValuesSchema = z
  .object({
    storage_gb: z.number().int().min(1).max(100_000).optional(),
    client_links: z.number().int().min(-1).max(100_000).optional(),
    portfolio_videos: z.number().int().min(-1).max(100_000).optional(),
    team_seats: z.number().int().min(1).max(1_000).optional(),
    languages: z.array(z.enum(["ar", "en"])).min(1).optional(),
    whatsapp_delivery: z.boolean().optional(),
    password_protected: z.boolean().optional(),
    watermark: z.boolean().optional(),
    branding: z.boolean().optional(),
    download_notifications: z.boolean().optional(),
    priority_support: z.boolean().optional(),
    silo_archive: z.boolean().optional(),
    white_label: z.boolean().optional(),
  })
  .strict();

export type FeatureValuesInput = z.infer<typeof featureValuesSchema>;

export const updateWorkspaceFeaturesSchema = z.object({
  workspaceId: recordId("Workspace"),
  /** Values to set, merged into the workspace's existing overrides. */
  set: featureValuesSchema.default({}),
  /** Override keys to remove, so the plan's value applies again. Any key, so old junk can be cleared. */
  remove: z.array(z.string().trim().min(1).max(64)).max(50).default([]),
});

export type UpdateWorkspaceFeaturesInput = z.infer<typeof updateWorkspaceFeaturesSchema>;

export const createPlanSchema = z.object({
  name: z.string().trim().min(2, "Plan name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Plan slug must be at least 2 characters")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, digits and hyphens"),
  priceUsd: z.coerce.number().nonnegative().max(100_000).default(0),
  storageGb: z.coerce.number().int().min(1).max(100_000).default(500),
  clientLinks: z.coerce.number().int().min(-1).max(100_000).default(-1),
  whatsappDelivery: z.boolean().default(false),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  planId: recordId("Plan"),
  name: z.string().trim().min(1).max(100).optional(),
  priceCents: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  features: featureValuesSchema.optional(),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export const deletePlanSchema = z.object({
  planId: recordId("Plan"),
});

export type DeletePlanInput = z.infer<typeof deletePlanSchema>;

export const userTargetSchema = z.object({
  userId: recordId("User"),
});

export type UserTargetInput = z.infer<typeof userTargetSchema>;

export const banUserSchema = z.object({
  userId: recordId("User"),
  duration: z.enum(["24h", "7d", "30d", "indefinite"]),
});

export type BanUserInput = z.infer<typeof banUserSchema>;

export const suspendWorkspaceSchema = z.object({
  workspaceId: recordId("Workspace"),
  /** Typed by the admin: must match the workspace's slug, so the wrong one can't be suspended by a slip. */
  confirmSlug: z.string().trim().min(1, "Type the workspace's slug to confirm."),
});

export type SuspendWorkspaceInput = z.infer<typeof suspendWorkspaceSchema>;

export const workspaceTargetSchema = z.object({
  workspaceId: recordId("Workspace"),
});

export type WorkspaceTargetInput = z.infer<typeof workspaceTargetSchema>;

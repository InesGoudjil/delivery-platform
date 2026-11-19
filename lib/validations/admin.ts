import { z } from "zod";
import { YEARLY_SLUG_SUFFIX } from "@/core/entities/plan";
import { emailSchema } from "./common";

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
    extended_link_expiry: z.boolean().optional(),
    share_links_per_delivery: z.number().int().min(-1).max(1_000).optional(),
  })
  .strict();

export type FeatureValuesInput = z.infer<typeof featureValuesSchema>;

/**
 * A plan's whole feature set, as the plan editor saves it: the limits are required, so a plan
 * can't be saved half set up. Left-out flags are off; a left-out share_links_per_delivery and
 * extended_link_expiry follow their tier defaults (lib/share-links).
 */
export const planFeaturesSchema = featureValuesSchema.required({
  storage_gb: true,
  client_links: true,
  portfolio_videos: true,
  team_seats: true,
  languages: true,
});

export type PlanFeaturesInput = z.infer<typeof planFeaturesSchema>;

const planName = z.string().trim().min(2, "Plan name must be at least 2 characters").max(100);
const priceUsd = z.coerce.number().nonnegative().max(100_000);
/** A yearly price, or null for none. */
const yearlyPriceUsd = z.coerce.number().positive("Enter the yearly price.").max(1_000_000).nullable();
const sortOrder = z.coerce.number().int().min(0).max(1_000);

export const updateWorkspaceFeaturesSchema = z.object({
  workspaceId: recordId("Workspace"),
  /** Values to set, merged into the workspace's existing overrides. */
  set: featureValuesSchema.default({}),
  /** Override keys to remove, so the plan's value applies again. Any key, so old junk can be cleared. */
  remove: z.array(z.string().trim().min(1).max(64)).max(50).default([]),
});

export type UpdateWorkspaceFeaturesInput = z.infer<typeof updateWorkspaceFeaturesSchema>;

export const createPlanSchema = z.object({
  name: planName,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Plan slug must be at least 2 characters")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, digits and hyphens")
    .refine(
      (slug) => !slug.endsWith(YEARLY_SLUG_SUFFIX),
      `Slugs ending in "${YEARLY_SLUG_SUFFIX}" are for yearly prices. Set a yearly price on the plan instead.`
    ),
  priceUsd: priceUsd.default(0),
  /** Sells the plan yearly too, at this price. */
  yearlyPriceUsd: yearlyPriceUsd.default(null),
  sortOrder: sortOrder.default(10),
  isActive: z.boolean().default(true),
  features: planFeaturesSchema,
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

/** Adds the yearly twin of a paid monthly plan (see YEARLY_SLUG_SUFFIX in core/entities/plan). */
export const createYearlyPlanSchema = z.object({
  planId: recordId("Plan"),
  yearlyPriceUsd: z.coerce.number().positive("Enter the yearly price.").max(1_000_000),
});

export type CreateYearlyPlanInput = z.infer<typeof createYearlyPlanSchema>;

export const updatePlanSchema = z.object({
  planId: recordId("Plan"),
  name: z.string().trim().min(1).max(100).optional(),
  priceCents: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  features: featureValuesSchema.optional(),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

/**
 * Everything about a tier, saved at once from the plan editor: the monthly plan and its yearly
 * twin (see YEARLY_SLUG_SUFFIX). `yearlyPriceUsd: null` stops selling it yearly.
 */
export const savePlanTierSchema = z.object({
  /** The tier's monthly plan. */
  planId: recordId("Plan"),
  name: planName,
  priceUsd,
  yearlyPriceUsd,
  sortOrder,
  isActive: z.boolean(),
  features: planFeaturesSchema,
});

export type SavePlanTierInput = z.infer<typeof savePlanTierSchema>;

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

/** The demo room (Admin -> Site settings). Send only what changes. */
export const updateDemoRoomSchema = z.object({
  /** The delivery's review link (…/deliver/<token>) or bare share token. An empty string removes the demo room. */
  reviewLink: z.string().trim().max(500, "That link is too long.").optional(),
  /** Whether the landing page links to /demo. */
  showOnLanding: z.boolean().optional(),
});

export type UpdateDemoRoomInput = z.infer<typeof updateDemoRoomSchema>;

/** Admin → Users → New client: an account for someone the team is in touch with. */
export const createClientAccountSchema = z.object({
  fullName: z.string().trim().min(2, "Enter their full name.").max(100, "Keep the name under 100 characters."),
  email: emailSchema.max(254, "That email address is too long.").transform((email) => email.toLowerCase()),
  /** Their studio's name, for the workspace. Empty: the workspace is named after them. */
  studioName: z.string().trim().max(80, "Keep the studio name under 80 characters.").default(""),
  /** False when the admin will send the setup link themselves (WhatsApp, say). */
  sendEmail: z.boolean().default(true),
});

export type CreateClientAccountInput = z.infer<typeof createClientAccountSchema>;

export const sendSetupLinkSchema = z.object({
  userId: recordId("User"),
  sendEmail: z.boolean().default(true),
});

export type SendSetupLinkInput = z.infer<typeof sendSetupLinkSchema>;

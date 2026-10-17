import { z } from "zod";
import { hexColorSchema } from "./common";

export const createTeamWorkspaceSchema = z.object({
  brandName: z
    .string()
    .trim()
    .min(2, "Workspace or studio name must be at least 2 characters")
    .max(100, "Studio name cannot exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase alphanumeric characters and single hyphens"
    )
    .optional()
    .or(z.literal("")),
  accentColor: hexColorSchema.default("#f5551d"),
  defaultLanguage: z.enum(["ar", "en"]).default("ar"),
});

export type CreateTeamWorkspaceInput = z.infer<typeof createTeamWorkspaceSchema>;

export const switchWorkspacePlanSchema = z.object({
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  planSlug: z.string().trim().min(1, "Plan slug is required"),
});

export type SwitchWorkspacePlanInput = z.infer<typeof switchWorkspacePlanSchema>;

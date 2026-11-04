import { z } from "zod";

export const stripeCheckoutSchema = z.object({
  workspaceId: z.string().trim().min(1, "workspaceId is required"),
  workspaceSlug: z.string().trim().optional(),
  planId: z.string().trim().optional(),
  type: z.enum(["subscription", "storage_addon"]).default("subscription"),
});

export type StripeCheckoutInput = z.infer<typeof stripeCheckoutSchema>;

export const stripePortalSchema = z.object({
  workspaceId: z.string().trim().min(1, "workspaceId is required"),
  workspaceSlug: z.string().trim().optional(),
});

export type StripePortalInput = z.infer<typeof stripePortalSchema>;

import { z } from "zod";
import { hexColorSchema } from "./common";

export const updatePortfolioSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(255).optional(),
  bio: z.string().trim().max(3000, "Bio cannot exceed 3000 characters").nullable().optional(),
  coverAssetUrl: z.string().trim().nullable().optional(),
  socialLinks: z.record(z.string(), z.string().optional()).optional(),
  isPublished: z.boolean().optional(),
  appearance: z.any().optional(),
  experience: z.array(z.any()).optional(),
  whatsappNumber: z.string().trim().max(50).nullable().optional(),
  stats: z.any().optional(),
  layoutTemplate: z.string().optional(),
});

export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;

export const updateBrandingSchema = z.object({
  brandName: z.string().trim().min(1, "Studio brand name cannot be empty").max(100).optional(),
  accentColor: hexColorSchema.optional(),
  logoUrl: z.string().trim().nullable().optional(),
  avatarUrl: z.string().trim().nullable().optional(),
  bio: z.string().trim().max(3000).nullable().optional(),
  coverAssetUrl: z.string().trim().nullable().optional(),
  heroCover: z.any().optional(),
  whatsappNumber: z.string().trim().max(50).nullable().optional(),
  experience: z.array(z.any()).optional(),
  stats: z.any().optional(),
  slug: z.string().trim().optional(),
});

export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;

export const toggleFeaturedItemSchema = z.object({
  portfolioId: z.string().trim().min(1, "Portfolio ID is required"),
  itemId: z.string().trim().min(1, "Item ID is required"),
  itemType: z.enum(["project", "asset"]),
  isFeatured: z.boolean(),
});

export type ToggleFeaturedItemInput = z.infer<typeof toggleFeaturedItemSchema>;

export const reorderFeaturedItemsSchema = z.object({
  portfolioId: z.string().trim().min(1, "Portfolio ID is required"),
  itemIds: z.array(z.string().trim()),
});

export type ReorderFeaturedItemsInput = z.infer<typeof reorderFeaturedItemsSchema>;

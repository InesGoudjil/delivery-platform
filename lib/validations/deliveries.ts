import { z } from "zod";
import { emailSchema } from "./common";
import type { DeliveryStatus } from "@/core/entities/delivery";

export const deliveryStatusSchema = z.enum(["draft", "in_review", "approved", "archived"]);

export const verifyDeliveryPasscodeSchema = z.object({
  shareToken: z.string().trim().min(1, "Share token is required"),
  passcode: z.string().default(""),
  isCreatorBypass: z.boolean().default(false),
});

export type VerifyDeliveryPasscodeInput = z.infer<typeof verifyDeliveryPasscodeSchema>;

export const createDeliverySchema = z.object({
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  title: z
    .string()
    .trim()
    .min(1, "Delivery project title is required")
    .max(255, "Title cannot exceed 255 characters")
    .default("Untitled Delivery"),
  description: z.string().trim().max(5000).optional(),
  clientNameOrId: z.string().trim().max(255).optional(),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

export const updateDeliveryDetailsSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(255).optional(),
  description: z.string().trim().max(5000).optional(),
  clientName: z.string().trim().max(255).optional(),
  status: deliveryStatusSchema.optional(),
  location: z.string().trim().max(255).optional(),
  deliveryDate: z.string().trim().max(100).optional(),
});

export type UpdateDeliveryDetailsInput = z.infer<typeof updateDeliveryDetailsSchema>;

export const deliveryAppearanceSchema = z
  .object({
    cardSize: z.enum(["S", "M", "L"]).optional(),
    aspectRatioSetting: z.string().optional(),
    thumbnailScale: z.string().optional(),
    showCardInfo: z.boolean().optional(),
    watermarkMedia: z.boolean().optional(),
    coverThumbnailUrl: z.string().nullable().optional(),
  })
  .passthrough();

export type DeliveryAppearanceInput = z.infer<typeof deliveryAppearanceSchema>;

export const updateDeliverySecuritySchema = z.object({
  passphrase: z.string().nullable().optional(),
  isDownloadAllowed: z.boolean().optional(),
  notifyOnDownload: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
});

export type UpdateDeliverySecurityInput = z.infer<typeof updateDeliverySecuritySchema>;

export const sendDeliveryEmailSchema = z.object({
  deliveryId: z.string().trim().min(1, "Delivery ID is required"),
  recipientEmail: emailSchema,
  customMessage: z.string().trim().max(3000).optional(),
});

export type SendDeliveryEmailInput = z.infer<typeof sendDeliveryEmailSchema>;

export const loadMoreDeliveryAssetsSchema = z
  .object({
    deliveryId: z.string().optional(),
    shareToken: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(24),
    filter: z.enum(["ALL", "VIDEOS", "PHOTOS"]).default("ALL"),
  })
  .refine((data) => Boolean(data.deliveryId || data.shareToken), {
    message: "Either deliveryId or shareToken is required",
  });

export type LoadMoreDeliveryAssetsInput = z.infer<typeof loadMoreDeliveryAssetsSchema>;

export const getDeliveryDownloadManifestSchema = z
  .object({
    deliveryId: z.string().optional(),
    shareToken: z.string().optional(),
  })
  .refine((data) => Boolean(data.deliveryId || data.shareToken), {
    message: "Either deliveryId or shareToken is required",
  });

export type GetDeliveryDownloadManifestInput = z.infer<typeof getDeliveryDownloadManifestSchema>;

export const recordClientDownloadSchema = z.object({
  deliveryId: z.string().trim().min(1, "Delivery ID is required"),
  assetTitle: z.string().optional(),
  downloadedCount: z.number().int().nonnegative().optional(),
});

export type RecordClientDownloadInput = z.infer<typeof recordClientDownloadSchema>;

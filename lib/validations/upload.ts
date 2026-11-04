import { z } from "zod";
import type { AssetType } from "@/core/entities/asset";

export const assetTypeSchema = z.enum([
  "video",
  "photo_gallery",
]);

export const requestUploadSchema = z.object({
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  projectId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  assetId: z.string().trim().nullable().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Asset title is required")
    .max(255, "Asset title cannot exceed 255 characters"),
  filename: z
    .string()
    .trim()
    .min(1, "Filename is required")
    .max(500, "Filename is too long"),
  fileSizeBytes: z
    .number()
    .nonnegative("File size cannot be negative"),
  assetType: assetTypeSchema.default("video"),
  aspectRatio: z.string().trim().max(32).optional(),
  maxDurationSeconds: z.number().positive().optional(),
  category: z.string().trim().max(100).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export type RequestUploadInput = z.infer<typeof requestUploadSchema>;

export const confirmUploadSchema = z.object({
  assetVersionId: z.string().trim().min(1, "Asset version ID is required"),
  providerUid: z.string().trim().min(1, "Provider UID is required"),
  durationSeconds: z.number().positive().optional(),
  fileSizeBytes: z.number().nonnegative().optional(),
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export const checkAssetStatusSchema = z.object({
  providerUid: z.string().trim().min(1, "Provider UID is required"),
});

export type CheckAssetStatusInput = z.infer<typeof checkAssetStatusSchema>;

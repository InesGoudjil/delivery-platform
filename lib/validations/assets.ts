import { z } from "zod";

export const deleteAssetOptionsSchema = z.object({
  deliveryId: z.string().optional(),
  workspaceSlug: z.string().optional(),
  portfolioId: z.string().optional(),
  projectId: z.string().optional(),
});

export type DeleteAssetOptionsInput = z.infer<typeof deleteAssetOptionsSchema>;

export const updateAssetDataSchema = z.object({
  title: z.string().trim().max(255).optional(),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().max(100).optional(),
  /**
   * An image in the workspace's storage (key or URL), a frame of the file's own Stream video,
   * or a cropped image as a data URL (stored server-side, at most 5 MB). Checked by
   * AssetUploadService.setVersionThumbnail; anything else is refused.
   */
  thumbnailUrl: z.string().trim().max(7_000_000, "The thumbnail image is too large.").optional(),
  coverAssetUrl: z.string().trim().optional(),
  aspectRatio: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional(),
});

export type UpdateAssetDataInput = z.infer<typeof updateAssetDataSchema>;

export const updateAssetOptionsSchema = z.object({
  deliveryId: z.string().optional(),
  isProject: z.boolean().optional(),
  workspaceSlug: z.string().optional(),
  portfolioId: z.string().optional(),
});

export type UpdateAssetOptionsInput = z.infer<typeof updateAssetOptionsSchema>;

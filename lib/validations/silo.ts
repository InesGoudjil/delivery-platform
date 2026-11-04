import { z } from "zod";

export const glacierTierSchema = z.enum(["Bulk", "Standard", "Expedited"]);

export const archiveDeliveryToSiloSchema = z.object({
  deliveryId: z.string().trim().min(1, "Delivery ID is required"),
});

export type ArchiveDeliveryToSiloInput = z.infer<typeof archiveDeliveryToSiloSchema>;

export const restoreDeliveryFromSiloSchema = z.object({
  deliveryId: z.string().trim().min(1, "Delivery ID is required"),
  tier: glacierTierSchema.default("Bulk"),
});

export type RestoreDeliveryFromSiloInput = z.infer<typeof restoreDeliveryFromSiloSchema>;

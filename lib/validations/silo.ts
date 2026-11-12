import { z } from "zod";

// Glacier Deep Archive restores are Bulk (up to 48 h) or Standard (up to 12 h); it has no Expedited tier.
export const glacierTierSchema = z.enum(["Bulk", "Standard"]);

export const restoreDeliveryFromSiloSchema = z.object({
  deliveryId: z.string().trim().min(1, "Delivery ID is required"),
  tier: glacierTierSchema.default("Bulk"),
});

export type RestoreDeliveryFromSiloInput = z.infer<typeof restoreDeliveryFromSiloSchema>;

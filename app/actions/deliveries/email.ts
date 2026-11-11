"use server";

import { revalidatePath } from "next/cache";
import { requireDeliveryAccess } from "@/core/security/guards";
import { sendDeliveryEmailSchema, safeValidate } from "@/lib/validations";
import { resolveRequestOrigin } from "./helpers";
import { normalizeActionError } from "../safe-action";

export async function sendDeliveryEmailAction(
  deliveryId: string,
  recipientEmail: string,
  customMessage?: string
) {
  try {
    const validated = safeValidate(sendDeliveryEmailSchema, {
      deliveryId,
      recipientEmail,
      customMessage,
    });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { services } = await requireDeliveryAccess(validated.data.deliveryId, "editor");
    const origin = await resolveRequestOrigin();

    const res = await services.delivery.sendDeliveryEmail({
      deliveryId: validated.data.deliveryId,
      recipientEmail: validated.data.recipientEmail.toLowerCase(),
      customMessage: validated.data.customMessage,
      origin,
    });

    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    return { success: res.success, log: res.log, error: res.error };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Failed to send delivery email.") };
  }
}

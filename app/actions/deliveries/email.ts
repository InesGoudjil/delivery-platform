"use server";

import { revalidatePath } from "next/cache";
import { requireDeliveryAccess } from "@/core/security/guards";
import { sendDeliveryEmailSchema, safeValidate } from "@/lib/validations";
import { resolveRequestOrigin, sendableShareLink } from "./helpers";
import { normalizeActionError } from "../safe-action";

/** Emails a review link: `linkId` picks one of the delivery's share links, else its primary link. */
export async function sendDeliveryEmailAction(
  deliveryId: string,
  recipientEmail: string,
  customMessage?: string,
  linkId?: string | null
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

    const { services, user } = await requireDeliveryAccess(validated.data.deliveryId, "editor");
    const origin = await resolveRequestOrigin();
    const link = await sendableShareLink(services, validated.data.deliveryId, linkId);

    const res = await services.delivery.sendDeliveryEmail({
      deliveryId: validated.data.deliveryId,
      recipientEmail: validated.data.recipientEmail.toLowerCase(),
      customMessage: validated.data.customMessage,
      origin,
      // The client's replies go to the person who sent the link.
      replyTo: user.email ?? null,
      link: link ? { token: link.token, hasPasscode: link.hasPasscode } : undefined,
    });

    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    return { success: res.success, log: res.log, error: res.error };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Failed to send delivery email.") };
  }
}

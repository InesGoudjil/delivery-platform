"use server";

import { revalidatePath } from "next/cache";
import { getServerAdminServices } from "@/core/server";
import { requireDeliveryAccess } from "@/core/security/guards";
import { checkRateLimit, RATELIMIT_POLICIES } from "@/lib/upstash";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { createScopedLogger } from "@/lib/logger";
import { resolveRequestOrigin } from "./helpers";
import { normalizeActionError } from "../safe-action";

/**
 * Sends a delivery's review link to the client on WhatsApp, from the CineSpace WhatsApp
 * number (Zoho CPaaS). Editors and up, on plans with WhatsApp, and only after the studio
 * member confirms the client agreed to WhatsApp messages; that confirmation is recorded on
 * the delivery's client. The passcode is never sent: share it separately.
 */

const log = createScopedLogger({ actionGroup: "deliveries" });

export async function sendDeliveryWhatsAppAction(
  deliveryId: string,
  input: { phone: string; clientConsent: boolean }
): Promise<{ success: boolean; sentTo?: string; error?: string }> {
  try {
    const { delivery, workspace, user, services } = await requireDeliveryAccess(String(deliveryId || ""), "editor");

    if (input?.clientConsent !== true) {
      return { success: false, error: "Confirm your client agreed to get WhatsApp messages about this delivery first." };
    }
    const phone = normalizePhone(typeof input?.phone === "string" ? input.phone : "");
    if (!phone) {
      return { success: false, error: "Enter the client's WhatsApp number with its country code, e.g. +971 50 123 4567." };
    }
    if (!(await services.subscription.canDeliverWhatsApp(workspace.id))) {
      return { success: false, error: "WhatsApp delivery is available on Basic, Pro, and Studio plans. Please upgrade your plan." };
    }
    if (delivery.expiresAt && new Date(delivery.expiresAt).getTime() <= Date.now()) {
      return { success: false, error: "This review link has expired. Extend it before sending it." };
    }

    const admin = await getServerAdminServices();
    if (!admin.whatsapp.isConfigured()) {
      return { success: false, error: "WhatsApp sending isn't set up for CineSpace yet. Use “Open WhatsApp” to send it from your phone." };
    }

    for (const [policy, id] of [
      [RATELIMIT_POLICIES.whatsappClientSendDelivery, delivery.id],
      [RATELIMIT_POLICIES.whatsappClientSendWorkspace, workspace.id],
    ] as const) {
      const limit = await checkRateLimit({ policy, identifier: [id] });
      if (!limit.success) return { success: false, error: limit.error || "Too many WhatsApp messages. Please try again later." };
    }

    const result = await admin.whatsapp.sendDeliveryToClient({
      deliveryId: delivery.id,
      phone,
      clientId: delivery.clientId ?? null,
      origin: await resolveRequestOrigin(),
    });
    if (!result.success) return { success: false, error: result.error || "Couldn't send the WhatsApp message." };

    if (delivery.clientId) {
      // Written through the member's own session: RLS checks they may edit this client.
      await services.client
        .updateClient(delivery.clientId, { whatsappConsentAt: new Date().toISOString(), whatsappConsentBy: user.id })
        .catch((err) => log.warn({ err, deliveryId: delivery.id }, "Couldn't record the client's WhatsApp consent"));
    }

    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath(`/${workspace.slug}/notifications`);
    return { success: true, sentTo: maskPhone(phone) };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Couldn't send the WhatsApp message.") };
  }
}

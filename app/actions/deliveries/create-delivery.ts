"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceMember } from "@/core/security/guards";
import { createDeliverySchema, safeValidate } from "@/lib/validations";
import { normalizeActionError } from "../safe-action";

export async function createDeliveryAction(
  workspaceId: string,
  title: string,
  description?: string,
  clientNameOrId?: string,
  clientEmail?: string | null,
  clientPhone?: string | null
) {
  try {
    const validated = safeValidate(createDeliverySchema, {
      workspaceId,
      title,
      description,
      clientNameOrId,
      clientEmail,
      clientPhone,
    });
    if (!validated.success) return { error: validated.error };

    const {
      workspaceId: cleanWorkspaceId,
      title: cleanTitle,
      description: cleanDescription,
      clientNameOrId: cleanClientNameOrId,
      clientEmail: cleanClientEmail,
      clientPhone: cleanClientPhone,
    } = validated.data;

    const { services, user } = await requireWorkspaceMember(cleanWorkspaceId, "editor");

    // Enforce active client delivery link quota based on subscription plan
    const eligibility = await services.subscription.canCreateProject(cleanWorkspaceId);
    if (!eligibility.allowed) {
      return {
        error:
          eligibility.reason ||
          "Active client delivery link limit reached. Please upgrade your subscription plan.",
      };
    }

    let clientId: string | undefined = undefined;
    if (cleanClientNameOrId || cleanClientEmail || cleanClientPhone) {
      const isUuid =
        cleanClientNameOrId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          cleanClientNameOrId
        );
      if (isUuid) {
        clientId = cleanClientNameOrId;
      } else {
        const existingClients = await services.client.listClients(cleanWorkspaceId);
        const existingClient = cleanClientNameOrId
          ? existingClients.find((c) => c.name.toLowerCase() === cleanClientNameOrId.toLowerCase())
          : null;
        if (existingClient) {
          clientId = existingClient.id;
          if (cleanClientEmail || cleanClientPhone) {
            await services.client.updateClient(existingClient.id, {
              ...(cleanClientEmail ? { email: cleanClientEmail } : {}),
              ...(cleanClientPhone ? { phoneNumber: cleanClientPhone } : {}),
            });
          }
        } else {
          const newClient = await services.client.createClient({
            workspaceId: cleanWorkspaceId,
            name: cleanClientNameOrId || "Private Client",
            email: cleanClientEmail || null,
            phoneNumber: cleanClientPhone || null,
          });
          clientId = newClient.id;
        }
      }
    }

    // Auto-calculate default expiration date based on workspace security policy if not explicitly set
    let calculatedExpiresAt: string | undefined = undefined;
    try {
      const settings = await services.settings.findByWorkspaceId(cleanWorkspaceId);
      const days = settings?.defaultLinkExpirationDays ?? 30;
      if (days && days > 0) {
        calculatedExpiresAt = new Date(Date.now() + days * 86400000).toISOString();
      }
    } catch {
      // Fallback: no auto-expiration
    }

    const delivery = await services.delivery.createDelivery({
      workspaceId: cleanWorkspaceId,
      title: cleanTitle,
      description: cleanDescription,
      clientId,
      expiresAt: calculatedExpiresAt,
    });

    const workspace = await services.workspace.getWorkspaceById(cleanWorkspaceId);
    if (workspace?.slug) {
      revalidatePath(`/${workspace.slug}/deliveries`);
    }
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    return { success: true, delivery, project: delivery };
  } catch (err: unknown) {
    return { error: normalizeActionError(err, "Failed to create delivery.") };
  }
}

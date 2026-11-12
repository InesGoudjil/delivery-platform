"use server";

import { revalidatePath } from "next/cache";
import { getServerAdminServices, getServerServices } from "@/core/server";
import { requireWorkspaceMember } from "@/core/security/guards";
import { VERIFICATION_TTL_MINUTES } from "@/core/services/whatsapp-notification.service";
import { checkRateLimit, RATELIMIT_POLICIES } from "@/lib/upstash";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { normalizeActionError } from "./safe-action";

/**
 * The studio's WhatsApp number, for admins and owners: request a one-time code on WhatsApp,
 * confirm it, or remove the number. Studio alerts go to the number only once it's verified.
 * The number and its verification are written with the service role (API users can't
 * change them: see the 20261112100000 migration), after the role check here.
 */

const PLAN_ERROR = "WhatsApp alerts are available on Basic, Pro, and Studio plans. Please upgrade your plan.";

type ActionResult<T extends object = object> = { success: boolean; error?: string } & Partial<T>;

async function adminOf(workspaceSlug: string) {
  const services = await getServerServices();
  const workspace = await services.workspace.getWorkspaceBySlug(String(workspaceSlug || "").trim());
  if (!workspace) throw new Error("Workspace not found.");
  await requireWorkspaceMember(workspace.id, "admin");
  return { services, workspace };
}

/** Sends a 6-digit code on WhatsApp to the number the studio wants its alerts on. */
export async function startWhatsAppVerificationAction(
  workspaceSlug: string,
  phone: string
): Promise<ActionResult<{ pendingNumber: string; expiresInMinutes: number }>> {
  try {
    const { services, workspace } = await adminOf(workspaceSlug);
    const normalized = normalizePhone(typeof phone === "string" ? phone : "");
    if (!normalized) {
      return { success: false, error: "Enter a WhatsApp number with its country code, e.g. +971 50 123 4567." };
    }
    if (!(await services.subscription.canDeliverWhatsApp(workspace.id))) return { success: false, error: PLAN_ERROR };

    const limit = await checkRateLimit({ policy: RATELIMIT_POLICIES.whatsappCodeSend, identifier: [workspace.id] });
    if (!limit.success) return { success: false, error: limit.error || "Too many codes requested." };

    const admin = await getServerAdminServices();
    const result = await admin.whatsapp.startVerification(workspace.id, normalized);
    if ("error" in result) return { success: false, error: result.error };

    revalidatePath(`/${workspace.slug}/notifications`);
    return { success: true, pendingNumber: result.maskedNumber, expiresInMinutes: VERIFICATION_TTL_MINUTES };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Couldn't send the code.") };
  }
}

/** Checks the code; on success the number becomes the studio's WhatsApp number. */
export async function confirmWhatsAppVerificationAction(
  workspaceSlug: string,
  code: string
): Promise<ActionResult<{ verifiedNumber: string }>> {
  try {
    const { services, workspace } = await adminOf(workspaceSlug);
    const limit = await checkRateLimit({ policy: RATELIMIT_POLICIES.whatsappCodeCheck, identifier: [workspace.id] });
    if (!limit.success) return { success: false, error: limit.error || "Too many attempts." };

    const admin = await getServerAdminServices();
    const result = await admin.whatsapp.confirmVerification(workspace.id, String(code ?? "").slice(0, 16));
    if ("error" in result) return { success: false, error: result.error };

    // A freshly verified number should get alerts.
    await services.settings.upsert(workspace.id, { whatsappEnabled: true });
    revalidatePath(`/${workspace.slug}/notifications`);
    return { success: true, verifiedNumber: maskPhone(result.number) };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Couldn't check the code.") };
  }
}

/** Stops WhatsApp alerts by forgetting the number (and any pending code). */
export async function removeWhatsAppNumberAction(workspaceSlug: string): Promise<ActionResult> {
  try {
    const { workspace } = await adminOf(workspaceSlug);
    const admin = await getServerAdminServices();
    await admin.whatsapp.removeNumber(workspace.id);
    revalidatePath(`/${workspace.slug}/notifications`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Couldn't remove the number.") };
  }
}

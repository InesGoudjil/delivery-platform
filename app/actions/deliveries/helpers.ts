import { cookies, headers } from "next/headers";
import { getServerServices, getServerAdminServices } from "@/core/server";
import { hasValidDeliveryPasscodeCookie } from "@/lib/security/delivery-token";
import type { Delivery } from "@/core/entities/delivery";

/**
 * Validates access to a delivery cut for either an authenticated workspace member
 * or a verified guest (with valid passcode cookie if required).
 */
export async function requireDeliveryGuestOrMemberAccess(deliveryId: string) {
  const adminServices = await getServerAdminServices();
  const delivery = await adminServices.delivery.getDeliveryById(deliveryId.trim());
  if (!delivery) {
    throw new Error("Delivery cut not found.");
  }

  // Check if caller is authenticated workspace member
  const userServices = await getServerServices();
  const user = await userServices.auth.getCurrentUser();
  if (user) {
    const isMember = await adminServices.member
      .isMember(delivery.workspaceId, user.id)
      .catch(() => false);
    if (isMember) {
      return { delivery, services: adminServices, isMember: true, user };
    }
  }

  // If guest, verify delivery is active and passcode (if required) is verified
  if (delivery.status === "archived") {
    throw new Error("This delivery has been archived.");
  }

  if (delivery.passcodeHash) {
    const cookieStore = await cookies();
    const verified = hasValidDeliveryPasscodeCookie(cookieStore, delivery.shareToken);
    if (!verified) {
      throw new Error("Passcode verification required to perform this action.");
    }
  }

  return { delivery, services: adminServices, isMember: false, user: null };
}

/**
 * Resolves request origin safely from next/headers.
 */
export async function resolveRequestOrigin(fallback = "https://cut.app"): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get("host");
    const proto =
      headerList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
  } catch {
    // fallback
  }
  return fallback;
}

/**
 * Resolves owner and admin notification emails for approvals based on workspace settings.
 */
export async function getApprovalNotificationEmails(
  services: Awaited<ReturnType<typeof getServerAdminServices>>,
  workspaceId: string
): Promise<string[]> {
  try {
    const settings = await services.settings.findByWorkspaceId(workspaceId);
    const shouldNotify = settings ? settings.notifyApprovals : true;
    if (shouldNotify) {
      const members = await services.member.listMembers(workspaceId);
      return members
        .filter((m) => (m.role === "owner" || m.role === "admin") && Boolean(m.email))
        .map((m) => m.email as string);
    }
  } catch {
    // fallback
  }
  return [];
}

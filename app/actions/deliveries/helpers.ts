import { headers } from "next/headers";
import { getServerAdminServices } from "@/core/server";
import { configuredAppOrigin } from "@/lib/app-origin";
import type { NotificationRecipient } from "@/core/services/notification.service";

// Client-room access lives in core/security/client-room.ts (the gate) and
// ./room-access.ts (actions shared by the client room and the studio).

/**
 * The app's own origin, for links in emails. Uses the configured NEXT_PUBLIC_APP_URL; the
 * request's Host header is only a fallback in development, because it's chosen by the
 * caller and a forged one would put someone else's domain in real emails.
 */
export async function resolveRequestOrigin(fallback = "https://cut.app"): Promise<string> {
  const configured = configuredAppOrigin();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    try {
      const headerList = await headers();
      const host = headerList.get("host");
      if (host) return `${host.includes("localhost") ? "http" : "https"}://${host}`;
    } catch {
      // fallback
    }
  }
  return fallback;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The share link the studio is about to send, checked: it's one of this delivery's links, and
 * it's on and not expired. Read with the caller's session (row-level security). Without a
 * link id: undefined, meaning the delivery's primary link.
 */
export async function sendableShareLink(
  services: Awaited<ReturnType<typeof getServerAdminServices>>,
  deliveryId: string,
  linkId?: string | null
): Promise<{ token: string; hasPasscode: boolean; expiresAt: string | null } | undefined> {
  if (!linkId) return undefined;
  if (!UUID.test(linkId)) throw new Error("That link isn't part of this delivery.");
  const link = await services.shareLink.findById(linkId);
  if (!link || link.deliveryId !== deliveryId) throw new Error("That link isn't part of this delivery.");
  if (link.revokedAt) throw new Error("That link is turned off. Turn it back on before sending it.");
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
    throw new Error("That link has expired. Extend it before sending it.");
  }
  return { token: link.token, hasPasscode: Boolean(link.passcodeHash), expiresAt: link.expiresAt };
}

/**
 * Resolves owner and admin notification emails for approvals based on workspace settings.
 */
export async function getApprovalRecipients(
  services: Awaited<ReturnType<typeof getServerAdminServices>>,
  workspaceId: string
): Promise<NotificationRecipient[]> {
  try {
    const settings = await services.settings.findByWorkspaceId(workspaceId);
    const shouldNotify = settings ? settings.notifyApprovals : true;
    if (shouldNotify) {
      return await services.member.listNotificationRecipients(workspaceId, ["owner", "admin"]);
    }
  } catch {
    // fallback
  }
  return [];
}

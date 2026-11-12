import { headers } from "next/headers";
import { getServerAdminServices } from "@/core/server";
import { configuredAppOrigin } from "@/lib/app-origin";

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

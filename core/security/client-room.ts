import { cache } from "react";
import { cookies } from "next/headers";
import { getServerAdminServices, getServerServices } from "@/core/server";
import type { Delivery } from "@/core/entities/delivery";
import { primaryLinkFromDelivery, type ShareLink, type ShareLinkSource } from "@/core/entities/share-link";
import { hasRoomAccess } from "@/lib/security/delivery-token";
import { hasMinRole, type WorkspaceRoleLevel } from "./guards";

/**
 * The one gate for client rooms (/deliver/<share token>).
 *
 * Everything a client-room visitor can reach goes through `getClientRoom` or
 * `requireClientRoom`: the page, every room action and media download. A share link's
 * token is the only way in. A delivery can have several links (share_links), each with its
 * own passcode, expiry and permissions; the visitor gets the rules of the link they came in
 * by. A delivery's id never opens its room, and a new token for a link cuts off everyone
 * who had the old one.
 *
 * Before the share_links migration is applied (or when that table can't be read), the
 * delivery's own columns stand in for its primary link, which they mirror: only primary
 * links open then.
 *
 * A guest gets in when the room is open: not archived, the link not turned off or expired,
 * and either without a passcode or with a valid unlock cookie (bound to the link and passcode).
 * A signed-in member of the studio's workspace can preview any state of their own room
 * except a locked one; they unlock it with one click (the server checks membership).
 *
 * After the gate, room data is read with the service role, so callers must only touch
 * rows that belong to `room.delivery` (see lib/client-room/scope.ts).
 *
 * The site's demo room (the delivery picked in Admin -> Site settings, shown at /demo) is
 * open to anyone, so guests there can only look: the gate refuses their comments,
 * approvals and downloads, whichever link they came in by. The room's page keeps what they
 * do in their browser instead. Members of the demo's workspace use it like any of their rooms.
 */

/** "revoked": the studio turned this link off. "unavailable": the delivery is archived or the studio suspended. */
export type ClientRoomState = "open" | "locked" | "expired" | "revoked" | "unavailable";
/**
 * What a room action is about to do. "manage_comments" resolves or deletes an existing comment
 * or reply: unlike "comment" (writing one), it still works while comments are turned off.
 */
export type ClientRoomNeed = "view" | "comment" | "manage_comments" | "approve" | "download";

export interface ClientRoomMember {
  userId: string;
  email: string | null;
  role: WorkspaceRoleLevel;
}

export type AdminServices = Awaited<ReturnType<typeof getServerAdminServices>>;

export interface ClientRoom {
  /**
   * The delivery as seen through the visitor's link: its share token, passcode hash, expiry,
   * comment, download and download-notice settings are the link's, so code that reads them
   * follows the link. Server-side only: never send it to the browser.
   */
  delivery: Delivery;
  /** The link the visitor came in by. Server-side only (passcode hash, sealed passcode). */
  link: ShareLink;
  /** "delivery": share_links couldn't be read, so `link` is the primary link from the delivery's columns. */
  linkSource: ShareLinkSource;
  state: ClientRoomState;
  /** The studio's workspace is suspended: closed to guests, and read-only for its members. */
  suspended: boolean;
  /** Set when the visitor is a signed-in member of the delivery's workspace. */
  member: ClientRoomMember | null;
  /** Service-role services, for reading and writing this room's rows after the gate. */
  services: AdminServices;
  canView: boolean;
  canComment: boolean;
  canDownload: boolean;
  /** Members by their role (editor and up); guests when the link allows approvals. */
  canApprove: boolean;
  /** This delivery is the site's demo room: guests may look, and nothing they do is saved. */
  isDemo: boolean;
}

/** Why a guest's comment, approval or download in the demo room was refused. */
export const DEMO_ROOM_REFUSAL = "This is a demo room, so nothing you do here is saved or sent to the studio.";

const SHARE_TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

export function isWellFormedShareToken(value: unknown): value is string {
  return typeof value === "string" && SHARE_TOKEN.test(value.trim());
}

export function roomState(delivery: Delivery, hasUnlockCookie: boolean, now: number = Date.now()): ClientRoomState {
  if (delivery.status === "archived" || delivery.siloStatus === "archived" || delivery.siloStatus === "restoring") {
    return "unavailable";
  }
  if (delivery.expiresAt && new Date(delivery.expiresAt).getTime() <= now) return "expired";
  if (delivery.passcodeHash && !hasUnlockCookie) return "locked";
  return "open";
}

async function findWorkspaceMember(workspaceId: string): Promise<ClientRoomMember | null> {
  try {
    // The visitor's own session (cookies), so RLS shows them only their own membership.
    const userServices = await getServerServices();
    const user = await userServices.auth.getCurrentUser();
    if (!user) return null;
    const membership = await userServices.member.getMember(workspaceId, user.id);
    if (!membership?.role) return null;
    return { userId: user.id, email: user.email ?? null, role: membership.role as WorkspaceRoleLevel };
  } catch {
    return null;
  }
}

/**
 * The delivery set as the demo room (site setting demo_room). A failed read counts as no demo
 * room, so client rooms keep working when the settings can't be read (or before the
 * site_settings table exists).
 */
async function findDemoRoomDeliveryId(services: AdminServices): Promise<string | null> {
  try {
    return (await services.siteSettings.get("demo_room")).deliveryId;
  } catch {
    return null;
  }
}

/** True when this delivery is the site's demo room, where guests can't download. */
export async function isDemoRoomDelivery(services: AdminServices, deliveryId: string): Promise<boolean> {
  return (await findDemoRoomDeliveryId(services)) === deliveryId;
}

/**
 * The link with this token and its delivery. When share_links can't be read (the migration
 * isn't applied yet, or the read failed), the delivery's own columns stand in for its primary
 * link, which they mirror: only primary links open then, with the same rules.
 */
async function findRoomLink(
  services: AdminServices,
  token: string
): Promise<{ link: ShareLink; delivery: Delivery; source: ShareLinkSource } | null> {
  try {
    const found = await services.shareLink.findByToken(token);
    if (!found || found.link.token !== token) return null;
    return { ...found, source: "table" };
  } catch {
    const delivery = await services.delivery.getDeliveryByShareToken(token, { allowExpired: true });
    if (!delivery || delivery.shareToken !== token) return null;
    return { link: primaryLinkFromDelivery(delivery), delivery, source: "delivery" };
  }
}

/** The delivery with the link's token, passcode, expiry and permissions in place of its own columns. */
function deliveryThroughLink(delivery: Delivery, link: ShareLink): Delivery {
  return {
    ...delivery,
    shareToken: link.token,
    passcodeHash: link.passcodeHash,
    expiresAt: link.expiresAt,
    isCommentAllowed: link.canComment,
    isDownloadAllowed: link.canDownload,
    notifyOnDownload: link.notifyOnDownload,
  };
}

/**
 * Looks up a room by a share link's token. Returns null when the token matches no link.
 * Cached per request while rendering, so the room page and its metadata share one lookup
 * (outside a render, such as in actions and API routes, every call looks it up again).
 */
export const getClientRoom = cache(async (shareToken: string): Promise<ClientRoom | null> => {
  if (!isWellFormedShareToken(shareToken)) return null;
  const token = shareToken.trim();

  // Rooms are rendered per request (they read the unlock cookie), so their queries are logged
  // with the request.
  const services = await getServerAdminServices({ request: true });
  const found = await findRoomLink(services, token);
  if (!found) return null;
  const { link, source } = found;
  const delivery = deliveryThroughLink(found.delivery, link);

  const [member, cookieStore, workspace, demoDeliveryId] = await Promise.all([
    findWorkspaceMember(delivery.workspaceId),
    cookies(),
    services.workspace.getWorkspaceById(delivery.workspaceId),
    findDemoRoomDeliveryId(services),
  ]);
  // A suspended studio's links show as unavailable; its members can still look at their own room.
  const suspended = Boolean(workspace?.suspendedAt);
  const fromDelivery = roomState(delivery, hasRoomAccess(cookieStore, delivery));
  const state: ClientRoomState = suspended
    ? "unavailable"
    : fromDelivery !== "unavailable" && link.revokedAt
      ? "revoked"
      : fromDelivery;
  const isDemo = demoDeliveryId === delivery.id;

  const canView = state === "open" || (member !== null && state !== "locked");
  return {
    delivery,
    link,
    linkSource: source,
    state,
    suspended,
    member,
    services,
    canView,
    canComment: canView && (member !== null || delivery.isCommentAllowed !== false),
    canDownload: canView && mayDownload(delivery, member, isDemo),
    canApprove: canView && mayApprove(link, member, isDemo),
    isDemo,
  };
});

/** Members always may; guests when the studio turned downloads on, and never in the demo room. */
function mayDownload(delivery: Delivery, member: ClientRoomMember | null, isDemo: boolean): boolean {
  return member !== null || (!isDemo && delivery.isDownloadAllowed === true);
}

/** Members from editor up; guests when the link allows approvals, and never in the demo room. */
function mayApprove(link: ShareLink, member: ClientRoomMember | null, isDemo: boolean): boolean {
  if (member) return hasMinRole(member.role, "editor");
  return !isDemo && link.canApprove;
}

/** The room as it is right after a successful unlock (the cookie is only readable next request). */
export function unlockedRoom(room: ClientRoom): ClientRoom {
  if (room.state !== "locked") return room;
  const { delivery, member, link } = room;
  return {
    ...room,
    state: "open",
    canView: true,
    canComment: member !== null || delivery.isCommentAllowed !== false,
    canDownload: mayDownload(delivery, member, room.isDemo),
    canApprove: mayApprove(link, member, room.isDemo),
  };
}

export function roomRefusal(room: ClientRoom | null): string {
  if (!room) return "This review link isn't valid.";
  switch (room.state) {
    case "locked":
      return "Enter the passcode to open this delivery.";
    case "expired":
      return "This review link has expired.";
    case "revoked":
      return "This review link was turned off. Ask the studio for a new one.";
    case "unavailable":
      return "This delivery is no longer available.";
    default:
      return "You don't have access to this delivery.";
  }
}

/**
 * The room, when the visitor may do `need` in it. Throws a message that's safe to show
 * otherwise. Members act with their workspace role: approving needs at least editor.
 * In the demo room, guests may only view.
 */
export async function requireClientRoom(shareToken: string, need: ClientRoomNeed = "view"): Promise<ClientRoom> {
  const room = await getClientRoom(shareToken);
  if (!room || !room.canView) throw new Error(roomRefusal(room));
  if (room.isDemo && !room.member && need !== "view") throw new Error(DEMO_ROOM_REFUSAL);
  if (room.suspended && (need === "comment" || need === "approve")) {
    throw new Error("This delivery can't be changed while the studio's workspace is suspended.");
  }
  if (need === "comment" && !room.canComment) throw new Error("Comments are turned off for this delivery.");
  if (need === "download" && !room.canDownload) throw new Error("Downloads are turned off for this delivery.");
  if (need === "approve" && room.member && !hasMinRole(room.member.role, "editor")) {
    throw new Error("Viewers can't change approvals.");
  }
  if (need === "approve" && !room.member && !room.canApprove) {
    throw new Error("Approvals are turned off for this link.");
  }
  return room;
}

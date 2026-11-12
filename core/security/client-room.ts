import { cookies } from "next/headers";
import { getServerAdminServices, getServerServices } from "@/core/server";
import type { Delivery } from "@/core/entities/delivery";
import { hasRoomAccess } from "@/lib/security/delivery-token";
import { hasMinRole, type WorkspaceRoleLevel } from "./guards";

/**
 * The one gate for client rooms (/deliver/<share token>).
 *
 * Everything a client-room visitor can reach goes through `getClientRoom` or
 * `requireClientRoom`: the page, every room action and media download. The share token
 * is the only way in. A delivery's id never opens its room, so rotating the share link
 * cuts off everyone who had the old one.
 *
 * A guest gets in when the room is open: not archived, not expired, and either without
 * a passcode or with a valid unlock cookie (bound to the current link and passcode).
 * A signed-in member of the studio's workspace can preview any state of their own room
 * except a locked one; they unlock it with one click (the server checks membership).
 *
 * After the gate, room data is read with the service role, so callers must only touch
 * rows that belong to `room.delivery` (see lib/client-room/scope.ts).
 */

export type ClientRoomState = "open" | "locked" | "expired" | "unavailable";
export type ClientRoomNeed = "view" | "comment" | "approve" | "download";

export interface ClientRoomMember {
  userId: string;
  email: string | null;
  role: WorkspaceRoleLevel;
}

export type AdminServices = Awaited<ReturnType<typeof getServerAdminServices>>;

export interface ClientRoom {
  /** Server-side only: holds the passcode hash and share token. Never send it to the browser. */
  delivery: Delivery;
  state: ClientRoomState;
  /** Set when the visitor is a signed-in member of the delivery's workspace. */
  member: ClientRoomMember | null;
  /** Service-role services, for reading and writing this room's rows after the gate. */
  services: AdminServices;
  canView: boolean;
  canComment: boolean;
  canDownload: boolean;
}

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

/** Looks up a room by its share token. Returns null when the token matches no delivery. */
export async function getClientRoom(shareToken: string): Promise<ClientRoom | null> {
  if (!isWellFormedShareToken(shareToken)) return null;
  const token = shareToken.trim();

  const services = await getServerAdminServices();
  const delivery = await services.delivery.getDeliveryByShareToken(token, { allowExpired: true });
  if (!delivery || delivery.shareToken !== token) return null;

  const [member, cookieStore] = await Promise.all([findWorkspaceMember(delivery.workspaceId), cookies()]);
  const state = roomState(delivery, hasRoomAccess(cookieStore, delivery));

  const canView = state === "open" || (member !== null && state !== "locked");
  return {
    delivery,
    state,
    member,
    services,
    canView,
    canComment: canView && (member !== null || delivery.isCommentAllowed !== false),
    canDownload: canView && (member !== null || delivery.isDownloadAllowed === true),
  };
}

/** The room as it is right after a successful unlock (the cookie is only readable next request). */
export function unlockedRoom(room: ClientRoom): ClientRoom {
  if (room.state !== "locked") return room;
  const { delivery, member } = room;
  return {
    ...room,
    state: "open",
    canView: true,
    canComment: member !== null || delivery.isCommentAllowed !== false,
    canDownload: member !== null || delivery.isDownloadAllowed === true,
  };
}

export function roomRefusal(room: ClientRoom | null): string {
  if (!room) return "This review link isn't valid.";
  switch (room.state) {
    case "locked":
      return "Enter the passcode to open this delivery.";
    case "expired":
      return "This review link has expired.";
    case "unavailable":
      return "This delivery is no longer available.";
    default:
      return "You don't have access to this delivery.";
  }
}

/**
 * The room, when the visitor may do `need` in it. Throws a message that's safe to show
 * otherwise. Members act with their workspace role: approving needs at least editor.
 */
export async function requireClientRoom(shareToken: string, need: ClientRoomNeed = "view"): Promise<ClientRoom> {
  const room = await getClientRoom(shareToken);
  if (!room || !room.canView) throw new Error(roomRefusal(room));
  if (need === "comment" && !room.canComment) throw new Error("Comments are turned off for this delivery.");
  if (need === "download" && !room.canDownload) throw new Error("Downloads are turned off for this delivery.");
  if (need === "approve" && room.member && !hasMinRole(room.member.role, "editor")) {
    throw new Error("Viewers can't change approvals.");
  }
  return room;
}
